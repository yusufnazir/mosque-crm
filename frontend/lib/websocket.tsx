'use client';

import React, { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';

/**
 * WebSocket provider that connects a STOMP client to the backend
 * and dispatches DOM events when real-time messages arrive.
 *
 * Events dispatched:
 *  - 'inbox:new-message'  CustomEvent with { message, unreadCount } detail
 *  - 'inbox:read'         Generic event to trigger badge re-fetch in Header/Sidebar
 */

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    let mounted = true;
    let client: Client | null = null;

    async function connect() {
      try {
        const res = await fetch('/api/ws/token');
        if (!res.ok) {
          console.warn('[WS] Could not fetch token:', res.status);
          return;
        }
        const { token, wsUrl } = await res.json();
        if (!mounted) return;

        console.log('[WS] Connecting to', wsUrl);

        client = new Client({
          brokerURL: wsUrl,
          connectHeaders: {
            Authorization: `Bearer ${token}`,
          },
          reconnectDelay: 5000,
          heartbeatIncoming: 10000,
          heartbeatOutgoing: 10000,
          debug: (msg) => {
            // Only log non-heartbeat frames for debugging
            if (!msg.startsWith('>>>') && !msg.startsWith('<<<')) return;
            if (msg.includes('heart-beat')) return;
            console.log('[WS]', msg);
          },
          onConnect: () => {
            console.log('[WS] Connected');
            // Subscribe to personal message notifications
            client?.subscribe('/user/topic/messages', (frame) => {
              try {
                const payload = JSON.parse(frame.body);
                console.log('[WS] New message notification:', payload);
                // Dispatch detailed event for inbox page
                window.dispatchEvent(
                  new CustomEvent('inbox:new-message', { detail: payload })
                );
                // Trigger badge refresh in Header and Sidebar
                window.dispatchEvent(new Event('inbox:read'));
              } catch {
                // ignore parse errors
              }
            });
          },
          onStompError: (frame) => {
            console.warn('[WS] STOMP error:', frame.headers?.message);
          },
          onWebSocketError: (event) => {
            console.warn('[WS] WebSocket error:', event);
          },
          onDisconnect: () => {
            console.log('[WS] Disconnected');
          },
        });

        client.activate();
        clientRef.current = client;
      } catch (err) {
        console.warn('[WS] Connection failed:', err);
      }
    }

    connect();

    return () => {
      mounted = false;
      client?.deactivate();
      clientRef.current = null;
    };
  }, []);

  return <>{children}</>;
}

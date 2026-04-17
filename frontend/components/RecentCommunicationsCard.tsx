'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { communicationApi, CommunicationMessageDTO } from '@/lib/communicationApi';
import { useTranslation } from '@/lib/i18n/LanguageContext';

export default function RecentCommunicationsCard() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<CommunicationMessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    communicationApi
      .getRecentMessages()
      .then(setMessages)
      .catch(() => setError('Failed to load recent communications'))
      .finally(() => setLoading(false));
  }, []);

  const statusColor = (status?: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-emerald-100 text-emerald-700';
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">{t('communications.recent_title')}</CardTitle>
        <Link
          href="/communications"
          className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
        >
          {t('communications.view_all')}
        </Link>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        )}
        {!loading && error && (
          <p className="text-sm text-gray-500">{error}</p>
        )}
        {!loading && !error && messages.length === 0 && (
          <p className="text-sm text-gray-500">{t('communications.no_recent')}</p>
        )}
        {!loading && !error && messages.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {messages.map((msg) => (
              <li key={msg.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-charcoal truncate">{msg.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDate(msg.sentAt || msg.createdAt)}
                    {msg.totalRecipients !== undefined && (
                      <> &middot; {msg.totalRecipients} {t('communications.recipients')}</>
                    )}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(msg.status)}`}
                >
                  {msg.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

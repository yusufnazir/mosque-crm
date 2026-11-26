'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import ToastNotification from '@/components/ToastNotification';
import { parseApiErrorBody } from '@/lib/api';
import {
  whatsappApi,
  type WahaAvailableSession,
  type WhatsAppChannelDTO,
  type WhatsAppChannelRequest,
} from '@/lib/whatsappApi';

/**
 * Settings → WhatsApp → Numbers.
 *
 * Every row is one linked WhatsApp account (one WAHA session). The list is the only place a
 * number is configured: adding or editing a row changes which number sends, without a deploy.
 * A session can only be chosen from what WAHA reports right now, so a typo cannot produce a
 * channel that silently never sends.
 */
interface Props {
  /** Notified after any change, so the parent can refresh its own status view. */
  onChanged?: () => void;
}

interface EditorState {
  id: number | null;
  label: string;
  purpose: string;
  wahaSession: string;
  enabled: boolean;
  isDefault: boolean;
  webhookToken: string;
  webhookUrl: string;
  webhookEvents: string;
}

const EMPTY_EDITOR: EditorState = {
  id: null,
  label: '',
  purpose: '',
  wahaSession: '',
  enabled: true,
  isDefault: false,
  webhookToken: '',
  webhookUrl: '',
  webhookEvents: '',
};

const STATUS_KEYS: Record<string, string> = {
  WORKING: 'settings.waha_channel_status_working',
  SCAN_QR_CODE: 'settings.waha_channel_status_qr',
  STARTING: 'settings.waha_channel_status_starting',
  STOPPED: 'settings.waha_channel_status_stopped',
  FAILED: 'settings.waha_channel_status_failed',
  UNREACHABLE: 'settings.waha_channel_status_unreachable',
  NOT_CONFIGURED: 'settings.waha_channel_status_missing',
};

const STATUS_STYLES: Record<string, string> = {
  WORKING: 'bg-emerald-100 text-emerald-800',
  SCAN_QR_CODE: 'bg-amber-100 text-amber-800',
  STARTING: 'bg-amber-100 text-amber-800',
};

function errorMessage(error: unknown, fallback: string): string {
  const parsed = parseApiErrorBody(error);
  if (parsed?.error) return parsed.error;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function WhatsAppChannelManager({ onChanged }: Props) {
  const { t } = useTranslation();

  const [channels, setChannels] = useState<WhatsAppChannelDTO[]>([]);
  const [sessions, setSessions] = useState<WahaAvailableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [testTarget, setTestTarget] = useState<WhatsAppChannelDTO | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppChannelDTO | null>(null);
  const [webhookPreview, setWebhookPreview] = useState<{ id: number; json: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadChannels = useCallback(async () => {
    setLoading(true);
    try {
      setChannels(await whatsappApi.channels());
    } catch (error) {
      setToast({ message: errorMessage(error, t('settings.waha_channels_load_error')), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await whatsappApi.availableSessions());
    } catch (error) {
      setSessions([]);
      setToast({ message: errorMessage(error, t('settings.waha_sessions_load_error')), type: 'error' });
    }
  }, [t]);

  useEffect(() => {
    loadChannels();
    loadSessions();
  }, [loadChannels, loadSessions]);

  const usedSessions = useMemo(
    () => new Set(channels.filter((channel) => channel.id !== editor?.id).map((channel) => channel.wahaSession)),
    [channels, editor?.id],
  );

  /** Sessions WAHA reports that no other channel already uses. */
  const selectableSessions = useMemo(
    () => sessions.filter((session) => !usedSessions.has(session.name) || session.name === editor?.wahaSession),
    [sessions, usedSessions, editor?.wahaSession],
  );

  const startCreate = () => {
    setWebhookPreview(null);
    setEditor({ ...EMPTY_EDITOR });
    loadSessions();
  };

  const startEdit = (channel: WhatsAppChannelDTO) => {
    setWebhookPreview(null);
    setEditor({
      id: channel.id,
      label: channel.label ?? '',
      purpose: channel.purpose ?? '',
      wahaSession: channel.wahaSession,
      enabled: channel.enabled,
      isDefault: channel.isDefault,
      webhookToken: channel.webhookToken ?? '',
      webhookUrl: channel.webhookUrl ?? '',
      webhookEvents: channel.webhookEvents ?? '',
    });
    loadSessions();
  };

  const submit = async () => {
    if (!editor || saving) return;
    if (!editor.wahaSession) {
      setToast({ message: t('settings.waha_session_required'), type: 'error' });
      return;
    }
    const request: WhatsAppChannelRequest = {
      label: editor.label.trim() || editor.wahaSession,
      purpose: editor.purpose.trim() || null,
      wahaSession: editor.wahaSession,
      enabled: editor.enabled,
      isDefault: editor.isDefault,
      // An empty field means "no own token": the channel then uses the global secret.
      webhookToken: editor.webhookToken.trim(),
      webhookUrl: editor.webhookUrl.trim() || null,
      webhookEvents: editor.webhookEvents.trim() || null,
    };
    setSaving(true);
    try {
      if (editor.id == null) {
        await whatsappApi.createChannel(request);
        setToast({ message: t('settings.waha_channel_created'), type: 'success' });
      } else {
        await whatsappApi.updateChannel(editor.id, request);
        setToast({ message: t('settings.waha_channel_saved'), type: 'success' });
      }
      setEditor(null);
      setWebhookPreview(null);
      await loadChannels();
      onChanged?.();
    } catch (error) {
      setToast({ message: errorMessage(error, t('settings.waha_channel_save_error')), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (channel: WhatsAppChannelDTO) => {
    try {
      await whatsappApi.updateChannel(channel.id, {
        wahaSession: channel.wahaSession,
        label: channel.label,
        enabled: !channel.enabled,
      });
      await loadChannels();
      onChanged?.();
    } catch (error) {
      setToast({ message: errorMessage(error, t('settings.waha_channel_save_error')), type: 'error' });
    }
  };

  const makeDefault = async (channel: WhatsAppChannelDTO) => {
    try {
      await whatsappApi.setDefaultChannel(channel.id);
      await loadChannels();
      onChanged?.();
      setToast({ message: t('settings.waha_channel_default_set'), type: 'success' });
    } catch (error) {
      setToast({ message: errorMessage(error, t('settings.waha_channel_save_error')), type: 'error' });
    }
  };

  const rotateToken = async (channel: WhatsAppChannelDTO) => {
    try {
      const updated = await whatsappApi.rotateChannelToken(channel.id);
      await loadChannels();
      setEditor((current) => (current && current.id === channel.id
        ? { ...current, webhookToken: updated.webhookToken ?? '' }
        : current));
      setWebhookPreview(null);
      setToast({ message: t('settings.waha_channel_token_rotated'), type: 'success' });
    } catch (error) {
      setToast({ message: errorMessage(error, t('settings.waha_channel_save_error')), type: 'error' });
    }
  };

  const showWebhookConfig = async (channel: WhatsAppChannelDTO) => {
    try {
      const config = await whatsappApi.channelWebhookConfig(channel.id);
      setWebhookPreview({ id: channel.id, json: JSON.stringify(config, null, 2) });
    } catch (error) {
      setToast({ message: errorMessage(error, t('settings.waha_webhook_config_error')), type: 'error' });
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast({ message: t('settings.waha_copied'), type: 'success' });
    } catch {
      setToast({ message: t('settings.waha_copy_failed'), type: 'error' });
    }
  };

  const sendTest = async () => {
    if (!testTarget || !testPhone.trim() || testing) return;
    setTesting(true);
    try {
      await whatsappApi.testChannel(testTarget.id, testPhone.trim());
      setToast({ message: t('settings.waha_test_sent', { label: testTarget.label }), type: 'success' });
      setTestTarget(null);
      setTestPhone('');
    } catch (error) {
      setToast({ message: errorMessage(error, t('settings.waha_test_send_error')), type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await whatsappApi.deleteChannel(deleteTarget.id);
      setToast({ message: t('settings.waha_channel_deleted'), type: 'success' });
      setDeleteTarget(null);
      await loadChannels();
      onChanged?.();
    } catch (error) {
      setToast({ message: errorMessage(error, t('settings.waha_channel_delete_error')), type: 'error' });
    }
  };

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-charcoal">{t('settings.waha_channels_title')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('settings.waha_channels_description')}</p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg border border-emerald-700 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          {t('settings.waha_channel_add')}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
        {loading ? (
          <p className="py-6 text-center text-sm text-gray-400">{t('common.loading')}</p>
        ) : channels.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">{t('settings.waha_channels_empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">{t('settings.waha_col_label')}</th>
                <th className="px-3 py-2 font-medium">{t('settings.waha_col_number')}</th>
                <th className="px-3 py-2 font-medium">{t('settings.waha_col_session')}</th>
                <th className="px-3 py-2 font-medium">{t('settings.waha_col_status')}</th>
                <th className="px-3 py-2 font-medium">{t('settings.waha_col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {channels.map((channel) => (
                <tr key={channel.id} className="align-top">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{channel.label}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {channel.isDefault && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-800">
                          {t('settings.waha_channel_default')}
                        </span>
                      )}
                      {!channel.enabled && (
                        <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-700">
                          {t('settings.waha_channel_disabled')}
                        </span>
                      )}
                      {channel.webhookTokenSet ? (
                        <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sky-800">
                          {t('settings.waha_channel_own_token')}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-600">
                          {t('settings.waha_channel_global_token')}
                        </span>
                      )}
                    </div>
                    {channel.purpose && <p className="mt-1 text-xs text-gray-500">{channel.purpose}</p>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">
                    {channel.meId || channel.displayNumber || '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700">{channel.wahaSession}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[channel.status ?? ''] ?? 'bg-red-100 text-red-800'
                      }`}
                    >
                      {t(STATUS_KEYS[channel.status ?? ''] ?? 'settings.waha_channel_status_unknown')}
                    </span>
                    <label className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={channel.enabled}
                        onChange={() => toggleEnabled(channel)}
                      />
                      {t('settings.waha_channel_enabled')}
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEdit(channel)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTestPhone('');
                          setTestTarget(channel);
                        }}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {t('settings.waha_channel_test')}
                      </button>
                      <button
                        type="button"
                        onClick={() => showWebhookConfig(channel)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        {t('settings.waha_channel_webhook')}
                      </button>
                      {!channel.isDefault && (
                        <button
                          type="button"
                          onClick={() => makeDefault(channel)}
                          className="rounded-md border border-emerald-300 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50"
                        >
                          {t('settings.waha_channel_make_default')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(channel)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {webhookPreview && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              {t('settings.waha_webhook_config_title')}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copy(webhookPreview.json)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                {t('settings.waha_copy')}
              </button>
              <button
                type="button"
                onClick={() => setWebhookPreview(null)}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                {t('settings.waha_close')}
              </button>
            </div>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-gray-700">
            {webhookPreview.json}
          </pre>
          <p className="mt-2 text-xs text-gray-500">{t('settings.waha_webhook_config_hint')}</p>
        </div>
      )}

      {testTarget && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-sm font-medium text-charcoal">
            {t('settings.waha_test_send_title', { label: testTarget.label })}
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={testPhone}
              onChange={(event) => setTestPhone(event.target.value)}
              placeholder={t('whatsapp.phone_placeholder')}
              className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={sendTest}
              disabled={testing || !testPhone.trim()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {testing ? t('settings.waha_sending') : t('settings.waha_send')}
            </button>
            <button
              type="button"
              onClick={() => setTestTarget(null)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {t('common.cancel')}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">{t('settings.waha_test_send_hint')}</p>
        </div>
      )}

      {editor && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
          <h4 className="mb-3 text-sm font-semibold text-charcoal">
            {editor.id == null ? t('settings.waha_channel_new') : t('settings.waha_channel_edit')}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('settings.waha_col_label')}
              </label>
              <input
                value={editor.label}
                onChange={(event) => setEditor({ ...editor, label: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('settings.waha_channel_label_placeholder')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('settings.waha_channel_purpose')}
              </label>
              <input
                value={editor.purpose}
                onChange={(event) => setEditor({ ...editor, purpose: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('settings.waha_channel_purpose_placeholder')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('settings.waha_col_session')}
              </label>
              <div className="flex gap-2">
                <select
                  value={editor.wahaSession}
                  onChange={(event) => setEditor({ ...editor, wahaSession: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">{t('settings.waha_channel_pick_session')}</option>
                  {selectableSessions.map((session) => (
                    <option key={session.name} value={session.name}>
                      {session.name} · {session.meId || t('settings.waha_channel_no_number')}
                      {' · '}
                      {t(STATUS_KEYS[session.status] ?? 'settings.waha_channel_status_unknown')}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadSessions}
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                >
                  {t('settings.waha_refresh')}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">{t('settings.waha_channel_session_hint')}</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editor.enabled}
                  onChange={(event) => setEditor({ ...editor, enabled: event.target.checked })}
                />
                {t('settings.waha_channel_enabled')}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editor.isDefault}
                  onChange={(event) => setEditor({ ...editor, isDefault: event.target.checked })}
                />
                {t('settings.waha_channel_is_default')}
              </label>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('settings.waha_channel_webhook_url')}
              </label>
              <input
                value={editor.webhookUrl}
                onChange={(event) => setEditor({ ...editor, webhookUrl: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('settings.waha_channel_webhook_url_placeholder')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('settings.waha_channel_webhook_events')}
              </label>
              <input
                value={editor.webhookEvents}
                onChange={(event) => setEditor({ ...editor, webhookEvents: event.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('settings.waha_channel_webhook_events_placeholder')}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                {t('settings.waha_channel_webhook_token')}
              </label>
              <div className="flex gap-2">
                <input
                  value={editor.webhookToken}
                  onChange={(event) => setEditor({ ...editor, webhookToken: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
                  placeholder={t('settings.waha_channel_webhook_token_placeholder')}
                />
                {editor.id != null && (
                  <button
                    type="button"
                    onClick={() => {
                      const channel = channels.find((item) => item.id === editor.id);
                      if (channel) rotateToken(channel);
                    }}
                    className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                  >
                    {t('settings.waha_regenerate')}
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">{t('settings.waha_channel_webhook_token_hint')}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditor(null);
                setWebhookPreview(null);
              }}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {t('common.cancel')}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">{t('settings.waha_channel_apply_hint')}</p>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('settings.waha_channel_delete_title')}
        message={t('settings.waha_channel_delete_message', { label: deleteTarget?.label ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

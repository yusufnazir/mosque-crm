'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  messageTemplatesApi,
  MessageTemplate,
  MessageTemplatePreview,
  MessageTemplateTestResult,
} from '@/lib/messageTemplatesApi';
import ConfirmDialog from './ConfirmDialog';
import ToastNotification from './ToastNotification';

type TemplateLanguage = 'en' | 'nl';
type EditorMode = 'edit' | 'preview';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
}

const slugifyKey = (key: string) => key.replace(/\./g, '_');

const formatUpdatedAt = (value?: string | null) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

/**
 * Settings → Message templates.
 *
 * Lets a tenant edit the transactional messages (currently the membership approve/reject
 * mails), pick the delivery channel (email or WhatsApp), insert placeholders and preview the
 * result. Only the approve/reject templates exist for now; the backend catalogue drives the list.
 */
export default function MessageTemplatesEditor() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const canManage = can('message_template.manage');

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [language, setLanguage] = useState<TemplateLanguage>('en');

  const [channel, setChannel] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachTerms, setAttachTerms] = useState(false);
  const [active, setActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [mode, setMode] = useState<EditorMode>('edit');
  const [preview, setPreview] = useState<MessageTemplatePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [testOpen, setTestOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<MessageTemplateTestResult | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [suggestionStart, setSuggestionStart] = useState<number | null>(null);

  const current = useMemo(
    () => templates.find((item) => item.key === selectedKey && item.language === language),
    [templates, selectedKey, language]
  );

  const definition = useMemo(
    () => templates.find((item) => item.key === selectedKey),
    [templates, selectedKey]
  );

  const placeholders = useMemo(() => definition?.placeholders ?? [], [definition]);

  const filteredPlaceholders = useMemo(() => {
    if (!suggestionQuery) return placeholders;
    const query = suggestionQuery.toLowerCase();
    return placeholders.filter((item) => item.code.toLowerCase().includes(query));
  }, [placeholders, suggestionQuery]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await messageTemplatesApi.list();
      setTemplates(data);
      if (!selectedKey && data.length > 0) {
        setSelectedKey(data[0].key);
      }
    } catch (error) {
      setToast({
        message: `${t('message_templates.load_error')}: ${error instanceof Error ? error.message : ''}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedKey, t]);

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seed the editor fields from the selected template/language.
  useEffect(() => {
    if (!current) return;
    setChannel(current.channel);
    setSubject(current.subject ?? '');
    setBody(current.body ?? '');
    setAttachTerms(current.attachTerms);
    setActive(current.active);
    setSuggestionsOpen(false);
    setPreview(null);
    setMode('edit');
    setTestResult(null);
  }, [current]);

  const localizedName = (template: MessageTemplate) => {
    const key = `message_templates.templates.${slugifyKey(template.key)}.name`;
    const value = t(key);
    return value === key ? template.name : value;
  };

  const localizedDescription = (template: MessageTemplate) => {
    const key = `message_templates.templates.${slugifyKey(template.key)}.description`;
    const value = t(key);
    return value === key ? template.description : value;
  };

  const detectSuggestions = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const match = /\{\{([a-zA-Z0-9_.]*)$/.exec(before);
    if (!match) {
      setSuggestionsOpen(false);
      return;
    }
    setSuggestionStart(caret - match[0].length);
    setSuggestionQuery(match[1]);
    setSuggestionIndex(0);
    setSuggestionsOpen(true);
  };

  const insertPlaceholder = (code: string) => {
    const el = textareaRef.current;
    const token = `{{${code}}}`;
    const caret = el && suggestionStart !== null ? el.selectionStart : body.length;
    const start = suggestionStart !== null ? suggestionStart : caret;
    const before = body.slice(0, start);
    const after = body.slice(caret);
    const next = `${before}${token}${after}`;
    setBody(next);
    setSuggestionsOpen(false);
    setSuggestionStart(null);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const position = before.length + token.length;
      el.setSelectionRange(position, position);
    });
  };

  const insertPlaceholderAtCursor = (code: string) => {
    const el = textareaRef.current;
    const token = `{{${code}}}`;
    if (!el) {
      setBody((prev) => `${prev}${token}`);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${body.slice(0, start)}${token}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const position = start + token.length;
      el.setSelectionRange(position, position);
    });
  };

  const handleBodyKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.ctrlKey && (event.key === ' ' || event.code === 'Space')) {
      event.preventDefault();
      setSuggestionStart(null);
      setSuggestionQuery('');
      setSuggestionIndex(0);
      setSuggestionsOpen(true);
      return;
    }
    if (!suggestionsOpen || filteredPlaceholders.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSuggestionIndex((prev) => (prev + 1) % filteredPlaceholders.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSuggestionIndex((prev) => (prev - 1 + filteredPlaceholders.length) % filteredPlaceholders.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      insertPlaceholder(filteredPlaceholders[suggestionIndex].code);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setSuggestionsOpen(false);
    }
  };

  const handleSave = async () => {
    if (!current || !canManage) return;
    setSaving(true);
    try {
      const saved = await messageTemplatesApi.update(current.key, language, {
        channel,
        subject: channel === 'EMAIL' ? subject : undefined,
        body,
        attachTerms,
        active,
      });
      setTemplates((prev) =>
        prev.map((item) =>
          item.key === saved.key && item.language === saved.language ? saved : item
        )
      );
      setToast({ message: t('message_templates.save_success'), type: 'success' });
    } catch (error) {
      setToast({
        message: `${t('message_templates.save_error')}: ${error instanceof Error ? error.message : ''}`,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!current || !canManage) return;
    setResetting(true);
    try {
      const reset = await messageTemplatesApi.reset(current.key, language);
      setTemplates((prev) =>
        prev.map((item) =>
          item.key === reset.key && item.language === reset.language ? reset : item
        )
      );
      setConfirmResetOpen(false);
      setToast({ message: t('message_templates.reset_success'), type: 'success' });
    } catch (error) {
      setToast({
        message: `${t('message_templates.reset_error')}: ${error instanceof Error ? error.message : ''}`,
        type: 'error',
      });
    } finally {
      setResetting(false);
    }
  };

  const openPreview = async () => {
    if (!current) return;
    setMode('preview');
    setPreviewLoading(true);
    try {
      const result = await messageTemplatesApi.preview(current.key, {
        language,
        channel,
        subject: channel === 'EMAIL' ? subject : undefined,
        body,
        attachTerms,
      });
      setPreview(result);
    } catch (error) {
      setToast({
        message: `${t('message_templates.preview_error')}: ${error instanceof Error ? error.message : ''}`,
        type: 'error',
      });
      setMode('edit');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!current || !canManage) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const result = await messageTemplatesApi.sendTest(current.key, {
        language,
        channel,
        subject: channel === 'EMAIL' ? subject : undefined,
        body,
        attachTerms,
        toEmail: channel === 'EMAIL' ? testRecipient.trim() : undefined,
        toPhone: channel === 'WHATSAPP' ? testRecipient.trim() : undefined,
      });
      setTestResult(result);
    } catch (error) {
      setTestResult({
        channel,
        status: 'FAILED',
        delivered: false,
        message: `${t('message_templates.test_error')}: ${error instanceof Error ? error.message : ''}`,
      });
    } finally {
      setTestSending(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">{t('message_templates.loading')}</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        {t('message_templates.empty')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-charcoal">{t('message_templates.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('message_templates.description')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* Template list */}
        <div className="space-y-2">
          {templates
            .filter((item) => item.language === language)
            .map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSelectedKey(item.key)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  item.key === selectedKey
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-charcoal">{localizedName(item)}</span>
                  {item.customized && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      {t('message_templates.customized')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">{localizedDescription(item)}</p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  {item.channel === 'WHATSAPP'
                    ? t('message_templates.channel_whatsapp')
                    : t('message_templates.channel_email')}
                  {!item.active && ` · ${t('message_templates.inactive')}`}
                </p>
              </button>
            ))}
        </div>

        {/* Editor */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
              {(['en', 'nl'] as TemplateLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    language === lang
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {lang === 'en'
                    ? t('message_templates.language_english')
                    : t('message_templates.language_dutch')}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span>{t('message_templates.active_label')}</span>
              <button
                type="button"
                onClick={() => setActive((prev) => !prev)}
                disabled={!canManage}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  active ? 'bg-emerald-600' : 'bg-gray-300'
                } ${canManage ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('message_templates.channel')}
            </label>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setChannel('EMAIL')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  channel === 'EMAIL' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('message_templates.channel_email')}
              </button>
              <button
                type="button"
                onClick={() => setChannel('WHATSAPP')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  channel === 'WHATSAPP' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {t('message_templates.channel_whatsapp')}
              </button>
            </div>
          </div>

          {channel === 'EMAIL' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('message_templates.subject')}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                disabled={!canManage}
                placeholder={t('message_templates.subject_placeholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          )}

          <div className="mb-4">
            <div className="flex items-center justify-between gap-4 mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('message_templates.body')}
              </label>
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    mode === 'edit' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t('message_templates.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => void openPreview()}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    mode === 'preview' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t('message_templates.preview')}
                </button>
              </div>
            </div>

            {mode === 'edit' ? (
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(event) => {
                    setBody(event.target.value);
                    detectSuggestions(event.target.value, event.target.selectionStart);
                  }}
                  onClick={(event) =>
                    detectSuggestions(event.currentTarget.value, event.currentTarget.selectionStart)
                  }
                  onBlur={() => {
                    setTimeout(() => setSuggestionsOpen(false), 120);
                  }}
                  onKeyDown={handleBodyKeyDown}
                  rows={12}
                  disabled={!canManage}
                  placeholder={t('message_templates.body_placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono text-sm"
                />
                {suggestionsOpen && filteredPlaceholders.length > 0 && (
                  <div className="absolute left-3 top-full z-20 mt-1 max-h-56 w-72 overflow-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                    {filteredPlaceholders.map((item, index) => (
                      <button
                        key={item.code}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          insertPlaceholder(item.code);
                        }}
                        className={`block w-full px-3 py-2 text-left text-xs ${
                          index === suggestionIndex ? 'bg-emerald-50 text-emerald-800' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-mono">{`{{${item.code}}}`}</span>
                        <span className="ml-2 text-gray-400">{item.sample}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="min-h-[304px]">
                {previewLoading ? (
                  <div className="text-sm text-gray-500">{t('message_templates.preview_loading')}</div>
                ) : preview ? (
                  preview.channel === 'EMAIL' && preview.html ? (
                    <iframe
                      title={t('message_templates.preview')}
                      srcDoc={preview.html}
                      sandbox=""
                      className="h-[420px] w-full rounded-lg border border-gray-300 bg-white"
                    />
                  ) : (
                    <div className="rounded-lg bg-[#e7ffdb] p-4 text-sm text-gray-800 whitespace-pre-wrap border border-emerald-200">
                      {preview.body}
                    </div>
                  )
                ) : (
                  <div className="text-sm text-gray-500">{t('message_templates.preview_hint')}</div>
                )}
              </div>
            )}

            <p className="mt-2 text-xs text-gray-500">{t('message_templates.placeholder_hint')}</p>
          </div>

          {/* Placeholder chips */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t('message_templates.placeholders')}
            </p>
            <div className="flex flex-wrap gap-2">
              {placeholders.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => insertPlaceholderAtCursor(item.code)}
                  disabled={!canManage}
                  title={item.sample}
                  className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-mono text-gray-700 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-60"
                >
                  {`{{${item.code}}}`}
                </button>
              ))}
            </div>
          </div>

          {current?.supportsTermsAttachment && (
            <div className="mb-5 flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div>
                <p className="text-sm font-medium text-charcoal">{t('message_templates.attach_terms')}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {channel === 'EMAIL'
                    ? t('message_templates.attach_terms_hint')
                    : t('message_templates.attach_terms_whatsapp_hint')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAttachTerms((prev) => !prev)}
                disabled={!canManage}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  attachTerms ? 'bg-emerald-600' : 'bg-gray-300'
                } ${canManage ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    attachTerms ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {testOpen && (
            <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <p className="text-sm font-medium text-charcoal">{t('message_templates.test_title')}</p>
              <p className="mt-0.5 text-xs text-gray-600">{t('message_templates.test_hint')}</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  type={channel === 'EMAIL' ? 'email' : 'tel'}
                  value={testRecipient}
                  onChange={(event) => setTestRecipient(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleSendTest();
                  }}
                  disabled={testSending || !canManage}
                  placeholder={
                    channel === 'EMAIL'
                      ? t('message_templates.test_email_placeholder')
                      : t('message_templates.test_phone_placeholder')
                  }
                  className="w-full flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => void handleSendTest()}
                  disabled={testSending || !canManage || testRecipient.trim() === ''}
                  className="whitespace-nowrap rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {testSending ? t('message_templates.test_sending') : t('message_templates.test_send')}
                </button>
              </div>
              {testResult && (
                <p
                  className={`mt-3 rounded-lg px-3 py-2 text-xs ${
                    testResult.delivered
                      ? 'bg-emerald-100 text-emerald-800'
                      : testResult.status === 'FAILED'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {testResult.message}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <div className="text-xs text-gray-500">
              {current?.customized
                ? t('message_templates.customized_hint', {
                    date: formatUpdatedAt(current.updatedAt),
                  })
                : t('message_templates.default_hint')}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTestOpen((prev) => !prev);
                  setTestResult(null);
                }}
                disabled={!canManage}
                className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('message_templates.test_action')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                disabled={!canManage || resetting || !current?.customized}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('message_templates.reset')}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!canManage || saving}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? t('message_templates.saving') : t('message_templates.save')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        title={t('message_templates.reset_confirm_title')}
        message={t('message_templates.reset_confirm_message')}
        confirmLabel={t('message_templates.reset')}
        cancelLabel={t('common.cancel')}
        variant="warning"
        confirmDisabled={resetting}
        onConfirm={() => void handleReset()}
        onCancel={() => setConfirmResetOpen(false)}
      />

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

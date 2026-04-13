'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import TermsContentRenderer from '@/components/TermsContentRenderer';
import { useAppName } from '@/lib/AppNameContext';
import { organizationApi } from '@/lib/organizationApi';
import { membershipTermsApi, MembershipTermsVersionDTO } from '@/lib/membershipTermsApi';
import { buildTenantUrl } from '@/lib/auth/AuthContext';

interface TenantSettingField {
  id: number;
  fieldKey: string;
  label: string;
  category: string;
  tenantEditable: boolean;
  displayOrder: number;
  currentValue: string | null;
}

const HIDDEN_TENANT_SETTING_KEYS = new Set([
  'TERMS_ENABLED',
  'BANK_ACCOUNT_NAME',
  'BANK_ACCOUNT_1',
  'BANK_ACCOUNT_2',
]);

type TenantSettingsTab = 'profile' | 'registration' | 'terms' | 'settings';
type TermsEditorLanguage = 'en' | 'nl';
const HISTORY_PAGE_SIZE = 5;
const FALLBACK_TERMS_PLACEHOLDERS = [
  '{{organization.name}}',
  '{{organization.shortName}}',
  '{{organization.address}}',
  '{{organization.city}}',
  '{{organization.country}}',
  '{{organization.postalCode}}',
  '{{organization.phone}}',
  '{{organization.email}}',
  '{{organization.website}}',
  '{{config.APP_NAME}}',
];

export default function TenantSettingsPage() {
  const { t, language } = useTranslation();
  const { setAppName } = useAppName();
  const [fields, setFields] = useState<TenantSettingField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Org handle state
  const [orgHandle, setOrgHandle] = useState('');
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [handleChecking, setHandleChecking] = useState(false);
  const [handleSaving, setHandleSaving] = useState(false);
  const [handleMessage, setHandleMessage] = useState('');
  const [orgId, setOrgId] = useState<number | undefined>(undefined);
  const [copiedLink, setCopiedLink] = useState(false);
  const handleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [termsVersions, setTermsVersions] = useState<MembershipTermsVersionDTO[]>([]);
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsPublishing, setTermsPublishing] = useState(false);
  const [termsDraftSaving, setTermsDraftSaving] = useState(false);
  const [termsDraftLastSavedAtEn, setTermsDraftLastSavedAtEn] = useState<number | null>(null);
  const [termsDraftLastSavedAtNl, setTermsDraftLastSavedAtNl] = useState<number | null>(null);
  const [termsMessage, setTermsMessage] = useState('');
  const [termsTitleEn, setTermsTitleEn] = useState('');
  const [termsTitleNl, setTermsTitleNl] = useState('');
  const [termsContentEn, setTermsContentEn] = useState('');
  const [termsContentNl, setTermsContentNl] = useState('');
  const [termsEditorLanguage, setTermsEditorLanguage] = useState<TermsEditorLanguage>('en');
  const [termsEditorMode, setTermsEditorMode] = useState<'edit' | 'preview'>('edit');
  const termsTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [showPlaceholderSuggestions, setShowPlaceholderSuggestions] = useState(false);
  const [manualSuggestionMode, setManualSuggestionMode] = useState(false);
  const [placeholderQuery, setPlaceholderQuery] = useState('');
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [suggestionRange, setSuggestionRange] = useState<{ start: number; end: number } | null>(null);
  const [termsEnabled, setTermsEnabled] = useState(false);
  const [termsEnabledLoading, setTermsEnabledLoading] = useState(false);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(HISTORY_PAGE_SIZE);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);
  const [historyLocaleByVersion, setHistoryLocaleByVersion] = useState<Record<number, TermsEditorLanguage>>({});
  const [activeTab, setActiveTab] = useState<TenantSettingsTab>('settings');

  const getOrganizationHeaders = () => {
    if (typeof window === 'undefined') {
      return {} as Record<string, string>;
    }
    const selectedOrganizationId = localStorage.getItem('selectedOrganizationId');
    return selectedOrganizationId ? { 'X-Organization-Id': selectedOrganizationId } : {};
  };

  const checkHandleAvailability = (handle: string, excludeId?: number) => {
    if (handleDebounceRef.current) clearTimeout(handleDebounceRef.current);
    if (!handle.trim()) {
      setHandleAvailable(null);
      setHandleChecking(false);
      return;
    }
    if (!/^[a-z0-9-]+$/.test(handle.toLowerCase())) {
      setHandleAvailable(false);
      setHandleChecking(false);
      return;
    }
    setHandleChecking(true);
    setHandleAvailable(null);
    handleDebounceRef.current = setTimeout(async () => {
      try {
        const result = await organizationApi.checkHandle(handle, excludeId);
        setHandleAvailable(result.available);
      } catch {
        setHandleAvailable(null);
      } finally {
        setHandleChecking(false);
      }
    }, 400);
  };

  const saveHandle = async () => {
    setHandleSaving(true);
    setHandleMessage('');
    try {
      await organizationApi.updateMyHandle(orgHandle);
      setHandleMessage(t('organizations.handle_saved'));
      setHandleAvailable(null);
    } catch {
      setHandleMessage(t('organizations.handle_save_error'));
    } finally {
      setHandleSaving(false);
    }
  };

  useEffect(() => {
    fetchTenantSettings();
    fetchMyOrganization();
    fetchMembershipTerms();
    fetchTermsEnabled();
  }, []);

  const tabs: { key: TenantSettingsTab; label: string }[] = [
    { key: 'settings' as const, label: t('settings.title') },
    ...(orgId !== undefined ? [{ key: 'profile' as const, label: t('tenant_settings.org_profile') }] : []),
    ...(orgId !== undefined && orgHandle ? [{ key: 'registration' as const, label: t('tenant_settings.registration_link_title') }] : []),
    { key: 'terms' as const, label: t('tenant_settings.terms_title') },
  ];

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, tabs]);

  const getTermsDefaultContent = () => [
    t('tenant_settings.terms_default_intro'),
    '',
    t('tenant_settings.terms_default_body_1'),
    '',
    t('tenant_settings.terms_default_contact'),
  ].join('\n');

  const fetchMyOrganization = async () => {
    try {
      const org = await organizationApi.getMyOrganization();
      setOrgHandle(org.handle || '');
      setOrgId(org.id);
    } catch {
      // Not a tenant admin or no org — silently ignore
    }
  };

  const fetchTenantSettings = async () => {
    setTermsEnabledLoading(true);
    try {
      const response = await fetch('/api/tenant-settings', {
        headers: getOrganizationHeaders(),
      });
      if (response.ok) {
        const data: TenantSettingField[] = await response.json();
        const visibleFields = data.filter((field) => !HIDDEN_TENANT_SETTING_KEYS.has(field.fieldKey));
        setFields(visibleFields);
        const vals: Record<string, string> = {};
        for (const field of visibleFields) {
          vals[field.fieldKey] = field.currentValue || '';
        }
        vals.TERMS_ENABLED = data.find((field) => field.fieldKey === 'TERMS_ENABLED')?.currentValue || 'false';
        setValues(vals);
      }
    } catch (error) {
      console.error('Failed to fetch tenant settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTermsEnabled = async () => {
    setTermsEnabledLoading(true);
    try {
      const response = await fetch('/api/tenant-settings/terms-enabled', {
        headers: getOrganizationHeaders(),
      });
      if (response.ok) {
        const data: { enabled: boolean } = await response.json();
        setTermsEnabled(Boolean(data.enabled));
        setValues((prev) => ({ ...prev, TERMS_ENABLED: String(Boolean(data.enabled)) }));
      }
    } catch {
      // keep previous UI state on fetch failure
    } finally {
      setTermsEnabledLoading(false);
    }
  };

  const fetchMembershipTerms = async () => {
    setTermsLoading(true);
    try {
      const [data, draft] = await Promise.all([
        membershipTermsApi.getAll(),
        membershipTermsApi.getDraft().catch(() => null),
      ]);
      setTermsVersions(data);
      setVisibleHistoryCount(HISTORY_PAGE_SIZE);
      setExpandedHistoryId(data[0]?.id ?? null);

      setTermsDraftLastSavedAtEn(draft?.lastSavedAt ?? null);
      setTermsDraftLastSavedAtNl(draft?.lastSavedAtNl ?? null);

      const current = data.find((item) => item.active) ?? data[0];
      const draftTitle = draft?.title?.trim();
      const draftTitleNl = draft?.titleNl?.trim();
      const draftContentEn = draft?.content?.trim();
      const draftContentNl = draft?.contentNl?.trim();
      const hasDraft = Boolean(draftTitle || draftTitleNl || draftContentEn || draftContentNl);

      if (current) {
        setTermsTitleEn(hasDraft ? (draft?.title || current.title || '') : (current.title || ''));
        setTermsTitleNl(hasDraft ? (draft?.titleNl || current.titleNl || '') : (current.titleNl || ''));
        setTermsContentEn(hasDraft ? (draft?.content || current.content || '') : (current.content || ''));
        setTermsContentNl(hasDraft ? (draft?.contentNl || current.contentNl || '') : (current.contentNl || ''));
      } else {
        setTermsTitleEn(hasDraft ? (draft?.title || '') : t('tenant_settings.terms_default_title'));
        setTermsTitleNl(hasDraft ? (draft?.titleNl || '') : '');
        setTermsContentEn(hasDraft ? (draft?.content || '') : getTermsDefaultContent());
        setTermsContentNl(hasDraft ? (draft?.contentNl || '') : '');
      }
    } catch {
      setTermsVersions([]);
      setVisibleHistoryCount(HISTORY_PAGE_SIZE);
      setExpandedHistoryId(null);
      setTermsDraftLastSavedAtEn(null);
      setTermsDraftLastSavedAtNl(null);
      setTermsTitleEn(t('tenant_settings.terms_default_title'));
      setTermsTitleNl('');
      setTermsContentEn(getTermsDefaultContent());
      setTermsContentNl('');
    } finally {
      setTermsLoading(false);
    }
  };

  const activeTermsTitle = termsEditorLanguage === 'nl' ? termsTitleNl : termsTitleEn;

  const setActiveTermsTitle = (nextValue: string) => {
    if (termsEditorLanguage === 'nl') {
      setTermsTitleNl(nextValue);
      return;
    }
    setTermsTitleEn(nextValue);
  };

  const activeDraftLastSavedAt = termsEditorLanguage === 'nl' ? termsDraftLastSavedAtNl : termsDraftLastSavedAtEn;

  const activeTermsContent = termsEditorLanguage === 'nl' ? termsContentNl : termsContentEn;

  const setActiveTermsContent = (nextValue: string) => {
    if (termsEditorLanguage === 'nl') {
      setTermsContentNl(nextValue);
      return;
    }
    setTermsContentEn(nextValue);
  };

  const getTermsPlaceholders = () => (
    termsVersions[0]?.availablePlaceholders && termsVersions[0].availablePlaceholders.length > 0
      ? termsVersions[0].availablePlaceholders
      : FALLBACK_TERMS_PLACEHOLDERS
  );

  const detectPlaceholderDraft = (text: string, cursor: number) => {
    const beforeCursor = text.slice(0, cursor);
    const start = beforeCursor.lastIndexOf('{{');
    if (start === -1) {
      return null;
    }

    const draft = beforeCursor.slice(start);
    if (draft.includes('}}') || /\s/.test(draft)) {
      return null;
    }

    return {
      start,
      end: cursor,
      query: draft.slice(2).toLowerCase(),
    };
  };

  const updatePlaceholderSuggestions = (text: string, cursor: number) => {
    const draft = detectPlaceholderDraft(text, cursor);
    if (!draft) {
      if (manualSuggestionMode) {
        setShowPlaceholderSuggestions(true);
        setPlaceholderQuery('');
        setSuggestionRange(null);
        return;
      }
      setShowPlaceholderSuggestions(false);
      setPlaceholderQuery('');
      setSuggestionRange(null);
      return;
    }

    setManualSuggestionMode(false);
    setPlaceholderQuery(draft.query);
    setSuggestionRange({ start: draft.start, end: draft.end });
    setActiveSuggestionIndex(0);
    setShowPlaceholderSuggestions(true);
  };

  const insertPlaceholder = (placeholder: string, replaceDraft: boolean) => {
    if (termsEditorMode !== 'edit') {
      setTermsEditorMode('edit');
      setActiveTermsContent(`${activeTermsContent}${activeTermsContent ? '\n' : ''}${placeholder}`);
      setShowPlaceholderSuggestions(false);
      setSuggestionRange(null);
      return;
    }

    const textarea = termsTextareaRef.current;
    if (!textarea) {
      setActiveTermsContent(`${activeTermsContent}${activeTermsContent ? '\n' : ''}${placeholder}`);
      setShowPlaceholderSuggestions(false);
      setSuggestionRange(null);
      return;
    }

    const selectionStart = replaceDraft && suggestionRange ? suggestionRange.start : textarea.selectionStart;
    const selectionEnd = replaceDraft && suggestionRange ? suggestionRange.end : textarea.selectionEnd;
    const start = Math.max(0, selectionStart ?? activeTermsContent.length);
    const end = Math.max(start, selectionEnd ?? start);

    const nextContent = `${activeTermsContent.slice(0, start)}${placeholder}${activeTermsContent.slice(end)}`;
    const nextCursor = start + placeholder.length;

    setActiveTermsContent(nextContent);
    setShowPlaceholderSuggestions(false);
    setManualSuggestionMode(false);
    setPlaceholderQuery('');
    setSuggestionRange(null);

    requestAnimationFrame(() => {
      const el = termsTextareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const filteredPlaceholders = getTermsPlaceholders().filter((placeholder) => {
    if (!placeholderQuery) {
      return true;
    }
    return placeholder.toLowerCase().includes(placeholderQuery);
  });

  const appendPlaceholder = (placeholder: string) => {
    insertPlaceholder(placeholder, false);
  };

  const handleToggleTermsEnabled = async () => {
    const newValue = !termsEnabled;
    setTermsEnabledLoading(true);
    try {
      const response = await fetch('/api/tenant-settings/terms-enabled', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getOrganizationHeaders() },
        body: JSON.stringify({ enabled: newValue }),
      });
      if (response.ok) {
        const data: { enabled: boolean } = await response.json();
        setTermsEnabled(Boolean(data.enabled));
        setValues((prev) => ({ ...prev, TERMS_ENABLED: String(Boolean(data.enabled)) }));
        setTermsMessage(t('tenant_settings.save_success'));
      } else {
        setTermsMessage(t('tenant_settings.save_error'));
      }
    } catch {
      setTermsMessage(t('tenant_settings.save_error'));
    } finally {
      setTermsEnabledLoading(false);
    }
  };

  const handlePublishTerms = async () => {
    setTermsPublishing(true);
    setTermsMessage('');
    try {
      await membershipTermsApi.publish({
        title: termsTitleEn,
        titleNl: termsTitleNl.trim() || undefined,
        content: termsContentEn,
        contentNl: termsContentNl.trim() || undefined,
      });
      await membershipTermsApi.saveDraft({
        title: termsTitleEn,
        titleNl: termsTitleNl,
        content: termsContentEn,
        contentNl: termsContentNl,
        locale: termsEditorLanguage,
      });
      setTermsMessage(t('tenant_settings.terms_publish_success'));
      await fetchMembershipTerms();
    } catch {
      setTermsMessage(t('tenant_settings.terms_publish_error'));
    } finally {
      setTermsPublishing(false);
    }
  };

  const handleSaveDraftTerms = async () => {
    setTermsDraftSaving(true);
    setTermsMessage('');
    try {
      const response = await membershipTermsApi.saveDraft({
        title: termsTitleEn,
        titleNl: termsTitleNl,
        content: termsContentEn,
        contentNl: termsContentNl,
        locale: termsEditorLanguage,
      });
      setTermsDraftLastSavedAtEn(response.lastSavedAt ?? null);
      setTermsDraftLastSavedAtNl(response.lastSavedAtNl ?? null);
      setTermsMessage(t('tenant_settings.terms_draft_saved'));
    } catch {
      setTermsMessage(t('tenant_settings.terms_draft_save_error'));
    } finally {
      setTermsDraftSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/tenant-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getOrganizationHeaders() },
        body: JSON.stringify(values),
      });
      if (response.ok) {
        setMessage(t('tenant_settings.save_success'));
        if (values['APP_NAME']) {
          setAppName(values['APP_NAME']);
        }
      } else {
        setMessage(t('tenant_settings.save_error'));
      }
    } catch {
      setMessage(t('tenant_settings.save_error'));
    } finally {
      setSaving(false);
    }
  };

  const categories = [...new Set(fields.map(f => f.category))];

  const getFieldInput = (field: TenantSettingField) => {
    const isPassword = field.fieldKey.toLowerCase().includes('password');
    return (
      <div key={field.fieldKey}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t(`tenant_settings.fields.${field.fieldKey}`) !== `tenant_settings.fields.${field.fieldKey}`
            ? t(`tenant_settings.fields.${field.fieldKey}`)
            : field.label}
        </label>
        <input
          type={isPassword ? 'password' : field.fieldKey.includes('URL') ? 'url' : 'text'}
          value={values[field.fieldKey] || ''}
          onChange={(e) => setValues(prev => ({ ...prev, [field.fieldKey]: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-6 md:mb-8">{t('tenant_settings.title')}</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-gray-600">{t('tenant_settings.no_fields')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-6 md:mb-8">{t('tenant_settings.title')}</h1>

      <div className="flex gap-1 mb-6 border-b border-stone-200 overflow-x-auto max-w-3xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-700'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Organization Profile card */}
      {activeTab === 'profile' && orgId !== undefined && (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 max-w-3xl mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-charcoal mb-6">
            {t('tenant_settings.org_profile')}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('organizations.handle_label')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={orgHandle}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    setOrgHandle(val);
                    setHandleMessage('');
                    checkHandleAvailability(val, orgId);
                  }}
                  placeholder="e.g. btr-mosque"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition pr-10 ${
                    orgHandle && handleAvailable === false
                      ? 'border-red-400'
                      : orgHandle && handleAvailable === true
                      ? 'border-green-400'
                      : 'border-gray-300'
                  }`}
                />
                {orgHandle && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {handleChecking ? (
                      <svg className="animate-spin h-4 w-4 text-gray-400" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                    ) : handleAvailable === true ? (
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                      </svg>
                    ) : handleAvailable === false ? (
                      <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    ) : null}
                  </span>
                )}
              </div>
              <p className={`text-xs mt-1 ${
                orgHandle && handleAvailable === false ? 'text-red-500' :
                orgHandle && handleAvailable === true ? 'text-green-600' :
                'text-gray-500'
              }`}>
                {handleChecking
                  ? t('organizations.handle_checking')
                  : orgHandle && handleAvailable === false
                  ? t('organizations.handle_taken')
                  : orgHandle && handleAvailable === true
                  ? t('organizations.handle_available')
                  : t('organizations.handle_description')}
              </p>
            </div>
            {handleMessage && (
              <p className={`text-sm ${
                handleMessage.includes('success') || handleMessage.includes('successfully') || handleMessage.includes('succesvol') || handleMessage.includes('opgeslagen')
                  ? 'text-emerald-700' : 'text-red-600'
              }`}>{handleMessage}</p>
            )}
            <div>
              <button
                onClick={saveHandle}
                disabled={handleSaving || handleChecking || (!!orgHandle && handleAvailable === false)}
                className="px-6 py-2 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {handleSaving ? t('tenant_settings.saving') : t('tenant_settings.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Registration Link card */}
      {activeTab === 'registration' && orgId !== undefined && orgHandle && (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 max-w-3xl mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-charcoal mb-2">
            {t('tenant_settings.registration_link_title')}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {t('tenant_settings.registration_link_description')}
          </p>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('tenant_settings.registration_link_label')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={buildTenantUrl(orgHandle, '/register-member')}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(buildTenantUrl(orgHandle, '/register-member'));
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }}
              className="px-4 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition text-sm whitespace-nowrap"
            >
              {copiedLink ? t('tenant_settings.registration_link_copied') : t('tenant_settings.registration_link_copy')}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'terms' && (
      <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 max-w-3xl mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-charcoal">{t('tenant_settings.terms_title')}</h2>
            <p className="text-sm text-gray-500 mt-1">{t('tenant_settings.terms_description')}</p>
          </div>
          <div className="flex items-center gap-3">
            {termsVersions[0] && (
              <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                {t('tenant_settings.terms_current_badge', { version: String((termsVersions.find((item) => item.active) ?? termsVersions[0]).versionNumber) })}
              </span>
            )}
          </div>
        </div>

        {/* Enable / Disable toggle */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 mb-6">
          <div>
            <p className="text-sm font-medium text-charcoal">{t('tenant_settings.terms_enable_label')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('tenant_settings.terms_enable_hint')}</p>
          </div>
          <button
            type="button"
            disabled={termsEnabledLoading}
            onClick={handleToggleTermsEnabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              termsEnabled ? 'bg-emerald-600' : 'bg-gray-300'
            } ${termsEnabledLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                termsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {!termsEnabled && termsVersions.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            {t('tenant_settings.terms_disabled_hint')}
          </div>
        )}

        {(termsEnabled || termsVersions.length > 0) && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.language')}</label>
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setTermsEditorLanguage('en');
                    setShowPlaceholderSuggestions(false);
                    setManualSuggestionMode(false);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    termsEditorLanguage === 'en'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t('tenant_settings.terms_language_english')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTermsEditorLanguage('nl');
                    setShowPlaceholderSuggestions(false);
                    setManualSuggestionMode(false);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                    termsEditorLanguage === 'nl'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t('tenant_settings.terms_language_dutch')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('tenant_settings.terms_form_title')}</label>
              <input
                type="text"
                value={activeTermsTitle}
                onChange={(e) => setActiveTermsTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('tenant_settings.terms_form_title_placeholder')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <label className="block text-sm font-medium text-gray-700">{t('tenant_settings.terms_form_content')}</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 hidden sm:inline">{t('tenant_settings.terms_placeholders_hint')}</span>
                  <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setTermsEditorMode('edit')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                        termsEditorMode === 'edit'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t('tenant_settings.terms_editor_edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTermsEditorMode('preview')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                        termsEditorMode === 'preview'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t('tenant_settings.terms_editor_preview')}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-2">{t('tenant_settings.terms_placeholder_insert_hint')}</p>

              {termsEditorMode === 'edit' ? (
                <div className="relative">
                  <textarea
                    ref={termsTextareaRef}
                    value={activeTermsContent}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setActiveTermsContent(nextValue);
                      updatePlaceholderSuggestions(nextValue, e.target.selectionStart);
                    }}
                    onClick={(e) => updatePlaceholderSuggestions(e.currentTarget.value, e.currentTarget.selectionStart)}
                    onKeyUp={(e) => updatePlaceholderSuggestions(e.currentTarget.value, e.currentTarget.selectionStart)}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowPlaceholderSuggestions(false);
                        setManualSuggestionMode(false);
                      }, 120);
                    }}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && (e.key === ' ' || e.code === 'Space')) {
                        e.preventDefault();
                        setManualSuggestionMode(true);
                        setPlaceholderQuery('');
                        setSuggestionRange(null);
                        setActiveSuggestionIndex(0);
                        setShowPlaceholderSuggestions(true);
                        return;
                      }

                      if (!showPlaceholderSuggestions || filteredPlaceholders.length === 0) {
                        return;
                      }

                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActiveSuggestionIndex((prev) => (prev + 1) % filteredPlaceholders.length);
                        return;
                      }

                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActiveSuggestionIndex((prev) => (prev - 1 + filteredPlaceholders.length) % filteredPlaceholders.length);
                        return;
                      }

                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        insertPlaceholder(filteredPlaceholders[activeSuggestionIndex], true);
                        return;
                      }

                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setShowPlaceholderSuggestions(false);
                        setManualSuggestionMode(false);
                      }
                    }}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono text-sm"
                    placeholder={t('tenant_settings.terms_form_content_placeholder')}
                  />

                  {showPlaceholderSuggestions && filteredPlaceholders.length > 0 && (
                    <div className="absolute left-3 right-3 bottom-3 z-10 max-h-44 overflow-auto rounded-lg border border-gray-200 bg-white shadow-xl">
                      {filteredPlaceholders.map((placeholder, index) => (
                        <button
                          type="button"
                          key={`${placeholder}-${index}`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            insertPlaceholder(placeholder, true);
                          }}
                          className={`block w-full text-left px-3 py-2 text-xs font-mono transition ${{
                            true: 'bg-emerald-50 text-emerald-800',
                            false: 'text-gray-700 hover:bg-gray-50',
                          }[String(index === activeSuggestionIndex) as 'true' | 'false']}`}
                        >
                          {placeholder}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="min-h-[304px] w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50">
                  <TermsContentRenderer content={activeTermsContent} className="text-sm leading-6 text-gray-700" />
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">{t('tenant_settings.terms_available_placeholders')}</p>
              <div className="flex flex-wrap gap-2">
                {getTermsPlaceholders().map((placeholder) => (
                  <button
                    type="button"
                    key={placeholder}
                    onClick={() => appendPlaceholder(placeholder)}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    {placeholder}
                  </button>
                ))}
              </div>
            </div>

            {termsMessage && (
              <div className={`p-4 rounded-lg ${
                termsMessage.includes('success') || termsMessage.includes('succes') || termsMessage.includes('opgeslagen') || termsMessage.includes('published')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {termsMessage}
              </div>
            )}

            <div className="flex flex-wrap justify-end items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraftTerms}
                  disabled={termsDraftSaving}
                  className="px-6 py-3 bg-white border border-emerald-700 text-emerald-700 rounded-lg font-semibold hover:bg-emerald-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {termsDraftSaving ? t('tenant_settings.terms_saving_draft') : t('tenant_settings.terms_save_draft')}
                </button>
                {activeDraftLastSavedAt && (
                  <div className="flex items-center gap-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    <span className="inline-block w-2 h-2 bg-amber-500 rounded-full"></span>
                    <span className="font-medium">{t('tenant_settings.terms_draft_label')}</span>
                    <span className="text-amber-600">
                      {new Date(activeDraftLastSavedAt).toLocaleTimeString(language === 'nl' ? 'nl-NL' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handlePublishTerms}
                disabled={termsPublishing || !termsTitleEn.trim() || !termsContentEn.trim()}
                className="px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {termsPublishing ? t('tenant_settings.terms_publishing') : t('tenant_settings.terms_publish')}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
              <h3 className="text-lg font-semibold text-charcoal">{t('tenant_settings.terms_history')}</h3>
              {termsLoading ? (
                <div className="text-sm text-gray-500">{t('tenant_settings.loading_terms')}</div>
              ) : termsVersions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  {t('tenant_settings.terms_empty')}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    {t('tenant_settings.terms_showing_count', {
                      shown: String(Math.min(visibleHistoryCount, termsVersions.length)),
                      total: String(termsVersions.length),
                    })}
                  </p>

                  {termsVersions.slice(0, visibleHistoryCount).map((version) => {
                    const expanded = expandedHistoryId === version.id;
                    const historyLocale = historyLocaleByVersion[version.id] || (language === 'nl' ? 'nl' : 'en');
                    const localizedTitle = historyLocale === 'nl'
                      ? (version.titleNl?.trim() || version.title)
                      : version.title;
                    const localizedRenderedContent = historyLocale === 'nl'
                      ? (version.renderedContentNl?.trim() || version.renderedContent)
                      : version.renderedContent;
                    return (
                      <div key={version.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold text-charcoal truncate">{localizedTitle}</h4>
                              {version.active && (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  {t('tenant_settings.terms_active')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {t('tenant_settings.terms_version_meta', {
                                version: String(version.versionNumber),
                                date: new Date(version.createdAt).toLocaleString(),
                                createdBy: version.createdBy || 'system',
                              })}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setExpandedHistoryId(expanded ? null : version.id);
                              if (!expanded) {
                                setHistoryLocaleByVersion((prev) => ({
                                  ...prev,
                                  [version.id]: prev[version.id] || (language === 'nl' ? 'nl' : 'en'),
                                }));
                              }
                            }}
                            className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                          >
                            {expanded ? t('tenant_settings.terms_hide_details') : t('tenant_settings.terms_view_details')}
                          </button>
                        </div>

                        {expanded && (
                          <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 max-h-[60vh] overflow-y-auto">
                            <div className="mb-3 flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600">{t('tenant_settings.terms_history_language')}</span>
                              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
                                <button
                                  type="button"
                                  onClick={() => setHistoryLocaleByVersion((prev) => ({ ...prev, [version.id]: 'en' }))}
                                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                                    historyLocale === 'en'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {t('tenant_settings.terms_history_english')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHistoryLocaleByVersion((prev) => ({ ...prev, [version.id]: 'nl' }))}
                                  className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                                    historyLocale === 'nl'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {t('tenant_settings.terms_history_dutch')}
                                </button>
                              </div>
                            </div>
                            <TermsContentRenderer
                              content={localizedRenderedContent}
                              className="text-sm leading-6 text-gray-700"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {termsVersions.length > HISTORY_PAGE_SIZE && (
                    <div className="flex items-center justify-center gap-3 pt-2">
                      {visibleHistoryCount < termsVersions.length && (
                        <button
                          type="button"
                          onClick={() => setVisibleHistoryCount((prev) => Math.min(prev + HISTORY_PAGE_SIZE, termsVersions.length))}
                          className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          {t('tenant_settings.terms_show_more')}
                        </button>
                      )}
                      {visibleHistoryCount > HISTORY_PAGE_SIZE && (
                        <button
                          type="button"
                          onClick={() => {
                            setVisibleHistoryCount(HISTORY_PAGE_SIZE);
                            setExpandedHistoryId(termsVersions[0]?.id ?? null);
                          }}
                          className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          {t('tenant_settings.terms_show_less')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}

      {activeTab === 'settings' && categories.map(cat => {
        const catFields = fields.filter(f => f.category === cat);
        if (catFields.length === 0) return null;
        return (
          <div key={cat} className="bg-white rounded-lg shadow-lg p-4 md:p-8 max-w-3xl mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-charcoal mb-6 capitalize">
              {t(`tenant_settings.categories.${cat}`) !== `tenant_settings.categories.${cat}`
                ? t(`tenant_settings.categories.${cat}`)
                : cat}
            </h2>
            <div className="space-y-6">
              {catFields.map(field => getFieldInput(field))}
            </div>
          </div>
        );
      })}

      {activeTab === 'settings' && (
        <>
          {message && (
            <div className={`max-w-3xl mb-4 p-4 rounded-lg ${
              message.includes('success') || message.includes('successfully') || message.includes('succesvol')
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <div className="max-w-3xl">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('tenant_settings.saving') : t('tenant_settings.save')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

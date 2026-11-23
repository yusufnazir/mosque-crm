'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAppName } from '@/lib/AppNameContext';
import { useDateFormat, DATE_FORMAT_PRESETS, DEFAULT_DATE_FORMAT } from '@/lib/DateFormatContext';
import { useAuth } from '@/lib/auth/AuthContext';

interface MailServerConfig {
  host: string;
  username: string;
  password: string;
  projectUuid: string;
}

interface TenantFieldConfig {
  [fieldKey: string]: boolean;
}

interface MinioConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSsl: boolean;
}

interface WahaSettings {
  baseUrl: string;
  apiKey: string;
  session: string;
  webhookSecret: string;
  configured: boolean;
  apiKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  webhookPath: string;
  sessionStatus?: string;
  coldDelayMinSeconds?: number;
  coldDelayMaxSeconds?: number;
  conversationDelayMinSeconds?: number;
  conversationDelayMaxSeconds?: number;
  typingMinSeconds?: number;
  typingMaxSeconds?: number;
  maxPerHour?: number;
  maxPerDay?: number;
  warmupStartPerDay?: number;
  warmupStepPerDay?: number;
  maxAttempts?: number;
  quietHoursStart?: number;
  quietHoursEnd?: number;
  timezone?: string;
  conversationWindowHours?: number;
  defaultCountryCode?: string;
  workerPollMillis?: number;
  connectTimeoutMillis?: number;
  readTimeoutMillis?: number;
}

/** Small labelled number input used by the WhatsApp safety section. */
function NumberField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value?: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value?: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        {suffix && <span className="shrink-0 text-xs text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuth();
  const { appName, setAppName, refreshAppName } = useAppName();
  const { setDateFormat } = useDateFormat();
  const [activeTab, setActiveTab] = useState<'general' | 'mail' | 'document' | 'demo' | 'waha'>('general');
  const [config, setConfig] = useState<MailServerConfig>({
    host: '',
    username: '',
    password: '',
    projectUuid: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [appNameInput, setAppNameInput] = useState(appName);
  const [appBaseUrlInput, setAppBaseUrlInput] = useState('');
  const [appBaseDomainInput, setAppBaseDomainInput] = useState('');
  const [appBaseDomainError, setAppBaseDomainError] = useState('');
  const [tenantEditable, setTenantEditable] = useState<TenantFieldConfig>({});
  const [tenantEditableDirty, setTenantEditableDirty] = useState(false);
  const [minioConfig, setMinioConfig] = useState<MinioConfig>({
    endpoint: '',
    accessKey: '',
    secretKey: '',
    bucket: '',
    useSsl: false,
  });
  const [showMinioSecret, setShowMinioSecret] = useState(false);
  const [superAdminSubdomain, setSuperAdminSubdomain] = useState('admin');
  const [superAdminSubdomainError, setSuperAdminSubdomainError] = useState('');
  const [dateFormatInput, setDateFormatInput] = useState(DEFAULT_DATE_FORMAT);
  const [demoStatus, setDemoStatus] = useState<{
    seeded: boolean;
    canCreate: boolean;
    message: string;
    credentials: Array<{
      organization: string;
      handle: string;
      role: string;
      username: string;
      email: string;
      password: string;
    }>;
  } | null>(null);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const [wahaSettings, setWahaSettings] = useState<WahaSettings>({
    baseUrl: '',
    apiKey: '',
    session: 'default',
    webhookSecret: '',
    configured: false,
    apiKeyConfigured: false,
    webhookSecretConfigured: false,
    webhookPath: '/api/whatsapp/webhook',
    sessionStatus: undefined,
    coldDelayMinSeconds: 15,
    coldDelayMaxSeconds: 45,
    conversationDelayMinSeconds: 5,
    conversationDelayMaxSeconds: 15,
    typingMinSeconds: 2,
    typingMaxSeconds: 4,
    maxPerHour: 20,
    maxPerDay: 100,
    warmupStartPerDay: 20,
    warmupStepPerDay: 20,
    maxAttempts: 3,
    quietHoursStart: 20,
    quietHoursEnd: 9,
    timezone: 'Europe/Amsterdam',
    conversationWindowHours: 24,
    defaultCountryCode: '31',
  });
  const [showWahaApiKey, setShowWahaApiKey] = useState(false);
  const [showWahaWebhookSecret, setShowWahaWebhookSecret] = useState(false);
  const [testingWaha, setTestingWaha] = useState(false);

  useEffect(() => {
    fetchMailServerConfig();
    fetchAppBaseUrl();
    fetchAppBaseDomain();
    fetchTenantFieldConfig();
    fetchMinioConfig();
    fetchSuperAdminSubdomain();
    fetchDateFormat();
    fetchDemoStatus();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) fetchWahaSettings();
  }, [isSuperAdmin]);

  const fetchWahaSettings = async () => {
    try {
      const response = await fetch('/api/whatsapp/settings');
      if (response.ok) {
        setWahaSettings(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch WAHA settings:', error);
    }
  };

  const handleSaveWaha = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/whatsapp/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: wahaSettings.baseUrl,
          apiKey: wahaSettings.apiKey,
          session: wahaSettings.session,
          webhookSecret: wahaSettings.webhookSecret,
          coldDelayMinSeconds: wahaSettings.coldDelayMinSeconds,
          coldDelayMaxSeconds: wahaSettings.coldDelayMaxSeconds,
          conversationDelayMinSeconds: wahaSettings.conversationDelayMinSeconds,
          conversationDelayMaxSeconds: wahaSettings.conversationDelayMaxSeconds,
          typingMinSeconds: wahaSettings.typingMinSeconds,
          typingMaxSeconds: wahaSettings.typingMaxSeconds,
          maxPerHour: wahaSettings.maxPerHour,
          maxPerDay: wahaSettings.maxPerDay,
          warmupStartPerDay: wahaSettings.warmupStartPerDay,
          warmupStepPerDay: wahaSettings.warmupStepPerDay,
          maxAttempts: wahaSettings.maxAttempts,
          quietHoursStart: wahaSettings.quietHoursStart,
          quietHoursEnd: wahaSettings.quietHoursEnd,
          timezone: wahaSettings.timezone,
          conversationWindowHours: wahaSettings.conversationWindowHours,
          defaultCountryCode: wahaSettings.defaultCountryCode,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setWahaSettings(data);
        setMessage(t('settings.waha_saved'));
      } else {
        setMessage(data.error || t('settings.config_saved_error'));
      }
    } catch {
      setMessage(t('settings.config_saved_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTestWaha = async () => {
    setTestingWaha(true);
    setMessage('');
    try {
      const response = await fetch('/api/whatsapp/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: wahaSettings.baseUrl,
          apiKey: wahaSettings.apiKey,
          session: wahaSettings.session,
        }),
      });
      const data = await response.json().catch(() => ({}));
      setMessage(data.message || t('settings.waha_test_failed'));
      if (data.status) {
        setWahaSettings(prev => ({ ...prev, sessionStatus: data.status }));
      }
    } catch {
      setMessage(t('settings.waha_test_failed'));
    } finally {
      setTestingWaha(false);
    }
  };

  const fetchDemoStatus = async () => {
    try {
      const response = await fetch('/api/demo-data/status');
      if (response.ok) {
        setDemoStatus(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch demo data status:', error);
    }
  };

  const handleSeedDemoData = async () => {
    if (!demoStatus?.canCreate || seedingDemo) return;
    if (!window.confirm(t('settings.demo_confirm'))) return;
    setSeedingDemo(true);
    setMessage('');
    try {
      const response = await fetch('/api/demo-data/seed', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || t('settings.demo_seed_error'));
      } else {
        setDemoStatus(data);
        setMessage(t('settings.demo_seed_success'));
      }
    } catch {
      setMessage(t('settings.demo_seed_error'));
    } finally {
      setSeedingDemo(false);
    }
  };

  useEffect(() => {
    setAppNameInput(appName);
  }, [appName]);

  const fetchMailServerConfig = async () => {
    try {
      const response = await fetch('/api/configurations/mail-server');

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch mail server config:', error);
    }
  };

  const fetchAppBaseUrl = async () => {
    try {
      const response = await fetch('/api/configurations/APP_BASE_URL');
      if (response.ok) {
        const data = await response.json();
        setAppBaseUrlInput(data.value || '');
      }
    } catch (error) {
      console.error('Failed to fetch app base URL:', error);
    }
  };

  const fetchAppBaseDomain = async () => {
    try {
      const response = await fetch('/api/configurations/APP_BASE_DOMAIN');
      if (response.ok) {
        const data = await response.json();
        setAppBaseDomainInput(data.value || '');
      }
    } catch (error) {
      console.error('Failed to fetch app base domain:', error);
    }
  };

  const fetchTenantFieldConfig = async () => {
    try {
      const response = await fetch('/api/tenant-settings/fields');
      if (response.ok) {
        const data = await response.json();
        const map: TenantFieldConfig = {};
        for (const field of data) {
          map[field.fieldKey] = field.tenantEditable;
        }
        setTenantEditable(map);
      }
    } catch (error) {
      console.error('Failed to fetch tenant field config:', error);
    }
  };

  const handleToggleTenantEditable = (fieldKey: string) => {
    setTenantEditable(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
    setTenantEditableDirty(true);
  };

  const handleSaveTenantEditable = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/tenant-settings/fields', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenantEditable),
      });
      if (response.ok) {
        setTenantEditableDirty(false);
        setMessage(t('settings.tenant_editable_saved'));
      } else {
        setMessage(t('settings.config_saved_error'));
      }
    } catch {
      setMessage(t('settings.config_saved_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/configurations/mail-server', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage(t('settings.config_saved_success'));
      } else {
        setMessage(t('settings.config_saved_error'));
      }
    } catch (error) {
      setMessage(t('settings.config_saved_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/configurations/mail-server/test', {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setMessage(data.message || 'Connection test successful');
      } else if (data.status === 'error') {
        setMessage(data.message || 'Connection test failed');
      } else {
        setMessage(data.message || 'Test completed');
      }
    } catch (error) {
      setMessage('Test failed: Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuperAdminSubdomain = async () => {
    try {
      const response = await fetch('/api/configurations/superadmin-subdomain');
      if (response.ok) {
        const data = await response.json();
        setSuperAdminSubdomain(data.subdomain || 'admin');
      }
    } catch (error) {
      console.error('Failed to fetch super admin subdomain:', error);
    }
  };

  const fetchDateFormat = async () => {
    try {
      const response = await fetch('/api/configurations/DATE_FORMAT');
      if (response.ok) {
        const data = await response.json();
        if (data.value) setDateFormatInput(data.value);
      }
    } catch (error) {
      console.error('Failed to fetch date format:', error);
    }
  };

  const handleSaveSuperAdminSubdomain = async () => {
    setSuperAdminSubdomainError('');
    if (!/^[a-z0-9-]+$/.test(superAdminSubdomain)) {
      setSuperAdminSubdomainError('Only lowercase letters, digits and hyphens are allowed.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/configurations/superadmin-subdomain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: superAdminSubdomain }),
      });
      const data = await response.json();
      if (response.ok) {
        // Keep middleware routing in sync without requiring a fresh login.
        if (typeof document !== 'undefined') {
          const baseDomain = appBaseDomainInput.trim();
          const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';
          const cookieParts = [
            `org_handle=${encodeURIComponent(superAdminSubdomain)}`,
            'Path=/',
            'Max-Age=86400',
            'SameSite=Lax',
          ];
          if (secure) {
            cookieParts.push('Secure');
          }
          if (baseDomain) {
            cookieParts.push(`Domain=.${baseDomain}`);
          }
          document.cookie = cookieParts.join('; ');
        }

        setMessage(t('settings.config_saved_success'));

        // Redirect to the updated super-admin host immediately in production.
        if (typeof window !== 'undefined') {
          const baseDomain = appBaseDomainInput.trim();
          if (baseDomain) {
            const { protocol, port, pathname } = window.location;
            const portSuffix = port ? `:${port}` : '';
            const nextUrl = `${protocol}//${superAdminSubdomain}.${baseDomain}${portSuffix}${pathname}`;
            if (window.location.host !== `${superAdminSubdomain}.${baseDomain}${portSuffix}`) {
              window.location.assign(nextUrl);
            }
          }
        }
      } else {
        setMessage(data.message || t('settings.config_saved_error'));
      }
    } catch {
      setMessage(t('settings.config_saved_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    const normalizedBaseDomain = appBaseDomainInput.trim().toLowerCase();
    if (normalizedBaseDomain && !/^[a-z0-9.-]+$/.test(normalizedBaseDomain)) {
      setAppBaseDomainError('Only lowercase letters, digits, dots and hyphens are allowed.');
      return;
    }

    setLoading(true);
    setMessage('');
    setAppBaseDomainError('');

    try {
      const response = await fetch('/api/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'APP_NAME', value: appNameInput }),
      });

      // Save base URL as well
      await fetch('/api/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'APP_BASE_URL', value: appBaseUrlInput }),
      });

      await fetch('/api/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'APP_BASE_DOMAIN', value: normalizedBaseDomain }),
      });

      // Save date format
      await fetch('/api/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'DATE_FORMAT', value: dateFormatInput }),
      });

      if (response.ok) {
        setAppName(appNameInput);
        setDateFormat(dateFormatInput);
        if (typeof window !== 'undefined') {
          if (normalizedBaseDomain) {
            localStorage.setItem('appBaseDomain', normalizedBaseDomain);
            const secure = window.location.protocol === 'https:';
            const cookieParts = [
              `app_base_domain=${encodeURIComponent(normalizedBaseDomain)}`,
              'Path=/',
              'Max-Age=86400',
              'SameSite=Lax',
              `Domain=.${normalizedBaseDomain}`,
            ];
            if (secure) {
              cookieParts.push('Secure');
            }
            document.cookie = cookieParts.join('; ');
          } else {
            localStorage.removeItem('appBaseDomain');
          }
        }
        setMessage(t('settings.config_saved_success'));
      } else {
        setMessage(t('settings.config_saved_error'));
      }
    } catch {
      setMessage(t('settings.config_saved_error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchMinioConfig = async () => {
    try {
      const response = await fetch('/api/configurations/minio');
      if (response.ok) {
        const data = await response.json();
        setMinioConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch MinIO config:', error);
    }
  };

  const handleSaveMinio = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/configurations/minio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minioConfig),
      });
      if (response.ok) {
        setMessage(t('settings.config_saved_success'));
      } else {
        setMessage(t('settings.config_saved_error'));
      }
    } catch {
      setMessage(t('settings.config_saved_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTestMinio = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/configurations/minio/test', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.status === 'success') {
        setMessage(data.message || t('settings.minio_test_success'));
      } else {
        setMessage(data.message || t('settings.minio_test_failed'));
      }
    } catch {
      setMessage(t('settings.minio_test_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-6 md:mb-8">{t('settings.title')}</h1>

      <div role="tablist" className="flex flex-wrap gap-3 md:gap-4 mb-6">
        <button
          role="tab"
          aria-selected={activeTab === 'general'}
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'general'
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('settings.general')}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'mail'}
          onClick={() => setActiveTab('mail')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'mail'
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('settings.mail_server')}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'document'}
          onClick={() => setActiveTab('document')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'document'
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('settings.document_management')}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'demo'}
          onClick={() => setActiveTab('demo')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'demo'
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('settings.demo_data')}
        </button>
        {isSuperAdmin && <button
          role="tab"
          aria-selected={activeTab === 'waha'}
          onClick={() => setActiveTab('waha')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'waha'
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('settings.waha')}
        </button>}
      </div>

      {/* Tenant Editable Controls Banner */}
      {tenantEditableDirty && (
        <div className="mb-4 flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-sm text-amber-800">{t('settings.tenant_editable_unsaved')}</span>
          <button
            onClick={handleSaveTenantEditable}
            disabled={loading}
            className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition disabled:opacity-50"
          >
            {t('settings.save_tenant_permissions')}
          </button>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 max-w-3xl">
          <h2 className="text-xl md:text-2xl font-bold text-charcoal mb-6">{t('settings.general_settings')}</h2>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.app_name')}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" title={t('settings.tenant_editable_tooltip')}>
                  <input
                    type="checkbox"
                    checked={tenantEditable['APP_NAME'] || false}
                    onChange={() => handleToggleTenantEditable('APP_NAME')}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('settings.tenant_editable')}
                </label>
              </div>
              <input
                type="text"
                value={appNameInput}
                onChange={(e) => setAppNameInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="MemberFlow"
              />
              <p className="mt-1 text-sm text-gray-500">{t('settings.app_name_description')}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.app_base_url')}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" title={t('settings.tenant_editable_tooltip')}>
                  <input
                    type="checkbox"
                    checked={tenantEditable['APP_BASE_URL'] || false}
                    onChange={() => handleToggleTenantEditable('APP_BASE_URL')}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('settings.tenant_editable')}
                </label>
              </div>
              <input
                type="url"
                value={appBaseUrlInput}
                onChange={(e) => setAppBaseUrlInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="http://localhost:3000"
              />
              <p className="mt-1 text-sm text-gray-500">{t('settings.app_base_url_description')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.app_base_domain')}
              </label>
              <input
                type="text"
                value={appBaseDomainInput}
                onChange={(e) => {
                  setAppBaseDomainInput(e.target.value.toLowerCase());
                  setAppBaseDomainError('');
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder="memflox.com"
              />
              {appBaseDomainError && (
                <p className="mt-1 text-sm text-red-600">{appBaseDomainError}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">{t('settings.app_base_domain_description')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.date_format')}
              </label>
              <div className="flex gap-3">
                <select
                  value={DATE_FORMAT_PRESETS.some(p => p.value === dateFormatInput) ? dateFormatInput : '__custom__'}
                  onChange={(e) => { if (e.target.value !== '__custom__') setDateFormatInput(e.target.value); }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                >
                  {DATE_FORMAT_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label} ({p.value})</option>
                  ))}
                  {!DATE_FORMAT_PRESETS.some(p => p.value === dateFormatInput) && (
                    <option value="__custom__">{dateFormatInput} (custom)</option>
                  )}
                </select>
              </div>
              <p className="mt-1 text-sm text-gray-500">{t('settings.date_format_description')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.superadmin_subdomain')}
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={superAdminSubdomain}
                  onChange={(e) => { setSuperAdminSubdomain(e.target.value.toLowerCase()); setSuperAdminSubdomainError(''); }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono"
                  placeholder="admin"
                />
                <button
                  onClick={handleSaveSuperAdminSubdomain}
                  disabled={loading}
                  className="px-4 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 text-sm whitespace-nowrap"
                >
                  {loading ? t('settings.saving') : t('settings.save')}
                </button>
              </div>
              {superAdminSubdomainError && (
                <p className="mt-1 text-sm text-red-600">{superAdminSubdomainError}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">{t('settings.superadmin_subdomain_description')}</p>
            </div>

            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('success') || message.includes('successfully') || message.includes('succesvol')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div>
              <button
                onClick={handleSaveGeneral}
                disabled={loading || !appNameInput.trim()}
                className="px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mail' && (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 max-w-3xl">
          <h2 className="text-xl md:text-2xl font-bold text-charcoal mb-6">{t('settings.mail_server_settings')}</h2>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.host')}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" title={t('settings.tenant_editable_tooltip')}>
                  <input
                    type="checkbox"
                    checked={tenantEditable['MAIL_SERVER_HOST'] || false}
                    onChange={() => handleToggleTenantEditable('MAIL_SERVER_HOST')}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('settings.tenant_editable')}
                </label>
              </div>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('settings.host_placeholder')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.username')}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" title={t('settings.tenant_editable_tooltip')}>
                  <input
                    type="checkbox"
                    checked={tenantEditable['MAIL_SERVER_USERNAME'] || false}
                    onChange={() => handleToggleTenantEditable('MAIL_SERVER_USERNAME')}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('settings.tenant_editable')}
                </label>
              </div>
              <input
                type="text"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('settings.username_placeholder')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.password')}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" title={t('settings.tenant_editable_tooltip')}>
                  <input
                    type="checkbox"
                    checked={tenantEditable['MAIL_SERVER_PASSWORD'] || false}
                    onChange={() => handleToggleTenantEditable('MAIL_SERVER_PASSWORD')}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('settings.tenant_editable')}
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={config.password}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder={t('settings.password_placeholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.project_uuid')}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" title={t('settings.tenant_editable_tooltip')}>
                  <input
                    type="checkbox"
                    checked={tenantEditable['MAIL_SERVER_PROJECT_UUID'] || false}
                    onChange={() => handleToggleTenantEditable('MAIL_SERVER_PROJECT_UUID')}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('settings.tenant_editable')}
                </label>
              </div>
              <input
                type="text"
                value={config.projectUuid}
                onChange={(e) => setConfig({ ...config, projectUuid: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('settings.project_uuid_placeholder')}
              />
            </div>

            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('success') || message.includes('successfully') || message.includes('succesvol')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button
                onClick={handleTest}
                disabled={loading}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('settings.testing') : t('settings.test_connection')}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'document' && (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 max-w-3xl">
          <h2 className="text-xl md:text-2xl font-bold text-charcoal mb-2">{t('settings.document_management')}</h2>
          <p className="text-sm text-gray-500 mb-6">{t('settings.minio_description')}</p>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.minio_endpoint')}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" title={t('settings.tenant_editable_tooltip')}>
                  <input
                    type="checkbox"
                    checked={tenantEditable['MINIO_ENDPOINT'] || false}
                    onChange={() => handleToggleTenantEditable('MINIO_ENDPOINT')}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('settings.tenant_editable')}
                </label>
              </div>
              <input
                type="url"
                value={minioConfig.endpoint}
                onChange={(e) => setMinioConfig({ ...minioConfig, endpoint: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('settings.minio_endpoint_placeholder')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.minio_access_key')}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" title={t('settings.tenant_editable_tooltip')}>
                  <input
                    type="checkbox"
                    checked={tenantEditable['MINIO_ACCESS_KEY'] || false}
                    onChange={() => handleToggleTenantEditable('MINIO_ACCESS_KEY')}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('settings.tenant_editable')}
                </label>
              </div>
              <input
                type="text"
                value={minioConfig.accessKey}
                onChange={(e) => setMinioConfig({ ...minioConfig, accessKey: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('settings.minio_access_key_placeholder')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.minio_secret_key')}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" title={t('settings.tenant_editable_tooltip')}>
                  <input
                    type="checkbox"
                    checked={tenantEditable['MINIO_SECRET_KEY'] || false}
                    onChange={() => handleToggleTenantEditable('MINIO_SECRET_KEY')}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('settings.tenant_editable')}
                </label>
              </div>
              <div className="relative">
                <input
                  type={showMinioSecret ? 'text' : 'password'}
                  value={minioConfig.secretKey}
                  onChange={(e) => setMinioConfig({ ...minioConfig, secretKey: e.target.value })}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  placeholder={t('settings.minio_secret_key_placeholder')}
                />
                <button
                  type="button"
                  onClick={() => setShowMinioSecret(!showMinioSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showMinioSecret ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('settings.minio_bucket')}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" title={t('settings.tenant_editable_tooltip')}>
                  <input
                    type="checkbox"
                    checked={tenantEditable['MINIO_BUCKET'] || false}
                    onChange={() => handleToggleTenantEditable('MINIO_BUCKET')}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('settings.tenant_editable')}
                </label>
              </div>
              <input
                type="text"
                value={minioConfig.bucket}
                onChange={(e) => setMinioConfig({ ...minioConfig, bucket: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('settings.minio_bucket_placeholder')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={minioConfig.useSsl}
                    onChange={(e) => setMinioConfig({ ...minioConfig, useSsl: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('settings.minio_use_ssl')}</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" title={t('settings.tenant_editable_tooltip')}>
                  <input
                    type="checkbox"
                    checked={tenantEditable['MINIO_USE_SSL'] || false}
                    onChange={() => handleToggleTenantEditable('MINIO_USE_SSL')}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('settings.tenant_editable')}
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500 ml-8">{t('settings.minio_use_ssl_description')}</p>
            </div>

            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('success') || message.includes('successfully') || message.includes('succesvol') || message.includes('accessible')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <button
                onClick={handleTestMinio}
                disabled={loading || !minioConfig.endpoint.trim()}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('settings.testing') : t('settings.test_connection')}
              </button>
              <button
                onClick={handleSaveMinio}
                disabled={loading}
                className="px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'demo' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 max-w-4xl">
          <h2 className="text-xl font-semibold text-charcoal mb-2">{t('settings.demo_title')}</h2>
          <p className="text-sm text-gray-600 mb-6">{t('settings.demo_description')}</p>

          {demoStatus && (
            <div className={`mb-6 p-4 rounded-lg text-sm ${
              demoStatus.seeded
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : demoStatus.canCreate
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {demoStatus.message}
            </div>
          )}

          {message && activeTab === 'demo' && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('success') || message.includes('succesvol')
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <button
            type="button"
            onClick={handleSeedDemoData}
            disabled={!demoStatus?.canCreate || seedingDemo}
            className="mb-8 px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {seedingDemo ? t('settings.demo_seeding') : t('settings.demo_create')}
          </button>

          <h3 className="text-base font-semibold text-charcoal mb-3">{t('settings.demo_credentials_title')}</h3>
          <p className="text-sm text-gray-500 mb-4">{t('settings.demo_credentials_hint')}</p>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-gray-700">{t('settings.demo_col_org')}</th>
                  <th className="px-3 py-2 font-medium text-gray-700">{t('settings.demo_col_role')}</th>
                  <th className="px-3 py-2 font-medium text-gray-700">{t('settings.demo_col_username')}</th>
                  <th className="px-3 py-2 font-medium text-gray-700">{t('settings.demo_col_password')}</th>
                  <th className="px-3 py-2 font-medium text-gray-700">{t('settings.demo_col_handle')}</th>
                </tr>
              </thead>
              <tbody>
                {(demoStatus?.credentials ?? []).map((cred) => (
                  <tr key={`${cred.handle}-${cred.username}`} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-800">{cred.organization}</td>
                    <td className="px-3 py-2 text-gray-600">{cred.role}</td>
                    <td className="px-3 py-2 font-mono text-gray-900">{cred.username}</td>
                    <td className="px-3 py-2 font-mono text-gray-900">{cred.password}</td>
                    <td className="px-3 py-2 font-mono text-gray-600">{cred.handle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {isSuperAdmin && activeTab === 'waha' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 max-w-3xl">
          <h2 className="text-xl font-semibold text-charcoal mb-2">{t('settings.waha_title')}</h2>
          <p className="text-sm text-gray-600 mb-6">{t('settings.waha_description')}</p>

          {/* Connection status */}
          <div className={`mb-6 flex flex-wrap items-center gap-3 rounded-lg p-4 text-sm ${
            wahaSettings.sessionStatus === 'WORKING'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : wahaSettings.sessionStatus === 'SCAN_QR_CODE' || wahaSettings.sessionStatus === 'STARTING'
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <span className={`h-2.5 w-2.5 rounded-full ${
              wahaSettings.sessionStatus === 'WORKING' ? 'bg-emerald-500' : 'bg-red-500'
            }`} />
            <span className="font-medium">
              {wahaSettings.sessionStatus === 'WORKING'
                ? t('settings.waha_status_working')
                : wahaSettings.sessionStatus === 'SCAN_QR_CODE'
                  ? t('settings.waha_status_qr')
                  : wahaSettings.sessionStatus === 'STARTING'
                    ? t('settings.waha_status_starting')
                    : wahaSettings.sessionStatus === 'STOPPED'
                      ? t('settings.waha_status_stopped')
                      : wahaSettings.sessionStatus === 'UNREACHABLE'
                        ? t('settings.waha_status_unreachable')
                        : t('settings.waha_status_not_configured')}
            </span>
            {wahaSettings.sessionStatus && (
              <span className="font-mono text-xs opacity-70">{wahaSettings.sessionStatus}</span>
            )}
          </div>

          {message && activeTab === 'waha' && (
            <div className={`mb-6 p-4 rounded-lg text-sm ${
              message.includes(t('settings.waha_saved')) || message.startsWith('Connected')
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.waha_base_url')}
              </label>
              <input
                type="text"
                value={wahaSettings.baseUrl}
                onChange={(e) => setWahaSettings({ ...wahaSettings, baseUrl: e.target.value })}
                placeholder="http://localhost:3000"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">{t('settings.waha_base_url_hint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.waha_api_key')}
              </label>
              <div className="relative">
                <input
                  type={showWahaApiKey ? 'text' : 'password'}
                  value={wahaSettings.apiKey}
                  onChange={(e) => setWahaSettings({ ...wahaSettings, apiKey: e.target.value })}
                  placeholder={t('settings.waha_api_key_placeholder')}
                  className="w-full px-4 py-2.5 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowWahaApiKey(!showWahaApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-700"
                >
                  {showWahaApiKey ? t('settings.hide') : t('settings.show')}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">{t('settings.waha_api_key_hint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.waha_session')}
              </label>
              <input
                type="text"
                value={wahaSettings.session}
                onChange={(e) => setWahaSettings({ ...wahaSettings, session: e.target.value })}
                placeholder="default"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">{t('settings.waha_session_hint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.waha_webhook_secret')}
              </label>
              <div className="relative">
                <input
                  type={showWahaWebhookSecret ? 'text' : 'password'}
                  value={wahaSettings.webhookSecret}
                  onChange={(e) => setWahaSettings({ ...wahaSettings, webhookSecret: e.target.value })}
                  placeholder={t('settings.waha_webhook_secret_placeholder')}
                  className="w-full px-4 py-2.5 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowWahaWebhookSecret(!showWahaWebhookSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-700"
                >
                  {showWahaWebhookSecret ? t('settings.hide') : t('settings.show')}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">{t('settings.waha_webhook_secret_hint')}</p>
              {typeof window !== 'undefined' && (
                <p className="mt-2 break-all rounded-lg bg-gray-50 p-2 font-mono text-xs text-gray-600">
                  {`${window.location.origin}${wahaSettings.webhookPath}?token=`}
                  <span className="text-gray-400">
                    {wahaSettings.webhookSecretConfigured ? t('settings.waha_webhook_secret_set') : '<secret>'}
                  </span>
                </p>
              )}
            </div>

            {/* ─── Sending safety ─── */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-base font-semibold text-charcoal mb-1">{t('settings.waha_safety_title')}</h3>
              <p className="mb-4 text-xs text-gray-500">{t('settings.waha_safety_description')}</p>

              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('settings.waha_section_delays')}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField
                      label={t('settings.waha_cold_delay_min')}
                      value={wahaSettings.coldDelayMinSeconds}
                      min={1}
                      max={600}
                      suffix={t('settings.waha_seconds')}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, coldDelayMinSeconds: value })}
                    />
                    <NumberField
                      label={t('settings.waha_cold_delay_max')}
                      value={wahaSettings.coldDelayMaxSeconds}
                      min={1}
                      max={600}
                      suffix={t('settings.waha_seconds')}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, coldDelayMaxSeconds: value })}
                    />
                    <NumberField
                      label={t('settings.waha_conversation_delay_min')}
                      value={wahaSettings.conversationDelayMinSeconds}
                      min={1}
                      max={600}
                      suffix={t('settings.waha_seconds')}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, conversationDelayMinSeconds: value })}
                    />
                    <NumberField
                      label={t('settings.waha_conversation_delay_max')}
                      value={wahaSettings.conversationDelayMaxSeconds}
                      min={1}
                      max={600}
                      suffix={t('settings.waha_seconds')}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, conversationDelayMaxSeconds: value })}
                    />
                    <NumberField
                      label={t('settings.waha_typing_min')}
                      value={wahaSettings.typingMinSeconds}
                      min={0}
                      max={60}
                      suffix={t('settings.waha_seconds')}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, typingMinSeconds: value })}
                    />
                    <NumberField
                      label={t('settings.waha_typing_max')}
                      value={wahaSettings.typingMaxSeconds}
                      min={0}
                      max={60}
                      suffix={t('settings.waha_seconds')}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, typingMaxSeconds: value })}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{t('settings.waha_delays_hint')}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('settings.waha_section_caps')}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <NumberField
                      label={t('settings.waha_max_per_hour')}
                      value={wahaSettings.maxPerHour}
                      min={1}
                      max={1000}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, maxPerHour: value })}
                    />
                    <NumberField
                      label={t('settings.waha_max_per_day')}
                      value={wahaSettings.maxPerDay}
                      min={1}
                      max={10000}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, maxPerDay: value })}
                    />
                    <NumberField
                      label={t('settings.waha_warmup_start')}
                      value={wahaSettings.warmupStartPerDay}
                      min={1}
                      max={10000}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, warmupStartPerDay: value })}
                    />
                    <NumberField
                      label={t('settings.waha_warmup_step')}
                      value={wahaSettings.warmupStepPerDay}
                      min={0}
                      max={10000}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, warmupStepPerDay: value })}
                    />
                    <NumberField
                      label={t('settings.waha_max_attempts')}
                      value={wahaSettings.maxAttempts}
                      min={1}
                      max={10}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, maxAttempts: value })}
                    />
                    <NumberField
                      label={t('settings.waha_conversation_window')}
                      value={wahaSettings.conversationWindowHours}
                      min={0}
                      max={720}
                      suffix={t('settings.waha_hours')}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, conversationWindowHours: value })}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{t('settings.waha_caps_hint')}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('settings.waha_section_quiet')}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <NumberField
                      label={t('settings.waha_quiet_start')}
                      value={wahaSettings.quietHoursStart}
                      min={0}
                      max={23}
                      suffix={t('settings.waha_hour')}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, quietHoursStart: value })}
                    />
                    <NumberField
                      label={t('settings.waha_quiet_end')}
                      value={wahaSettings.quietHoursEnd}
                      min={0}
                      max={23}
                      suffix={t('settings.waha_hour')}
                      onChange={(value) => setWahaSettings({ ...wahaSettings, quietHoursEnd: value })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('settings.waha_timezone')}
                      </label>
                      <input
                        type="text"
                        value={wahaSettings.timezone ?? ''}
                        onChange={(e) => setWahaSettings({ ...wahaSettings, timezone: e.target.value })}
                        placeholder="Europe/Amsterdam"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{t('settings.waha_quiet_hint')}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('settings.waha_country_code')}
                    </label>
                    <input
                      type="text"
                      value={wahaSettings.defaultCountryCode ?? ''}
                      onChange={(e) => setWahaSettings({ ...wahaSettings, defaultCountryCode: e.target.value })}
                      placeholder="31"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">{t('settings.waha_country_code_hint')}</p>
                  </div>
                </div>

                {/* Deployment-only values: shown for transparency, read-only (restart-bound) */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t('settings.waha_section_transport')}
                  </p>
                  <dl className="grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-gray-700">{t('settings.waha_connect_timeout')}</dt>
                      <dd>{wahaSettings.connectTimeoutMillis ?? '—'} ms</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-700">{t('settings.waha_read_timeout')}</dt>
                      <dd>{wahaSettings.readTimeoutMillis ?? '—'} ms</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-gray-500">{t('settings.waha_transport_hint')}</p>
                  <p className="mt-1 text-xs text-gray-500">{t('settings.waha_worker_poll_moved')}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSaveWaha}
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50"
              >
                {loading ? t('common.saving') : t('common.save')}
              </button>
              <button
                onClick={handleTestWaha}
                disabled={testingWaha}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition disabled:opacity-50"
              >
                {testingWaha ? t('settings.waha_testing') : t('settings.waha_test')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

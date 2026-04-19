'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAppName } from '@/lib/AppNameContext';
import { useDateFormat, DATE_FORMAT_PRESETS, DEFAULT_DATE_FORMAT } from '@/lib/DateFormatContext';

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

export default function SettingsPage() {
  const { t } = useTranslation();
  const { appName, setAppName, refreshAppName } = useAppName();
  const { setDateFormat } = useDateFormat();
  const [activeTab, setActiveTab] = useState<'general' | 'mail' | 'document' | 'billing'>('general');
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
  const [billingScheduler, setBillingScheduler] = useState({ enabled: true, cron: '0 0 2 * * *' });
  const [runningBillingJob, setRunningBillingJob] = useState(false);
  const [superAdminSubdomain, setSuperAdminSubdomain] = useState('admin');
  const [superAdminSubdomainError, setSuperAdminSubdomainError] = useState('');
  const [dateFormatInput, setDateFormatInput] = useState(DEFAULT_DATE_FORMAT);

  useEffect(() => {
    fetchMailServerConfig();
    fetchAppBaseUrl();
    fetchAppBaseDomain();
    fetchTenantFieldConfig();
    fetchMinioConfig();
    fetchBillingSchedulerConfig();
    fetchSuperAdminSubdomain();
    fetchDateFormat();
  }, []);

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

  const fetchBillingSchedulerConfig = async () => {
    try {
      const response = await fetch('/api/configurations/billing-scheduler');
      if (response.ok) {
        const data = await response.json();
        setBillingScheduler({ enabled: data.enabled, cron: data.cron || '0 0 2 * * *' });
      }
    } catch (error) {
      console.error('Failed to fetch billing scheduler config:', error);
    }
  };

  const handleSaveBillingScheduler = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/configurations/billing-scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billingScheduler),
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

  const handleRunBillingNow = async () => {
    setRunningBillingJob(true);
    setMessage('');
    try {
      const response = await fetch('/api/configurations/billing-scheduler/run', {
        method: 'POST',
      });
      if (response.ok) {
        setMessage(t('settings.billing_run_success'));
      } else {
        setMessage(t('settings.billing_run_error'));
      }
    } catch {
      setMessage(t('settings.billing_run_error'));
    } finally {
      setRunningBillingJob(false);
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
          aria-selected={activeTab === 'billing'}
          onClick={() => setActiveTab('billing')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'billing'
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('settings.billing_scheduler')}
        </button>
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
      {activeTab === 'billing' && (
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 max-w-3xl">
          <h2 className="text-xl md:text-2xl font-bold text-charcoal mb-2">{t('settings.billing_scheduler_title')}</h2>
          <p className="text-sm text-gray-500 mb-6">{t('settings.billing_scheduler_description')}</p>

          <div className="space-y-6">
            {/* Enable / disable toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-700">{t('settings.billing_scheduler_enabled_label')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('settings.billing_scheduler_enabled_description')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={billingScheduler.enabled}
                onClick={() => setBillingScheduler(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  billingScheduler.enabled ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    billingScheduler.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Cron expression */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.billing_scheduler_cron_label')}</label>
              <p className="text-xs text-gray-500 mb-2">{t('settings.billing_scheduler_cron_description')}</p>
              <input
                type="text"
                value={billingScheduler.cron}
                onChange={(e) => setBillingScheduler(prev => ({ ...prev, cron: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition font-mono text-sm"
                placeholder="0 0 2 * * *"
              />
            </div>

            {/* Preset shortcuts */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">{t('settings.billing_scheduler_presets')}</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: t('settings.billing_preset_daily_2am'), cron: '0 0 2 * * *' },
                  { label: t('settings.billing_preset_daily_midnight'), cron: '0 0 0 * * *' },
                  { label: t('settings.billing_preset_weekly_monday'), cron: '0 0 2 * * MON' },
                  { label: t('settings.billing_preset_monthly_1st'), cron: '0 0 2 1 * *' },
                ].map(preset => (
                  <button
                    key={preset.cron}
                    type="button"
                    onClick={() => setBillingScheduler(prev => ({ ...prev, cron: preset.cron }))}
                    className={`px-3 py-1.5 text-xs rounded-md border transition ${
                      billingScheduler.cron === preset.cron
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
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

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSaveBillingScheduler}
                disabled={loading || runningBillingJob}
                className="px-6 py-3 bg-emerald-700 text-white rounded-lg font-semibold hover:bg-emerald-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('settings.saving') : t('settings.save')}
              </button>
              <button
                onClick={handleRunBillingNow}
                disabled={loading || runningBillingJob}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {runningBillingJob ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {t('settings.billing_running')}
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('settings.billing_run_now')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

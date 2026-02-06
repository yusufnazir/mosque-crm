'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

interface MailServerConfig {
  host: string;
  username: string;
  password: string;
  projectUuid: string;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'mail' | 'document'>('mail');
  const [config, setConfig] = useState<MailServerConfig>({
    host: '',
    username: '',
    password: '',
    projectUuid: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchMailServerConfig();
  }, []);

  const fetchMailServerConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/configurations/mail-server', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch mail server config:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/configurations/mail-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/configurations/mail-server/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-charcoal mb-8">{t('settings.title')}</h1>

      <div className="flex gap-4 mb-6">
        <button
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
          onClick={() => setActiveTab('document')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            activeTab === 'document'
              ? 'bg-emerald-700 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('settings.document_management')}
        </button>
      </div>

      {activeTab === 'mail' && (
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl">
          <h2 className="text-2xl font-bold text-charcoal mb-6">{t('settings.mail_server_settings')}</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.host')}
              </label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('settings.host_placeholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.username')}
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                placeholder={t('settings.username_placeholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.password')}
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.project_uuid')}
              </label>
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

            <div className="flex gap-4">
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
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-3xl">
          <h2 className="text-2xl font-bold text-charcoal mb-6">{t('settings.document_management')}</h2>
          <p className="text-gray-600">{t('settings.document_coming_soon')}</p>
        </div>
      )}
    </div>
  );
}

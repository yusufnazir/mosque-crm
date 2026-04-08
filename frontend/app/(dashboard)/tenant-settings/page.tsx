'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAppName } from '@/lib/AppNameContext';

interface TenantSettingField {
  id: number;
  fieldKey: string;
  label: string;
  category: string;
  tenantEditable: boolean;
  displayOrder: number;
  currentValue: string | null;
}

export default function TenantSettingsPage() {
  const { t } = useTranslation();
  const { setAppName } = useAppName();
  const [fields, setFields] = useState<TenantSettingField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchTenantSettings();
  }, []);

  const fetchTenantSettings = async () => {
    try {
      const response = await fetch('/api/tenant-settings');
      if (response.ok) {
        const data: TenantSettingField[] = await response.json();
        setFields(data);
        const vals: Record<string, string> = {};
        for (const field of data) {
          vals[field.fieldKey] = field.currentValue || '';
        }
        setValues(vals);
      }
    } catch (error) {
      console.error('Failed to fetch tenant settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/tenant-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

      {categories.map(cat => {
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
    </div>
  );
}

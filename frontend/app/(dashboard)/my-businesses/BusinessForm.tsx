'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { countryApi, CountryDTO } from '@/lib/countryApi';
import CategoryChipPicker from '@/components/CategoryChipPicker';
import { useBusinessCategories } from '@/lib/useBusinessCategories';

export type BusinessFormValues = {
  name: string;
  category: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  facebookUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  whatsappUrl: string;
  city: string;
  country: string;
};

export const emptyBusinessForm: BusinessFormValues = {
  name: '',
  category: '',
  description: '',
  email: '',
  phone: '',
  website: '',
  facebookUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  linkedinUrl: '',
  whatsappUrl: '',
  city: '',
  country: '',
};

type Props = {
  initial?: BusinessFormValues;
  saving: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: BusinessFormValues) => Promise<void>;
};

const SOCIAL_FIELDS: Array<{ key: keyof BusinessFormValues; labelKey: string; placeholder: string }> = [
  { key: 'facebookUrl', labelKey: 'business_directory.fields.facebook', placeholder: 'https://facebook.com/…' },
  { key: 'instagramUrl', labelKey: 'business_directory.fields.instagram', placeholder: 'https://instagram.com/…' },
  { key: 'tiktokUrl', labelKey: 'business_directory.fields.tiktok', placeholder: 'https://tiktok.com/@…' },
  { key: 'youtubeUrl', labelKey: 'business_directory.fields.youtube', placeholder: 'https://youtube.com/@…' },
  { key: 'linkedinUrl', labelKey: 'business_directory.fields.linkedin', placeholder: 'https://linkedin.com/company/…' },
  { key: 'whatsappUrl', labelKey: 'business_directory.fields.whatsapp', placeholder: 'https://wa.me/…' },
];

export default function BusinessForm({ initial, saving, submitLabel, onCancel, onSubmit }: Props) {
  const { t, language } = useTranslation();
  const { isKnown } = useBusinessCategories();
  const [form, setForm] = useState<BusinessFormValues>(initial ?? emptyBusinessForm);
  const [countries, setCountries] = useState<CountryDTO[]>([]);
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  useEffect(() => {
    countryApi.getAll(language === 'nl' ? 'nl' : 'en')
      .then((data) => setCountries(Array.isArray(data) ? data : []))
      .catch(() => setCountries([]));
  }, [language]);

  const update = (field: keyof BusinessFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'name' && nameError) setNameError('');
    if (field === 'email' && emailError) setEmailError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setNameError(t('my_businesses.form.name_required'));
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setEmailError(t('my_businesses.form.email_invalid'));
      return;
    }
    await onSubmit({
      ...form,
      name: form.name.trim(),
      category: isKnown(form.category) ? form.category.trim() : '',
      description: form.description.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      website: form.website.trim(),
      facebookUrl: form.facebookUrl.trim(),
      instagramUrl: form.instagramUrl.trim(),
      tiktokUrl: form.tiktokUrl.trim(),
      youtubeUrl: form.youtubeUrl.trim(),
      linkedinUrl: form.linkedinUrl.trim(),
      whatsappUrl: form.whatsappUrl.trim(),
      city: form.city.trim(),
      country: form.country.trim(),
    });
  };

  const fieldClass =
    'w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6 space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{t('my_businesses.form.section_details')}</h2>
          <p className="text-sm text-stone-500 mt-0.5">{t('my_businesses.form.section_details_hint')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            {t('business_directory.fields.name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className={fieldClass}
            autoFocus
          />
          {nameError && <p className="text-sm text-red-600 mt-1">{nameError}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            {t('business_directory.fields.category')}
          </label>
          <p className="text-sm text-stone-500 mb-2">{t('my_businesses.form.category_hint')}</p>
          <CategoryChipPicker
            value={isKnown(form.category) ? form.category : ''}
            onChange={(category) => update('category', category)}
          />
          {form.category && !isKnown(form.category) && (
            <p className="text-xs text-amber-700 mt-2">{form.category}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            {t('business_directory.fields.description')}
          </label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={4}
            placeholder={t('my_businesses.form.description_placeholder')}
            className={`${fieldClass} resize-y`}
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-stone-100 pt-6">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{t('my_businesses.form.section_contact')}</h2>
          <p className="text-sm text-stone-500 mt-0.5">{t('my_businesses.form.section_contact_hint')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('business_directory.fields.email')}
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={fieldClass}
            />
            {emailError && <p className="text-sm text-red-600 mt-1">{emailError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('business_directory.fields.phone')}
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            {t('business_directory.fields.website')}
          </label>
          <input
            type="text"
            value={form.website}
            onChange={(e) => update('website', e.target.value)}
            placeholder="https://"
            className={fieldClass}
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-stone-100 pt-6">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{t('my_businesses.form.section_social')}</h2>
          <p className="text-sm text-stone-500 mt-0.5">{t('my_businesses.form.section_social_hint')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SOCIAL_FIELDS.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {t(field.labelKey)}
              </label>
              <input
                type="text"
                value={form[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={fieldClass}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t border-stone-100 pt-6">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{t('my_businesses.form.section_location')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('business_directory.fields.city')}
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('business_directory.fields.country')}
            </label>
            <select
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
              className={fieldClass}
            >
              <option value="">{t('my_businesses.form.country_placeholder')}</option>
              {countries.map((c) => (
                <option key={c.isoCode} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 border-t border-stone-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-stone-300 rounded-lg text-sm text-stone-700 hover:bg-stone-50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50"
        >
          {saving ? t('common.saving') : submitLabel}
        </button>
      </div>
    </form>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { distributionApi, DistributionEvent } from '@/lib/distributionApi';
import {
  formatParcelUnitLabel,
  normalizeParcelWeightUnit,
  ParcelWeightUnit,
} from '@/lib/distributionParcelUnit';
import { TabSectionHeader } from '@/components/ResponsiveEventLayout';
import ToastNotification from '@/components/ToastNotification';

const INPUT =
  'w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500';

interface Props {
  event: DistributionEvent;
  eventClosed: boolean;
  onSaved: (updated: DistributionEvent) => void;
}

export default function EventParcelConfigTab({ event, eventClosed, onSaved }: Props) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(event.parcelKgPerUnit ?? 1);
  const [unit, setUnit] = useState<ParcelWeightUnit>(normalizeParcelWeightUnit(event.parcelWeightUnit));
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setAmount(event.parcelKgPerUnit ?? 1);
    setUnit(normalizeParcelWeightUnit(event.parcelWeightUnit));
  }, [event.id, event.parcelKgPerUnit, event.parcelWeightUnit]);

  const dirty =
    amount !== (event.parcelKgPerUnit ?? 1) ||
    unit !== normalizeParcelWeightUnit(event.parcelWeightUnit);

  const handleSave = async () => {
    if (amount <= 0) {
      setToast({ message: t('distribution.parcel_unit_amount_invalid'), type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const updated = await distributionApi.updateEvent(event.id, {
        year: event.year,
        name: event.name,
        eventDate: event.eventDate ?? undefined,
        location: event.location ?? undefined,
        eventType: event.eventType,
        memberCapacity: event.memberCapacity,
        nonMemberCapacity: event.nonMemberCapacity,
        parcelKgPerUnit: amount,
        parcelWeightUnit: unit,
      });
      setToast({ message: t('distribution.parcel_config_saved'), type: 'success' });
      onSaved(updated);
    } catch {
      setToast({ message: t('distribution.parcel_config_save_error'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <TabSectionHeader title={t('distribution.config')} subtitle={t('distribution.parcel_config_desc')} />

      <div className="bg-white rounded-lg shadow p-4 sm:p-6 max-w-lg">
        <h3 className="text-sm font-semibold text-stone-900 mb-1">{t('distribution.parcel_unit_title')}</h3>
        <p className="text-sm text-stone-500 mb-4">{t('distribution.parcel_unit_desc')}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('distribution.parcel_unit_amount')}
            </label>
            <input
              type="number"
              min={0.001}
              step={0.001}
              disabled={eventClosed}
              value={amount}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {t('distribution.parcel_unit_measure')}
            </label>
            <select
              disabled={eventClosed}
              value={unit}
              onChange={e => setUnit(e.target.value as ParcelWeightUnit)}
              className={INPUT}
            >
              <option value="KG">{t('distribution.parcel_unit_kg')}</option>
              <option value="LB">{t('distribution.parcel_unit_lb')}</option>
            </select>
          </div>
        </div>

        <p className="mt-4 text-sm text-stone-600">
          {t('distribution.parcel_unit_preview', {
            unit: formatParcelUnitLabel(amount > 0 ? amount : 1, unit, t),
          })}
        </p>

        {!eventClosed && (
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-100">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => {
                setAmount(event.parcelKgPerUnit ?? 1);
                setUnit(normalizeParcelWeightUnit(event.parcelWeightUnit));
              }}
              className="px-3 py-2 text-sm text-stone-600 hover:text-stone-800 disabled:opacity-40"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={!dirty || saving || amount <= 0}
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        )}

        {eventClosed && (
          <p className="mt-4 text-sm text-amber-700">{t('distribution.parcel_config_closed_hint')}</p>
        )}
      </div>
    </div>
  );
}

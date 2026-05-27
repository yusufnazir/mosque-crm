'use client';

import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  computeAvailableParcelsFromMeat,
  formatParcelWeightTotal,
  normalizeParcelWeightUnit,
  parcelWeightInKg,
  ParcelWeightUnit,
} from '@/lib/distributionParcelUnit';

export interface RegistrationSummaryStats {
  totalParcels: number;
  distributedParcels: number;
  remainingParcels: number;
  totalRegistrations?: number;
  collectedRegistrations?: number;
}

interface Props {
  stats: RegistrationSummaryStats;
  parcelKgPerUnit?: number;
  parcelWeightUnit?: ParcelWeightUnit | string;
  /** Available meat (kg) from sacrifice animals: total meat minus share entitlement. */
  availableMeatKg?: number | null;
}

export default function DistributionRegistrationSummaryCards({
  stats,
  parcelKgPerUnit = 1,
  parcelWeightUnit,
  availableMeatKg,
}: Props) {
  const { t } = useTranslation();
  const amountPerParcel = parcelKgPerUnit > 0 ? parcelKgPerUnit : 1;
  const weightUnit = normalizeParcelWeightUnit(parcelWeightUnit);

  const weightLabel = (parcels: number) =>
    formatParcelWeightTotal(parcels, amountPerParcel, weightUnit, t);

  const totalRegs = stats.totalRegistrations ?? 0;
  const collectedRegs = stats.collectedRegistrations ?? 0;

  const meatKg = availableMeatKg ?? 0;
  const supplyParcels = computeAvailableParcelsFromMeat(meatKg, amountPerParcel, weightUnit);
  const distributedKg = parcelWeightInKg(amountPerParcel, weightUnit) * stats.distributedParcels;
  const remainingMeatKg = Math.max(0, meatKg - distributedKg);
  const availableParcels = computeAvailableParcelsFromMeat(remainingMeatKg, amountPerParcel, weightUnit);
  const formatKg = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-5">
      <div className="bg-white rounded-lg shadow p-5 border border-stone-200">
        <p className="text-sm text-stone-500">{t('distribution.registrations_summary_available_parcels')}</p>
        <p
          className={`text-2xl font-bold mt-1 ${
            availableParcels > 0 ? 'text-emerald-700' : availableParcels === 0 && meatKg > 0 ? 'text-amber-600' : 'text-stone-900'
          }`}
        >
          {availableParcels}
        </p>
        <p className="text-xs text-stone-500 mt-1">
          {t('distribution.registrations_summary_available_meat_hint', { kg: formatKg(meatKg) })}
        </p>
        {stats.distributedParcels > 0 ? (
          <p className="text-xs text-stone-500 mt-0.5">
            {t('distribution.registrations_summary_available_after_distributed', {
              supply: supplyParcels,
              distributed: stats.distributedParcels,
            })}
          </p>
        ) : (
          <p className="text-xs text-stone-400 mt-1">{t('distribution.registrations_summary_available_parcels_hint')}</p>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-5 border border-stone-200">
        <p className="text-sm text-stone-500">{t('distribution.registrations_summary_planned')}</p>
        <p className="text-2xl font-bold text-stone-900 mt-1">{stats.totalParcels}</p>
        {stats.totalParcels > 0 && (
          <p className="text-xs text-stone-500 mt-1">
            {t('distribution.registrations_summary_weight', { weight: weightLabel(stats.totalParcels) })}
          </p>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-5 border border-stone-200">
        <p className="text-sm text-stone-500">{t('distribution.registrations_summary_distributed')}</p>
        <p className="text-2xl font-bold text-blue-700 mt-1">{stats.distributedParcels}</p>
        {stats.distributedParcels > 0 && (
          <p className="text-xs text-stone-500 mt-1">
            {t('distribution.registrations_summary_weight', { weight: weightLabel(stats.distributedParcels) })}
          </p>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-5 border border-stone-200">
        <p className="text-sm text-stone-500">{t('distribution.registrations_summary_remaining')}</p>
        <p
          className={`text-2xl font-bold mt-1 ${
            stats.remainingParcels <= 0 && stats.totalParcels > 0 ? 'text-emerald-700' : 'text-amber-600'
          }`}
        >
          {stats.remainingParcels}
        </p>
        {stats.remainingParcels > 0 && (
          <p className="text-xs text-stone-500 mt-1">
            {t('distribution.registrations_summary_weight', { weight: weightLabel(stats.remainingParcels) })}
          </p>
        )}
        <p className="text-xs text-stone-400 mt-1">{t('distribution.registrations_summary_remaining_hint')}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-5 border border-stone-200">
        <p className="text-sm text-stone-500">{t('distribution.registrations_summary_recipients')}</p>
        <p className="text-2xl font-bold text-stone-900 mt-1">
          {collectedRegs} / {totalRegs}
        </p>
        <p className="text-xs text-stone-400 mt-1">{t('distribution.registrations_summary_collected_hint')}</p>
      </div>
    </div>
  );
}

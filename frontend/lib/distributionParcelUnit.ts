export type ParcelWeightUnit = 'KG' | 'LB';

const LB_TO_KG = 0.45359237;

/** Weight of one parcel in kg (sacrifice meat is tracked in kg). */
export function parcelWeightInKg(amount: number, unit: ParcelWeightUnit): number {
  const value = amount > 0 ? amount : 1;
  return unit === 'LB' ? value * LB_TO_KG : value;
}

/** Parcels that fit in available sacrifice meat given parcel size config. */
export function computeAvailableParcelsFromMeat(
  availableMeatKg: number,
  amountPerParcel: number,
  unit: ParcelWeightUnit,
): number {
  const kgPerParcel = parcelWeightInKg(amountPerParcel, unit);
  if (kgPerParcel <= 0 || availableMeatKg <= 0) return 0;
  return Math.floor(availableMeatKg / kgPerParcel);
}

export function normalizeParcelWeightUnit(unit?: string | null): ParcelWeightUnit {
  return unit?.toUpperCase() === 'LB' ? 'LB' : 'KG';
}

export function formatParcelUnitLabel(
  amount: number,
  unit: ParcelWeightUnit,
  t: (key: string) => string,
): string {
  const value = amount > 0 ? amount : 1;
  const formatted = Number.isInteger(value) ? String(value) : value.toLocaleString(undefined, { maximumFractionDigits: 3 });
  if (unit === 'LB') {
    return `${formatted} ${t('distribution.parcel_unit_lb')}`;
  }
  return `${formatted} ${t('distribution.parcel_unit_kg')}`;
}

export function formatParcelWeightTotal(
  parcelCount: number,
  amountPerParcel: number,
  unit: ParcelWeightUnit,
  t: (key: string) => string,
): string {
  const total = parcelCount * (amountPerParcel > 0 ? amountPerParcel : 1);
  return formatParcelUnitLabel(total, unit, t);
}

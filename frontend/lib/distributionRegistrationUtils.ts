import { DistributionRegistrationType } from '@/lib/distributionApi';

export type SoftLimitStatus = 'none' | 'ok' | 'at' | 'over';

export function getSoftLimitStatus(
  registrationCount: number,
  softLimit?: number | null,
): SoftLimitStatus {
  if (softLimit == null) return 'none';
  if (registrationCount > softLimit) return 'over';
  if (registrationCount >= softLimit) return 'at';
  return 'ok';
}

export function isAtOrOverSoftLimit(registrationCount: number, softLimit?: number | null): boolean {
  const status = getSoftLimitStatus(registrationCount, softLimit);
  return status === 'at' || status === 'over';
}

export function getTypeSoftLimitStatus(type: Pick<DistributionRegistrationType, 'registrationCount' | 'softLimit'>): SoftLimitStatus {
  return getSoftLimitStatus(type.registrationCount, type.softLimit);
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  distributionApi,
  DistributionEvent,
  DistributionRegistration,
  DistributionRegistrationType,
  ParcelDistribution,
  RegistrationFulfillmentMode,
} from '@/lib/distributionApi';
import {
  eventFeatureApi,
  EventKind,
  EventMemberGroup,
  EventMemberGroupMember,
  EventResourceAssignment,
  EventSacrificeAnimal,
} from '@/lib/eventFeatureApi';
import { downloadExcel, downloadPdf } from '@/lib/reportExport';
import { formatParcelUnitLabel, normalizeParcelWeightUnit } from '@/lib/distributionParcelUnit';

type ReportDef = {
  id: string;
  title: string;
  description?: string;
  recordCount: number;
  headers: string[];
  rows: string[][];
  iconClass: string;
};

function ReportIcon({ className }: { className: string }) {
  return (
    <span
      className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </span>
  );
}

function fulfillmentLabel(mode: RegistrationFulfillmentMode, t: (k: string) => string) {
  if (mode === 'QUEUE') return t('distribution.fulfillment_queue');
  if (mode === 'ADHOC') return t('distribution.fulfillment_adhoc');
  return t('distribution.fulfillment_manual');
}

function recipientTypeLabel(type: string, t: (k: string) => string) {
  if (type === 'REGISTRATION') return t('distribution.parcel_recipient');
  if (type === 'MEMBER') return t('distribution.member');
  return t('distribution.non_member');
}

interface Props {
  event: DistributionEvent;
  distributions: ParcelDistribution[];
  registrations: DistributionRegistration[];
}

export default function DistributionEventSummaryReports({
  event,
  distributions,
  registrations,
}: Props) {
  const { t } = useTranslation();
  const eventKind: EventKind = 'DISTRIBUTION';
  const eventName = event.name || 'event';
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ReportDef[]>([]);

  const buildReports = useCallback(async () => {
    const amount = event.parcelKgPerUnit ?? 1;
    const unit = normalizeParcelWeightUnit(event.parcelWeightUnit);
    const parcelLabel = formatParcelUnitLabel(amount, unit, t);

    const [
      registrationTypes,
      sacrificeAnimals,
      sacrificeSummary,
      assignments,
      groups,
    ] = await Promise.all([
      distributionApi.listRegistrationTypes(event.id),
      eventFeatureApi.listSacrificeAnimals(eventKind, event.id).catch(() => [] as EventSacrificeAnimal[]),
      eventFeatureApi.getSacrificeSummary(eventKind, event.id).catch(() => null),
      eventFeatureApi.listAssignments(eventKind, event.id).catch(() => [] as EventResourceAssignment[]),
      eventFeatureApi.listMemberGroups(eventKind, event.id).catch(() => [] as EventMemberGroup[]),
    ]);

    const groupMemberRows: string[][] = [];
    if (groups.length > 0) {
      const memberLists = await Promise.all(
        groups.map(g =>
          eventFeatureApi.listGroupMembers(eventKind, event.id, g.id).then(members => ({ g, members })),
        ),
      );
      for (const { g, members } of memberLists) {
        for (const m of members) {
          groupMemberRows.push([
            g.name,
            m.personName || String(m.personId),
            m.eventRoleName || '',
          ]);
        }
      }
    }

    const types = Array.isArray(registrationTypes) ? registrationTypes : [];
    const animals = Array.isArray(sacrificeAnimals) ? sacrificeAnimals : [];
    const assignList = Array.isArray(assignments) ? assignments : [];

    const shareRows: string[][] = [];
    for (const a of animals) {
      for (const s of a.shares || []) {
        shareRows.push([
          a.animalNumber,
          a.size,
          s.personName,
          s.member ? t('sacrifice_animals.member') : t('sacrifice_animals.external'),
          String(s.shareCount),
          s.meatEntitlementKg != null ? String(s.meatEntitlementKg) : '',
          s.entitlementReceived ? t('sacrifice_animals.entitlement_received') : t('sacrifice_animals.entitlement_pending'),
        ]);
      }
    }

    const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

    const defs: ReportDef[] = [
      {
        id: 'config',
        title: t('distribution.report_event_config'),
        description: t('distribution.report_event_config_desc'),
        recordCount: 1,
        iconClass: 'bg-stone-100 text-stone-700',
        headers: [
          t('distribution.event_name'),
          t('distribution.event_year'),
          t('distribution.parcel_unit_title'),
        ],
        rows: [[event.name, String(event.year), parcelLabel]],
      },
    ];

    if (sacrificeSummary) {
      defs.push({
        id: 'sacrifice-summary',
        title: t('distribution.report_sacrifice_summary'),
        recordCount: 1,
        iconClass: 'bg-orange-100 text-orange-800',
        headers: [
          t('sacrifice_animals.summary_total_meat'),
          t('sacrifice_animals.summary_share_entitlement'),
          t('sacrifice_animals.summary_available_meat'),
          t('sacrifice_animals.summary_distributed_parcels'),
        ],
        rows: [
          [
            `${fmt(sacrificeSummary.totalMeatKg)} kg`,
            `${fmt(sacrificeSummary.totalShareEntitlementKg)} kg`,
            `${fmt(sacrificeSummary.availableMeatKg)} kg`,
            String(sacrificeSummary.totalDistributedParcels),
          ],
        ],
      });
    }

    defs.push(
      {
        id: 'sacrifice-animals',
        title: t('distribution.report_sacrifice_animals'),
        recordCount: animals.length,
        iconClass: 'bg-orange-100 text-orange-800',
        headers: [
          t('sacrifice_animals.number'),
          t('sacrifice_animals.size'),
          t('sacrifice_animals.shares'),
          t('sacrifice_animals.weight'),
          t('sacrifice_animals.meat'),
          t('sacrifice_animals.entitlement_total'),
        ],
        rows: animals.map(a => [
          a.animalNumber,
          a.size,
          `${a.allocatedShares}/${a.maxShares}`,
          a.weightKg != null ? String(a.weightKg) : '',
          a.meatKg != null ? String(a.meatKg) : '',
          a.totalMeatEntitlementKg != null ? String(a.totalMeatEntitlementKg) : '',
        ]),
      },
      {
        id: 'sacrifice-shares',
        title: t('distribution.report_sacrifice_shares'),
        recordCount: shareRows.length,
        iconClass: 'bg-orange-50 text-orange-700',
        headers: [
          t('sacrifice_animals.number'),
          t('sacrifice_animals.size'),
          t('sacrifice_animals.person'),
          t('distribution.recipient_type'),
          t('sacrifice_animals.share_count'),
          t('sacrifice_animals.meat_entitlement_kg'),
          t('distribution.report_entitlement_status'),
        ],
        rows: shareRows,
      },
      {
        id: 'registration-types',
        title: t('distribution.report_registration_types'),
        recordCount: types.length,
        iconClass: 'bg-violet-100 text-violet-800',
        headers: [
          t('distribution.registration_type_name'),
          t('distribution.fulfillment_mode'),
          t('distribution.default_planned_parcels'),
          t('distribution.soft_limit'),
          t('distribution.registration_count'),
        ],
        rows: types.map((ty: DistributionRegistrationType) => [
          ty.name,
          fulfillmentLabel(ty.fulfillmentMode, t),
          String(ty.defaultPlannedParcels),
          ty.softLimit != null ? String(ty.softLimit) : '—',
          String(ty.registrationCount),
        ]),
      },
      {
        id: 'registrations',
        title: t('distribution.report_registrations_list'),
        recordCount: registrations.length,
        iconClass: 'bg-amber-100 text-amber-700',
        headers: [
          t('distribution.distribution_number'),
          t('distribution.recipient_name'),
          t('distribution.registration_type_name'),
          t('distribution.recipient_type'),
          t('distribution.planned_parcels'),
          t('distribution.distributed_parcels'),
          t('distribution.event_status'),
        ],
        rows: registrations.map(r => [
          r.distributionNumber || '',
          r.displayName,
          r.registrationTypeName,
          r.member ? t('distribution.member') : t('distribution.non_member'),
          String(r.plannedParcelCount),
          String(r.distributedParcelCount),
          r.status,
        ]),
      },
      {
        id: 'uncollected',
        title: t('distribution.report_uncollected'),
        recordCount: registrations.filter(r => r.status !== 'COLLECTED').length,
        iconClass: 'bg-red-100 text-red-700',
        headers: [
          t('distribution.recipient_name'),
          t('distribution.registration_type_name'),
          t('distribution.distribution_number'),
          t('distribution.planned_parcels'),
          t('distribution.event_status'),
        ],
        rows: registrations
          .filter(r => r.status !== 'COLLECTED')
          .map(r => [
            r.displayName,
            r.registrationTypeName,
            r.distributionNumber || '',
            String(Math.max(0, r.plannedParcelCount - r.distributedParcelCount)),
            r.status,
          ]),
      },
      {
        id: 'distribution-log',
        title: t('distribution.report_distribution_log'),
        recordCount: distributions.length,
        iconClass: 'bg-emerald-100 text-emerald-700',
        headers: [
          t('distribution.recipient'),
          t('distribution.recipient_type'),
          t('distribution.quantity'),
          t('distribution.distributed_at'),
          t('distribution.distributed_by'),
        ],
        rows: distributions.map(d => [
          d.recipientName || '',
          recipientTypeLabel(d.recipientType, t),
          String(d.parcelCount),
          d.distributedAt ? new Date(d.distributedAt).toLocaleString() : '',
          d.distributedBy || '',
        ]),
      },
      {
        id: 'resources',
        title: t('distribution.report_resource_assignments'),
        recordCount: assignList.length,
        iconClass: 'bg-sky-100 text-sky-800',
        headers: [
          t('event_features.assignments.resource'),
          t('event_features.assignments.assigned_to'),
          t('distribution.event_status'),
          t('event_features.assignments.assigned_at'),
          t('distribution.report_completed_at'),
        ],
        rows: assignList.map(a => [
          a.resourceName || String(a.resourceId),
          a.personName || String(a.personId),
          a.status,
          a.assignedAt ? new Date(a.assignedAt).toLocaleString() : '',
          a.completedAt ? new Date(a.completedAt).toLocaleString() : '',
        ]),
      },
      {
        id: 'member-groups',
        title: t('distribution.report_member_groups'),
        recordCount: groupMemberRows.length,
        iconClass: 'bg-indigo-100 text-indigo-800',
        headers: [
          t('event_features.member_groups.group_name'),
          t('event_features.assignments.member'),
          t('event_features.member_groups.select_role'),
        ],
        rows: groupMemberRows,
      },
    );

    setReports(defs);
  }, [event, distributions, registrations, t]);

  useEffect(() => {
    setLoading(true);
    buildReports()
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [buildReports]);

  if (loading) {
    return <p className="text-sm text-stone-500 py-4">{t('common.loading')}</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {reports.map(report => {
        const disabled = report.recordCount === 0 && report.id !== 'config';
        const pdfTitle = `${eventName} — ${report.title}`;
        const fileBase = `${eventName}-${report.id}`;
        return (
          <div
            key={report.id}
            className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 border border-stone-200 rounded-lg ${disabled ? 'opacity-40' : ''}`}
          >
            <ReportIcon className={report.iconClass} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800">{report.title}</p>
              {report.description && (
                <p className="text-xs text-stone-500 mt-0.5">{report.description}</p>
              )}
              <p className="text-xs text-stone-400">
                {report.recordCount} {t('distribution.records')}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  downloadExcel(`${fileBase}.xlsx`, report.title, report.headers, report.rows)
                }
                className="flex-1 sm:flex-none px-3 py-2 text-xs font-medium bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Excel
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => downloadPdf(`${fileBase}.pdf`, pdfTitle, report.headers, report.rows)}
                className="flex-1 sm:flex-none px-3 py-2 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                PDF
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

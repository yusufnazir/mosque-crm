'use client';

import { useEffect, useRef, useState } from 'react';
import { memberApi, MemberAccountResult } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import ToastNotification from '@/components/ToastNotification';
import { useAuth } from '@/lib/auth/AuthContext';

const PAGE_SIZE = 50;
const ACCOUNT_STATUSES: MemberAccountResult['status'][] = [
  'ELIGIBLE_EMAIL', 'ELIGIBLE_WHATSAPP', 'ALREADY_HAS_ACCOUNT', 'INACTIVE',
  'NO_VALID_CONTACT', 'CONTACT_IN_USE', 'NOT_FOUND',
  'CREATED_EMAIL', 'CREATED_WHATSAPP', 'CREATED_NO_NOTIFICATION',
  'PLAN_LIMIT_REACHED', 'FAILED',
];

const eligible = (member: MemberAccountResult) =>
  member.status === 'ELIGIBLE_EMAIL' || member.status === 'ELIGIBLE_WHATSAPP';
const created = (member: MemberAccountResult) => member.status.startsWith('CREATED_');

interface Props {
  organizationName: string;
}

export default function MemberAccountsPage() {
  const { t } = useTranslation();
  const { user, can, isSuperAdmin, selectedOrganization, activeOrganizationName } = useAuth();
  const organizationId = isSuperAdmin ? selectedOrganization?.id : user?.organizationId;
  const allowed = (isSuperAdmin || user?.roles.includes('ADMIN'))
    && can('member_account.view') && can('member_account.manage');

  return (
    <div className="p-8">
      {!allowed ? (
        <div role="alert" className="text-red-600">{t('common.access_denied')}</div>
      ) : !organizationId ? (
        <>
          <h1 className="text-2xl font-bold text-charcoal">{t('members.bulk_accounts.title')}</h1>
          <p className="mt-4 text-gray-600">{t('members.bulk_accounts.select_organization')}</p>
        </>
      ) : (
        <MemberAccounts key={organizationId}
          organizationName={activeOrganizationName || user?.organizationName || ''} />
      )}
    </div>
  );
}

function MemberAccounts({ organizationName }: Props) {
  const { t } = useTranslation();
  const [candidates, setCandidates] = useState<MemberAccountResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pendingIds, setPendingIds] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<MemberAccountResult[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<MemberAccountResult['status'][]>([]);
  const [page, setPage] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const mounted = useRef(true);
  const submitting = useRef(false);

  useEffect(() => {
    mounted.current = true;
    memberApi.getAccountCandidates()
      .then(data => { if (mounted.current) setCandidates(data); })
      .catch(error => {
        console.error('Failed to load member account candidates:', error);
        if (mounted.current) setToast({ message: t('members.bulk_accounts.error'), type: 'error' });
      })
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, [t]);

  const filtered = candidates.filter(member =>
    (statusFilters.length === 0 || statusFilters.includes(member.status))
    && `${member.name ?? ''} ${member.username ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const eligibleIds = filtered.filter(eligible).map(member => member.personId);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, totalPages - 1));
  const rows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const toggle = (id: number) => {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createAccounts = async () => {
    if (!pendingIds?.length || submitting.current) return;
    submitting.current = true;
    const ids = pendingIds;
    setPendingIds(null);
    setRunning(true);
    setResults([]);
    setProgress({ completed: 0, total: ids.length });
    const completed: MemberAccountResult[] = [];
    try {
      // Small sequential requests keep progress visible and avoid overlapping runs.
      for (let start = 0; start < ids.length && mounted.current; start += 1) {
        const batch = await memberApi.createAccounts(ids.slice(start, start + 1));
        completed.push(...batch);
        if (!mounted.current) return;
        setResults([...completed]);
        setProgress({ completed: start + 1, total: ids.length });
        setCandidates(previous => previous.map(member =>
          batch.find(result => result.personId === member.personId) ?? member));
        setSelected(previous => new Set([...previous].filter(id =>
          !batch.some(result => result.personId === id))));
      }
      if (mounted.current) {
        const hasProblems = completed.some(member => !created(member)
          || member.status === 'CREATED_NO_NOTIFICATION');
        setToast({
          message: t(hasProblems ? 'members.bulk_accounts.completed_with_issues' : 'members.bulk_accounts.completed'),
          type: hasProblems ? 'error' : 'success',
        });
      }
    } catch (error) {
      console.error('Bulk member account creation stopped:', error);
      if (mounted.current) {
        // A lost response may follow a committed account; refresh before any retry.
        setToast({ message: t('members.bulk_accounts.stopped'), type: 'error' });
        try {
          const refreshed = await memberApi.getAccountCandidates();
          if (mounted.current) {
            setCandidates(refreshed);
            setSelected(new Set());
          }
        } catch (refreshError) {
          console.error('Failed to refresh account candidates after interruption:', refreshError);
          if (mounted.current) {
            setCandidates([]);
            setSelected(new Set());
          }
        }
      }
    } finally {
      submitting.current = false;
      if (mounted.current) setRunning(false);
    }
  };

  return (
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-charcoal">
          {t('members.bulk_accounts.title')}
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          {t('members.bulk_accounts.description', { organization: organizationName })}
        </p>
        <p className="text-sm text-gray-500 mt-2">{t('members.bulk_accounts.contact_rules')}</p>
        {toast && <ToastNotification {...toast} onClose={() => setToast(null)} />}
        {loading ? (
          <p className="py-8 text-center text-gray-500">{t('common.loading')}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 my-4">
              <input value={search} onChange={event => { setSearch(event.target.value); setPage(0); }}
                aria-label={t('members.search_members')} placeholder={t('members.search_members')}
                className="px-3 py-2 border border-gray-300 rounded-lg" />
              <details className="relative">
                <summary role="button" aria-label={t('members.bulk_accounts.filter_status')}
                  className="cursor-pointer px-3 py-2 border border-gray-300 rounded-lg">
                  {t('members.bulk_accounts.filter_status')}: {statusFilters.length === 0
                    ? t('members.bulk_accounts.all_statuses')
                    : t('members.bulk_accounts.selected_statuses', { count: String(statusFilters.length) })}
                </summary>
                <fieldset aria-label={t('members.bulk_accounts.filter_status')}
                  className="absolute z-20 mt-2 w-80 max-w-[calc(100vw-4rem)] max-h-80 overflow-auto rounded-lg border border-gray-300 bg-white p-3 shadow-lg">
                  <button type="button" onClick={() => { setStatusFilters([]); setPage(0); }}
                    className="mb-2 text-sm text-emerald-700 hover:underline">
                    {t('members.bulk_accounts.all_statuses')}
                  </button>
                  {ACCOUNT_STATUSES.map(status => (
                    <label key={status} className="flex items-start gap-2 py-2 text-sm text-gray-700">
                      <input type="checkbox" checked={statusFilters.includes(status)}
                        className="mt-1 accent-emerald-700"
                        onChange={event => {
                          const checked = event.target.checked;
                          setStatusFilters(previous => checked
                            ? [...previous, status]
                            : previous.filter(value => value !== status));
                          setPage(0);
                        }} />
                      {t(`members.bulk_accounts.status.${status}`)}
                    </label>
                  ))}
                </fieldset>
              </details>
              <span className="text-sm text-gray-600">
                {t('members.bulk_accounts.eligible_count', { count: String(eligibleIds.length) })}
              </span>
            </div>
            <p className="mb-4 text-sm text-gray-500">{t('members.bulk_accounts.filter_scope')}</p>
            {totalPages > 0 && (
              <div className="flex flex-wrap justify-between items-center gap-3 mt-4 text-sm text-gray-600">
                <span>{t('pagination.showing_range', {
                  start: String(currentPage * PAGE_SIZE + 1),
                  end: String(Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)),
                  total: String(filtered.length),
                })}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50">
                    {t('pagination.previous')}
                  </button>
                  <button onClick={() => setPage(currentPage + 1)} disabled={currentPage + 1 >= totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50">
                    {t('pagination.next')}
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="p-3">{t('members.bulk_accounts.select')}</th>
                    <th className="p-3">{t('members.member')}</th>
                    <th className="p-3">{t('members.bulk_accounts.username')}</th>
                    <th className="p-3">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(member => (
                    <tr key={member.personId}>
                      <td className="p-3">
                        <input type="checkbox" checked={selected.has(member.personId)}
                          disabled={running || !eligible(member)}
                          aria-label={t('members.bulk_accounts.select_member', {
                            name: member.name || String(member.personId),
                          })}
                          onChange={() => toggle(member.personId)} />
                      </td>
                      <td className="p-3">{member.name || `#${member.personId}`}</td>
                      <td className="p-3 break-all">{member.username || '-'}</td>
                      <td className="p-3">{t(`members.bulk_accounts.status.${member.status}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <p className="p-6 text-center text-gray-500">{t('members.no_results')}</p>}
            </div>
            {(running || results.length > 0) && (
              <div aria-live="polite" className="mt-4 text-sm text-gray-700">
                <p>{t('members.bulk_accounts.progress', {
                  completed: String(progress.completed), total: String(progress.total),
                })}</p>
                <p>{t('members.bulk_accounts.summary', {
                  created: String(results.filter(created).length),
                  email: String(results.filter(member => member.status === 'CREATED_EMAIL').length),
                  whatsapp: String(results.filter(member => member.status === 'CREATED_WHATSAPP').length),
                  failed: String(results.filter(member => member.status === 'CREATED_NO_NOTIFICATION').length),
                  skipped: String(results.filter(member => !created(member)).length),
                })}</p>
                {running && <p className="text-amber-700 mt-1">{t('members.bulk_accounts.keep_open')}</p>}
              </div>
            )}
          </>
        )}
        <div className="flex flex-wrap justify-end gap-3 mt-5">
          <button onClick={() => setPendingIds([...selected])}
            disabled={loading || running || selected.size === 0}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg disabled:opacity-50">
            {t('members.bulk_accounts.create_selected', { count: String(selected.size) })}
          </button>
          <button onClick={() => setPendingIds(eligibleIds)}
            disabled={loading || running || eligibleIds.length === 0}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg disabled:opacity-50">
            {t('members.bulk_accounts.create_all', { count: String(eligibleIds.length) })}
          </button>
        </div>
        <ConfirmDialog open={pendingIds !== null} variant="default"
          title={t('members.bulk_accounts.confirm_title')}
          message={t('members.bulk_accounts.confirm_message', {
            count: String(pendingIds?.length ?? 0), organization: organizationName,
          })}
          confirmLabel={t('members.bulk_accounts.confirm_create')} cancelLabel={t('common.cancel')}
          onConfirm={createAccounts} onCancel={() => setPendingIds(null)} />
      </div>
  );
}

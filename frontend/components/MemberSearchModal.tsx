'use client';

import { useState } from 'react';
import Button from '@/components/Button';
import { memberApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { GroupRoleDTO } from '@/lib/groupApi';

export interface MemberSearchResult {
  person: any;
  roleInGroup?: string;
  groupRoleId?: number;
  startDate?: string;
  endDate?: string;
}

interface MemberSearchModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with selected person + optional role/dates */
  onAdd: (result: MemberSearchResult) => void;
  /** Show role / start-date / end-date fields (default true) */
  showMembershipFields?: boolean;
  /** Available predefined roles for the group */
  availableRoles?: GroupRoleDTO[];
}

export default function MemberSearchModal({
  open,
  onClose,
  onAdd,
  showMembershipFields = true,
  availableRoles = [],
}: MemberSearchModalProps) {
  const { t, language: locale } = useTranslation();

  // Search state
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  // Selected person + details
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [roleInGroup, setRoleInGroup] = useState('');
  const [groupRoleId, setGroupRoleId] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSearch = async (q?: string) => {
    const val = q !== undefined ? q : query;
    setQuery(val);
    if ((val || '').trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSearched(true);
      const res = await memberApi.search(val);
      setResults(res || []);
    } catch (err: any) {
      setError(err?.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (person: any) => {
    setSelectedPerson(person);
    setRoleInGroup('');
    setGroupRoleId(undefined);
    setStartDate('');
    setEndDate('');
  };

  const handleConfirm = () => {
    if (!selectedPerson) return;
    onAdd({
      person: selectedPerson,
      roleInGroup: roleInGroup.trim() || undefined,
      groupRoleId: groupRoleId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    handleReset();
  };

  const handleBack = () => {
    setSelectedPerson(null);
  };

  const handleReset = () => {
    setQuery('');
    setResults([]);
    setError('');
    setSearched(false);
    setSelectedPerson(null);
    setRoleInGroup('');
    setGroupRoleId(undefined);
    setStartDate('');
    setEndDate('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {selectedPerson
              ? (t('groups.add_member') || 'Add Member')
              : (t('groups.search_members') || 'Search members')}
          </h3>
          <button className="text-2xl text-gray-400 hover:text-gray-600" onClick={handleClose}>×</button>
        </div>

        <div className="p-6 overflow-auto flex-1">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}

          {/* ---- Step 1: Search & select person ---- */}
          {!selectedPerson && (
            <>
              <div className="flex gap-2 mb-4">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder={t('groups.search_placeholder') || 'Search by name, email or id...'}
                  autoFocus
                />
                <Button onClick={() => handleSearch()} disabled={loading}>
                  {loading ? '...' : (t('common.search') || 'Search')}
                </Button>
              </div>

              <div className="space-y-2">
                {!searched && results.length === 0 && (
                  <div className="text-sm text-gray-400 italic">
                    {t('groups.search_hint') || 'Type at least 2 characters and press Search'}
                  </div>
                )}
                {searched && results.length === 0 && !loading && (
                  <div className="text-sm text-gray-500">{t('common.no_results') || 'No results'}</div>
                )}
                {results.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(p)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {p.firstName?.charAt(0) || '?'}{p.lastName?.charAt(0) || ''}
                      </div>
                      <div>
                        <div className="font-medium text-charcoal">{p.firstName} {p.lastName}</div>
                        <div className="text-xs text-gray-500">{p.email || `ID: ${p.id}`}</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ---- Step 2: Confirm person + optional role/dates ---- */}
          {selectedPerson && (
            <>
              {/* Selected person card */}
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-4">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">
                  {selectedPerson.firstName?.charAt(0) || '?'}{selectedPerson.lastName?.charAt(0) || ''}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-charcoal">{selectedPerson.firstName} {selectedPerson.lastName}</div>
                  <div className="text-xs text-gray-500">{selectedPerson.email || `ID: ${selectedPerson.id}`}</div>
                </div>
                <button
                  className="text-sm text-emerald-700 hover:text-emerald-900 underline"
                  onClick={handleBack}
                >
                  {t('common.change') || 'Change'}
                </button>
              </div>

              {/* Membership detail fields */}
              {showMembershipFields && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {t('groups.role_in_group') || 'Role in Group'}
                    </label>
                    {availableRoles.length > 0 ? (
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                        value={groupRoleId ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setGroupRoleId(Number(val));
                            const role = availableRoles.find(r => r.id === Number(val));
                            if (role) {
                              const tr = role.translations?.find(t => t.locale === locale) || role.translations?.find(t => t.locale === 'en');
                              setRoleInGroup(tr?.name || role.name);
                            }
                          } else {
                            setGroupRoleId(undefined);
                            setRoleInGroup('');
                          }
                        }}
                      >
                        <option value="">{t('groups.select_role') || '-- Select a role --'}</option>
                        {availableRoles.filter(r => r.isActive !== false).map(role => {
                          const tr = role.translations?.find(t => t.locale === locale) || role.translations?.find(t => t.locale === 'en');
                          return (
                            <option key={role.id} value={role.id}>{tr?.name || role.name}</option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder={t('groups.role_placeholder') || 'e.g. Chairman, Secretary...'}
                        value={roleInGroup}
                        onChange={(e) => setRoleInGroup(e.target.value)}
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t('groups.start_date') || 'Start Date'}
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        {t('groups.end_date') || 'End Date'}
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — only show confirm button when person is selected */}
        {selectedPerson && (
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <Button variant="ghost" onClick={handleClose}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleConfirm}>
              {t('groups.add_member') || 'Add Member'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

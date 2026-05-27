'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { memberApi } from '@/lib/api';
import { PersonSearchResult } from '@/types';
import {
  eventFeatureApi,
  EventKind,
  EventMemberGroup,
  EventMemberGroupCreate,
  EventMemberGroupMember,
  EventRole,
} from '@/lib/eventFeatureApi';
import EventRolesSection from './EventRolesSection';
import EventFormModal, {
  EVENT_FORM_BTN_PRIMARY,
  EVENT_FORM_BTN_SECONDARY,
  EVENT_FORM_INPUT,
} from '@/components/events/EventFormModal';
import ScrollableTabs from '@/components/ScrollableTabs';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ActionButton, RowActions } from '@/components/events/EventResourceRowActions';
import {
  ResponsiveFilterInput,
  ResponsiveFilterSelect,
  ResponsiveFilters,
  MobileCardList,
  MobileCardItem,
  DesktopTableWrap,
  ListCountFooter,
  TabSectionHeader,
} from '@/components/ResponsiveEventLayout';

interface Props {
  eventKind: EventKind;
  eventId: number;
}

type SubTab = 'roles' | 'groups' | 'members';
type MemberRow = EventMemberGroupMember & { groupName: string };
type GroupModalState = { mode: 'create' } | { mode: 'edit'; group: EventMemberGroup };

export default function EventMemberGroupsTab({ eventKind, eventId }: Props) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>('roles');
  const [groups, setGroups] = useState<EventMemberGroup[]>([]);
  const [roles, setRoles] = useState<EventRole[]>([]);
  const [allMembers, setAllMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [groupModal, setGroupModal] = useState<GroupModalState | null>(null);
  const [groupForm, setGroupForm] = useState<EventMemberGroupCreate>({ name: '' });
  const [groupSaving, setGroupSaving] = useState(false);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);
  const [deleteMember, setDeleteMember] = useState<MemberRow | null>(null);

  const [memberSearch, setMemberSearch] = useState('');
  const [filterGroupId, setFilterGroupId] = useState('');
  const [filterRoleId, setFilterRoleId] = useState('');

  const [addGroupId, setAddGroupId] = useState<number | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<PersonSearchResult[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const memberTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadGroups = useCallback(async () => {
    setGroups(await eventFeatureApi.listMemberGroups(eventKind, eventId));
  }, [eventKind, eventId]);

  const loadRoles = useCallback(async () => {
    setRoles(await eventFeatureApi.listRoles(eventKind, eventId));
  }, [eventKind, eventId]);

  const loadAllMembers = useCallback(async () => {
    const gs = await eventFeatureApi.listMemberGroups(eventKind, eventId);
    if (gs.length === 0) {
      setAllMembers([]);
      return;
    }
    const rows = await Promise.all(
      gs.map(async g => {
        const members = await eventFeatureApi.listGroupMembers(eventKind, eventId, g.id);
        return members.map(m => ({ ...m, groupName: g.name }));
      })
    );
    setAllMembers(rows.flat());
  }, [eventKind, eventId]);

  const refresh = useCallback(async () => {
    await Promise.all([loadGroups(), loadRoles(), loadAllMembers()]);
  }, [loadGroups, loadRoles, loadAllMembers]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch {
        setToast({ message: t('event_features.toast.error'), type: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh, t]);

  useEffect(() => {
    if (groups.length > 0 && addGroupId == null) {
      setAddGroupId(groups[0].id);
    }
    if (groups.length === 0) setAddGroupId(null);
  }, [groups, addGroupId]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return allMembers.filter(m => {
      if (filterGroupId && String(m.groupId) !== filterGroupId) return false;
      if (filterRoleId && String(m.eventRoleId) !== filterRoleId) return false;
      if (q && !(m.personName || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allMembers, memberSearch, filterGroupId, filterRoleId]);

  const openCreateGroup = () => {
    setGroupForm({ name: '', description: '' });
    setGroupModal({ mode: 'create' });
  };

  const openEditGroup = (group: EventMemberGroup) => {
    setGroupForm({ name: group.name, description: group.description ?? '' });
    setGroupModal({ mode: 'edit', group });
  };

  const closeGroupModal = () => setGroupModal(null);

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim() || !groupModal) return;
    setGroupSaving(true);
    try {
      if (groupModal.mode === 'edit') {
        await eventFeatureApi.updateMemberGroup(eventKind, eventId, groupModal.group.id, groupForm);
      } else {
        await eventFeatureApi.createMemberGroup(eventKind, eventId, groupForm);
      }
      closeGroupModal();
      setToast({ message: t('event_features.toast.saved'), type: 'success' });
      await refresh();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : t('event_features.toast.error'), type: 'error' });
    } finally {
      setGroupSaving(false);
    }
  };

  const openMemberModal = () => {
    setMemberQuery('');
    setSelectedPersonId(null);
    setSelectedRoleId(null);
    setMemberResults([]);
    const preselect = filterGroupId ? Number(filterGroupId) : groups[0]?.id ?? null;
    setAddGroupId(preselect);
    setShowMemberModal(true);
  };

  const closeMemberModal = () => setShowMemberModal(false);

  const handleMemberSearch = (val: string) => {
    setMemberQuery(val);
    if (memberTimeout.current) clearTimeout(memberTimeout.current);
    if (val.length < 2) {
      setMemberResults([]);
      return;
    }
    memberTimeout.current = setTimeout(async () => {
      try {
        setMemberResults(await memberApi.search(val));
      } catch {
        setMemberResults([]);
      }
    }, 300);
  };

  const handleAddMember = async () => {
    if (!addGroupId || !selectedPersonId || !selectedRoleId) return;
    setMemberSaving(true);
    try {
      await eventFeatureApi.addGroupMember(eventKind, eventId, addGroupId, {
        personId: selectedPersonId,
        eventRoleId: selectedRoleId,
      });
      closeMemberModal();
      setToast({ message: t('event_features.toast.saved'), type: 'success' });
      await refresh();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : t('event_features.toast.error'), type: 'error' });
    } finally {
      setMemberSaving(false);
    }
  };

  const confirmRemoveMember = async () => {
    if (!deleteMember) return;
    try {
      await eventFeatureApi.removeGroupMember(eventKind, eventId, deleteMember.groupId, deleteMember.id);
      setDeleteMember(null);
      setToast({ message: t('event_features.toast.deleted'), type: 'success' });
      await refresh();
    } catch {
      setToast({ message: t('event_features.toast.error'), type: 'error' });
    }
  };

  const canAddMember = groups.length > 0 && roles.length > 0;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <ScrollableTabs
        variant="pills"
        activeId={subTab}
        onChange={id => setSubTab(id as SubTab)}
        tabs={[
          { id: 'roles', label: t('event_features.member_groups.sub_tabs.roles'), badge: roles.length },
          { id: 'groups', label: t('event_features.member_groups.sub_tabs.groups'), badge: groups.length },
          { id: 'members', label: t('event_features.member_groups.sub_tabs.members'), badge: allMembers.length },
        ]}
      />

      {subTab === 'roles' && (
        <EventRolesSection eventKind={eventKind} eventId={eventId} onDataChange={refresh} />
      )}

      {subTab === 'groups' && (
        <section className="w-full min-w-0 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <TabSectionHeader
            inCard
            title={t('event_features.member_groups.title')}
            subtitle={t('event_features.member_groups.groups_hint')}
            action={
              <button type="button" className={EVENT_FORM_BTN_PRIMARY} onClick={openCreateGroup}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('event_features.member_groups.add')}
              </button>
            }
          />

          {groups.length === 0 ? (
            <p className="px-4 sm:px-6 py-10 text-center text-stone-500 text-sm">{t('event_features.member_groups.empty')}</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {groups.map(g => (
                <li key={g.id} className="px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900">{g.name}</p>
                    {g.description ? <p className="text-sm text-stone-500 mt-0.5">{g.description}</p> : null}
                    <p className="text-xs text-stone-400 mt-1">
                      {g.memberCount ?? 0} {t('event_features.member_groups.members')}
                    </p>
                  </div>
                  <RowActions>
                    <ActionButton
                      variant="primary"
                      onClick={() => {
                        setSubTab('members');
                        setFilterGroupId(String(g.id));
                      }}
                    >
                      {t('event_features.member_groups.view_members')}
                    </ActionButton>
                    <ActionButton variant="primary" onClick={() => openEditGroup(g)}>
                      {t('common.edit')}
                    </ActionButton>
                    <ActionButton variant="danger" onClick={() => setDeleteGroupId(g.id)}>
                      {t('common.delete')}
                    </ActionButton>
                  </RowActions>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {subTab === 'members' && (
        <section className="w-full min-w-0 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <TabSectionHeader
            inCard
            title={t('event_features.member_groups.all_members')}
            subtitle={t('event_features.member_groups.members_hint')}
            action={
              canAddMember ? (
                <button type="button" className={EVENT_FORM_BTN_PRIMARY} onClick={openMemberModal}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('event_features.member_groups.add_member')}
                </button>
              ) : undefined
            }
          />

          {!canAddMember && (
            <p className="px-4 sm:px-6 py-4 text-sm text-amber-800 bg-amber-50 border-b border-amber-100">
              {groups.length === 0
                ? t('event_features.member_groups.empty')
                : t('event_features.member_groups.need_roles')}
            </p>
          )}

          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-stone-100">
            <ResponsiveFilters className="!mb-0">
              <ResponsiveFilterInput
                type="text"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder={t('event_features.member_groups.search_member')}
              />
              <ResponsiveFilterSelect value={filterGroupId} onChange={e => setFilterGroupId(e.target.value)}>
                <option value="">{t('event_features.member_groups.all_groups')}</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </ResponsiveFilterSelect>
              <ResponsiveFilterSelect value={filterRoleId} onChange={e => setFilterRoleId(e.target.value)}>
                <option value="">{t('event_features.member_groups.all_roles')}</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </ResponsiveFilterSelect>
              {(memberSearch || filterGroupId || filterRoleId) && (
                <button
                  type="button"
                  className="text-sm text-emerald-700 hover:text-emerald-800 underline text-left"
                  onClick={() => {
                    setMemberSearch('');
                    setFilterGroupId('');
                    setFilterRoleId('');
                  }}
                >
                  {t('distribution.clear_filters')}
                </button>
              )}
            </ResponsiveFilters>
          </div>

          {allMembers.length === 0 ? (
            <p className="px-4 sm:px-6 py-10 text-center text-stone-500 text-sm">{t('event_features.member_groups.no_members')}</p>
          ) : filteredMembers.length === 0 ? (
            <p className="px-4 sm:px-6 py-10 text-center text-stone-500 text-sm">{t('event_features.member_groups.no_matching_members')}</p>
          ) : (
            <>
              <MobileCardList>
                {filteredMembers.map(m => (
                  <MobileCardItem key={m.id}>
                    <p className="text-sm font-semibold text-stone-900">{m.personName}</p>
                    <p className="text-sm text-stone-600 mt-0.5">{m.eventRoleName}</p>
                    <p className="text-xs text-stone-500 mt-1">
                      {t('event_features.member_groups.group_name')}: {m.groupName}
                    </p>
                    <RowActions>
                      <ActionButton variant="danger" onClick={() => setDeleteMember(m)}>
                        {t('event_features.member_groups.remove_member')}
                      </ActionButton>
                    </RowActions>
                  </MobileCardItem>
                ))}
              </MobileCardList>
              <DesktopTableWrap>
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                        {t('event_features.assignments.member')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                        {t('event_features.member_groups.group_name')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase">
                        {t('event_features.roles.name')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 uppercase" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredMembers.map(m => (
                      <tr key={m.id}>
                        <td className="px-4 py-3 font-medium text-stone-900">{m.personName}</td>
                        <td className="px-4 py-3 text-stone-600">{m.groupName}</td>
                        <td className="px-4 py-3 text-stone-600">{m.eventRoleName}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="text-sm text-red-600 font-medium hover:text-red-800"
                            onClick={() => setDeleteMember(m)}
                          >
                            {t('event_features.member_groups.remove_member')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ListCountFooter>
                  {filteredMembers.length} / {allMembers.length} {t('event_features.member_groups.members')}
                </ListCountFooter>
              </DesktopTableWrap>
              <div className="md:hidden px-4 py-3 text-xs text-stone-500 text-center border-t border-stone-100">
                {filteredMembers.length} / {allMembers.length} {t('event_features.member_groups.members')}
              </div>
            </>
          )}
        </section>
      )}

      <EventFormModal
        open={groupModal !== null}
        onClose={closeGroupModal}
        title={
          groupModal?.mode === 'edit'
            ? t('event_features.member_groups.edit')
            : t('event_features.member_groups.add')
        }
        size="md"
        footer={
          <>
            <button type="button" className={EVENT_FORM_BTN_SECONDARY} onClick={closeGroupModal} disabled={groupSaving}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={EVENT_FORM_BTN_PRIMARY}
              disabled={!groupForm.name.trim() || groupSaving}
              onClick={handleSaveGroup}
            >
              {groupSaving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.member_groups.name')}</label>
            <input
              type="text"
              className={EVENT_FORM_INPUT}
              value={groupForm.name}
              onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.resources.description')}</label>
            <input
              type="text"
              className={EVENT_FORM_INPUT}
              value={groupForm.description ?? ''}
              onChange={e => setGroupForm({ ...groupForm, description: e.target.value })}
            />
          </div>
        </div>
      </EventFormModal>

      <EventFormModal
        open={showMemberModal}
        onClose={closeMemberModal}
        title={t('event_features.member_groups.add_member')}
        size="md"
        footer={
          <>
            <button type="button" className={EVENT_FORM_BTN_SECONDARY} onClick={closeMemberModal} disabled={memberSaving}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={EVENT_FORM_BTN_PRIMARY}
              disabled={!selectedPersonId || !selectedRoleId || !addGroupId || memberSaving}
              onClick={handleAddMember}
            >
              {memberSaving ? t('common.saving') : t('event_features.member_groups.add_member')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.member_groups.group_name')}</label>
            <select className={EVENT_FORM_INPUT} value={addGroupId ?? ''} onChange={e => setAddGroupId(Number(e.target.value))}>
              {groups.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.member_groups.select_role')}</label>
            <select className={EVENT_FORM_INPUT} value={selectedRoleId ?? ''} onChange={e => setSelectedRoleId(Number(e.target.value))}>
              <option value="">{t('event_features.member_groups.select_role')}</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.assignments.member')}</label>
            <input
              type="text"
              className={EVENT_FORM_INPUT}
              value={memberQuery}
              onChange={e => handleMemberSearch(e.target.value)}
              placeholder={t('event_features.assignments.search_member')}
              autoFocus
            />
          </div>
          {memberResults.length > 0 && (
            <ul className="border border-stone-200 rounded-lg divide-y divide-stone-100 max-h-48 overflow-y-auto bg-white shadow-sm">
              {memberResults.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 transition-colors ${
                      selectedPersonId === Number(p.id) ? 'bg-emerald-50 text-emerald-900' : 'text-stone-800'
                    }`}
                    onClick={() => {
                      setSelectedPersonId(Number(p.id));
                      setMemberQuery(`${p.firstName} ${p.lastName ?? ''}`.trim());
                      setMemberResults([]);
                    }}
                  >
                    <span className="font-medium">
                      {p.firstName} {p.lastName}
                    </span>
                    {p.email && <span className="block text-xs text-stone-500 mt-0.5">{p.email}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </EventFormModal>

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmDialog
        open={deleteGroupId !== null}
        title={t('event_features.member_groups.delete')}
        message={t('event_features.member_groups.delete_confirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={async () => {
          if (!deleteGroupId) return;
          await eventFeatureApi.deleteMemberGroup(eventKind, eventId, deleteGroupId);
          setDeleteGroupId(null);
          await refresh();
        }}
        onCancel={() => setDeleteGroupId(null)}
      />

      <ConfirmDialog
        open={deleteMember !== null}
        title={t('event_features.member_groups.remove_member')}
        message={t('event_features.member_groups.remove_member_confirm', {
          name: deleteMember?.personName ?? '',
          group: deleteMember?.groupName ?? '',
        })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmRemoveMember}
        onCancel={() => setDeleteMember(null)}
      />
    </div>
  );
}

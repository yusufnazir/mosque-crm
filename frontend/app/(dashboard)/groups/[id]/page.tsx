'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import Button from '@/components/Button';
import { groupApi, GroupMemberDTO, GroupDTO, GroupTranslationDTO, GroupRoleDTO, GroupRoleTranslationDTO } from '@/lib/groupApi';
import MemberSearchModal, { MemberSearchResult } from '@/components/MemberSearchModal';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useDateFormat } from '@/lib/DateFormatContext';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t, language: locale } = useTranslation();
  const { formatDate } = useDateFormat();
  const groupId = Number(params.id);

  // --- Translation helpers ---
  const getGroupName = useCallback((g: GroupDTO | null) => {
    if (!g) return '';
    const trans = g.translations?.find(tr => tr.locale === locale)
      || g.translations?.find(tr => tr.locale === 'en');
    return trans?.name || g.name;
  }, [locale]);

  const getGroupDescription = useCallback((g: GroupDTO | null) => {
    if (!g) return '';
    const trans = g.translations?.find(tr => tr.locale === locale)
      || g.translations?.find(tr => tr.locale === 'en');
    return trans?.description || g.description || '';
  }, [locale]);

  // --- Core state ---
  const [group, setGroup] = useState<GroupDTO | null>(null);
  const [members, setMembers] = useState<GroupMemberDTO[]>([]);
  const [roles, setRoles] = useState<GroupRoleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // --- Member management ---
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<GroupMemberDTO | null>(null);

  // --- Edit member ---
  const [editingMember, setEditingMember] = useState<GroupMemberDTO | null>(null);
  const [editMemberRole, setEditMemberRole] = useState('');
  const [editMemberRoleId, setEditMemberRoleId] = useState<number | undefined>(undefined);
  const [editMemberStartDate, setEditMemberStartDate] = useState('');
  const [editMemberEndDate, setEditMemberEndDate] = useState('');
  const [editMemberActive, setEditMemberActive] = useState(true);
  const [savingMember, setSavingMember] = useState(false);

  // --- Edit group ---
  const [showEdit, setShowEdit] = useState(false);
  const [editNameEn, setEditNameEn] = useState('');
  const [editDescEn, setEditDescEn] = useState('');
  const [editNameNl, setEditNameNl] = useState('');
  const [editDescNl, setEditDescNl] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // --- Member search/filter ---
  const [memberSearch, setMemberSearch] = useState('');

  // --- Role management ---
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<GroupRoleDTO | null>(null);
  const [roleNameEn, setRoleNameEn] = useState('');
  const [roleNameNl, setRoleNameNl] = useState('');
  const [roleSortOrder, setRoleSortOrder] = useState(0);
  const [roleMaxMembers, setRoleMaxMembers] = useState('');
  const [roleIsActive, setRoleIsActive] = useState(true);
  const [savingRole, setSavingRole] = useState(false);
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<GroupRoleDTO | null>(null);

  // --- Load data ---
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [g, m, r] = await Promise.all([
        groupApi.get(groupId),
        groupApi.listMembers(groupId),
        groupApi.listRoles(groupId),
      ]);
      setGroup(g);
      setMembers(Array.isArray(m) ? m : []);
      setRoles(Array.isArray(r) ? r : []);
    } catch (err) {
      console.error('Failed to load group detail', err);
      setToast({ message: t('groups.load_error') || 'Failed to load group', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [groupId, t]);

  useEffect(() => {
    load();
  }, [load]);

  // --- Edit group handlers ---
  const openEdit = () => {
    if (!group) return;
    const enTrans = group.translations?.find(tr => tr.locale === 'en');
    const nlTrans = group.translations?.find(tr => tr.locale === 'nl');
    setEditNameEn(enTrans?.name || group.name);
    setEditDescEn(enTrans?.description || group.description || '');
    setEditNameNl(nlTrans?.name || '');
    setEditDescNl(nlTrans?.description || '');
    setEditStartDate(group.startDate || '');
    setEditEndDate(group.endDate || '');
    setEditIsActive(group.isActive !== false);
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    if (!editNameEn.trim() || !group) return;
    try {
      setSaving(true);
      const translations: GroupTranslationDTO[] = [];
      if (editNameEn.trim()) translations.push({ locale: 'en', name: editNameEn.trim(), description: editDescEn.trim() || undefined });
      if (editNameNl.trim()) translations.push({ locale: 'nl', name: editNameNl.trim(), description: editDescNl.trim() || undefined });

      const updated = await groupApi.update(group.id as number, {
        name: editNameEn.trim(),
        description: editDescEn.trim() || undefined,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined,
        isActive: editIsActive,
        translations,
      });
      setGroup(updated);
      setShowEdit(false);
      setToast({ message: t('groups.edit_success') || 'Group updated', type: 'success' });
    } catch (err) {
      console.error('Failed to update group', err);
      setToast({ message: t('groups.edit_error') || 'Failed to update group', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // --- Add member handler (combined modal) ---
  const handleAddMember = async (result: MemberSearchResult) => {
    try {
      setAdding(true);
      const dto: GroupMemberDTO = {
        groupId,
        personId: result.person.id,
        roleInGroup: result.roleInGroup,
        groupRoleId: result.groupRoleId,
        startDate: result.startDate,
        endDate: result.endDate,
      };
      const added = await groupApi.addMember(dto);
      setMembers((prev) => [...prev, added]);
      setShowMemberModal(false);
      setToast({ message: t('groups.member_added') || 'Member added', type: 'success' });
    } catch (err: any) {
      console.error('Failed to add member', err);
      const msg = err?.message?.includes('already a member')
        ? (t('groups.already_member') || 'This person is already a member of the group')
        : (t('groups.add_member_error') || 'Failed to add member');
      setToast({ message: msg, type: 'error' });
    } finally {
      setAdding(false);
    }
  };

  // --- Remove member handler ---
  const handleRemove = async () => {
    if (!deleteConfirm) return;
    try {
      await groupApi.removeMember(deleteConfirm.id as number);
      setMembers((prev) => prev.filter((m) => m.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      setToast({ message: t('groups.member_removed') || 'Member removed', type: 'success' });
    } catch (err) {
      console.error('Failed to remove member', err);
      setToast({ message: t('groups.remove_member_error') || 'Failed to remove member', type: 'error' });
    }
  };

  // --- Edit member handlers ---
  const openEditMember = (m: GroupMemberDTO) => {
    setEditingMember(m);
    setEditMemberRole(m.roleInGroup || '');
    setEditMemberRoleId(m.groupRoleId ?? undefined);
    setEditMemberStartDate(m.startDate || '');
    setEditMemberEndDate(m.endDate || '');
    setEditMemberActive(!m.endDate || new Date(m.endDate + 'T00:00:00') >= new Date());
  };

  const handleEditMemberSave = async () => {
    if (!editingMember) return;
    try {
      setSavingMember(true);
      const updated = await groupApi.updateMember(editingMember.id as number, {
        ...editingMember,
        groupRoleId: editMemberRoleId ?? undefined,
        roleInGroup: editMemberRole.trim() || undefined,
        startDate: editMemberStartDate || undefined,
        endDate: editMemberEndDate || undefined,
      });
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setEditingMember(null);
      setToast({ message: t('groups.member_updated') || 'Member updated', type: 'success' });
    } catch (err) {
      console.error('Failed to update member', err);
      setToast({ message: t('groups.member_update_error') || 'Failed to update member', type: 'error' });
    } finally {
      setSavingMember(false);
    }
  };

  // --- Member display name ---
  const getMemberName = (m: GroupMemberDTO) => {
    if (m.personFirstName || m.personLastName) {
      return `${m.personFirstName || ''} ${m.personLastName || ''}`.trim();
    }
    return `Person #${m.personId}`;
  };

  // --- Role display name (locale-aware) ---
  const getRoleName = (role: GroupRoleDTO) => {
    const tr = role.translations?.find(t => t.locale === locale)
      || role.translations?.find(t => t.locale === 'en');
    return tr?.name || role.name;
  };

  // --- Avatar color based on name hash ---
  const avatarColors = [
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-blue-100', text: 'text-blue-700' },
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { bg: 'bg-orange-100', text: 'text-orange-700' },
  ];

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  // --- Check if member is expired (endDate in past) ---
  const isMemberExpired = (m: GroupMemberDTO) => {
    if (!m.endDate) return false;
    const end = new Date(m.endDate + 'T23:59:59');
    return end < new Date();
  };

  // --- Filtered members ---
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(m => {
      const name = getMemberName(m).toLowerCase();
      const role = getMemberRoleName(m).toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [members, memberSearch, roles, locale]);

  // --- Role member count ---
  const getRoleMemberCount = (roleId: number) => {
    return members.filter(m => m.groupRoleId === roleId).length;
  };

  // --- Get role name for a member ---
  const getMemberRoleName = (m: GroupMemberDTO) => {
    if (m.groupRoleId) {
      const role = roles.find(r => r.id === m.groupRoleId);
      if (role) return getRoleName(role);
      return m.roleName || m.roleInGroup || '';
    }
    return m.roleInGroup || '';
  };

  // ==================== Role CRUD ====================

  const openAddRole = () => {
    setEditingRole(null);
    setRoleNameEn('');
    setRoleNameNl('');
    setRoleSortOrder(roles.length);
    setRoleMaxMembers('');
    setRoleIsActive(true);
    setShowRoleModal(true);
  };

  const openEditRole = (role: GroupRoleDTO) => {
    setEditingRole(role);
    const enTrans = role.translations?.find(t => t.locale === 'en');
    const nlTrans = role.translations?.find(t => t.locale === 'nl');
    setRoleNameEn(enTrans?.name || role.name);
    setRoleNameNl(nlTrans?.name || '');
    setRoleSortOrder(role.sortOrder ?? 0);
    setRoleMaxMembers(role.maxMembers != null ? String(role.maxMembers) : '');
    setRoleIsActive(role.isActive !== false);
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleNameEn.trim()) return;
    try {
      setSavingRole(true);
      const translations: GroupRoleTranslationDTO[] = [];
      if (roleNameEn.trim()) translations.push({ locale: 'en', name: roleNameEn.trim() });
      if (roleNameNl.trim()) translations.push({ locale: 'nl', name: roleNameNl.trim() });

      const data: GroupRoleDTO = {
        name: roleNameEn.trim(),
        sortOrder: roleSortOrder,
        maxMembers: roleMaxMembers ? Number(roleMaxMembers) : undefined,
        isActive: roleIsActive,
        translations,
      };

      if (editingRole) {
        const updated = await groupApi.updateRole(editingRole.id as number, data);
        setRoles(prev => prev.map(r => r.id === updated.id ? updated : r));
        setToast({ message: t('groups.role_updated') || 'Role updated', type: 'success' });
      } else {
        const created = await groupApi.createRole(groupId, data);
        setRoles(prev => [...prev, created]);
        setToast({ message: t('groups.role_created') || 'Role created', type: 'success' });
      }
      setShowRoleModal(false);
    } catch (err) {
      console.error('Failed to save role', err);
      setToast({ message: t('groups.role_save_error') || 'Failed to save role', type: 'error' });
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleConfirm) return;
    try {
      await groupApi.deleteRole(deleteRoleConfirm.id as number);
      setRoles(prev => prev.filter(r => r.id !== deleteRoleConfirm.id));
      setDeleteRoleConfirm(null);
      setToast({ message: t('groups.role_deleted') || 'Role deleted', type: 'success' });
    } catch (err) {
      console.error('Failed to delete role', err);
      setToast({ message: t('groups.role_delete_error') || 'Failed to delete role', type: 'error' });
    }
  };

  // --- Loading skeleton ---
  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-64 bg-gray-200 rounded-xl"></div>
            <div className="h-48 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-gray-500">{t('groups.load_error') || 'Group not found'}</p>
        <Button variant="ghost" onClick={() => router.push('/groups')} className="mt-4">{t('common.back') || 'Back'}</Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => router.push('/groups')}
            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-gray-500">{t('groups.title') || 'Groups'}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-charcoal">{getGroupName(group)}</h1>
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                group.isActive !== false
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {group.isActive !== false ? t('groups.active') || 'Active' : t('groups.inactive') || 'Inactive'}
              </span>
            </div>
            {getGroupDescription(group) && (
              <p className="text-gray-600 mt-1">{getGroupDescription(group)}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={openEdit}>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t('groups.edit') || 'Edit Group'}
            </Button>
            <Button onClick={() => setShowMemberModal(true)}>
              + {t('groups.add_member') || 'Add Member'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>{t('members.title') || 'Members'} ({members.length})</CardTitle>
                {members.length > 5 && (
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder={t('groups.filter_members') || 'Filter members...'}
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-48"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">{t('groups.no_members') || 'No members yet'}</p>
                  <Button variant="ghost" onClick={() => setShowMemberModal(true)} className="mt-2">
                    + {t('groups.add_member') || 'Add Member'}
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {memberSearch && filteredMembers.length === 0 && (
                    <div className="py-8 text-center text-sm text-gray-400">
                      {t('groups.no_results') || 'No members match your search'}
                    </div>
                  )}
                  {filteredMembers.map((m) => {
                    const name = getMemberName(m);
                    const color = getAvatarColor(name);
                    const expired = isMemberExpired(m);
                    return (
                    <div key={m.id} className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${expired ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-semibold text-sm flex-shrink-0`}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <a href={`/members/${m.personId}`} className="font-medium text-charcoal hover:text-emerald-700 hover:underline truncate cursor-pointer">{name}</a>
                            {expired && (
                              <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 font-medium rounded-full flex-shrink-0">{t('groups.expired') || 'Expired'}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {getMemberRoleName(m) && (
                              <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{getMemberRoleName(m)}</span>
                            )}
                            {m.startDate && (
                              <span className="text-xs text-gray-400">
                                {formatDate(m.startDate)}
                                {m.endDate && ` — ${formatDate(m.endDate)}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditMember(m)}
                          className="text-gray-400 hover:text-emerald-600 transition-colors p-1"
                          title={t('common.edit') || 'Edit'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(m)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title={t('common.delete') || 'Remove'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Group info sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('groups.group_info') || 'Group Info'}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-500 font-medium">{t('groups.name') || 'Name'}</dt>
                  <dd className="text-charcoal mt-0.5">{getGroupName(group)}</dd>
                </div>
                {getGroupDescription(group) && (
                  <div>
                    <dt className="text-gray-500 font-medium">{t('groups.description') || 'Description'}</dt>
                    <dd className="text-charcoal mt-0.5">{getGroupDescription(group)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-gray-500 font-medium">{t('groups.status') || 'Status'}</dt>
                  <dd className="mt-0.5">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      group.isActive !== false
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {group.isActive !== false ? t('groups.active') || 'Active' : t('groups.inactive') || 'Inactive'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500 font-medium">{t('members.title') || 'Members'}</dt>
                  <dd className="text-charcoal mt-0.5">{members.length}</dd>
                </div>
                {group.startDate && (
                  <div>
                    <dt className="text-gray-500 font-medium">{t('groups.start_date') || 'Start Date'}</dt>
                    <dd className="text-charcoal mt-0.5">{formatDate(group.startDate)}</dd>
                  </div>
                )}
                {group.endDate && (
                  <div>
                    <dt className="text-gray-500 font-medium">{t('groups.end_date') || 'End Date'}</dt>
                    <dd className="text-charcoal mt-0.5">{formatDate(group.endDate)}</dd>
                  </div>
                )}
                {group.createdAt && (
                  <div>
                    <dt className="text-gray-500 font-medium">{t('common.created_at') || 'Created'}</dt>
                    <dd className="text-charcoal mt-0.5">{formatDate(group.createdAt)}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Roles card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>{t('groups.roles') || 'Roles'} ({roles.length})</CardTitle>
                <button
                  onClick={openAddRole}
                  className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  + {t('groups.add_role') || 'Add Role'}
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {roles.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-400">
                  {t('groups.no_roles') || 'No roles defined'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-charcoal truncate">{getRoleName(role)}</div>
                        <div className="flex items-center gap-2">
                          {role.isActive === false && (
                            <span className="text-xs text-gray-400">{t('groups.inactive') || 'Inactive'}</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {getRoleMemberCount(role.id as number)}{role.maxMembers != null ? `/${role.maxMembers}` : ''} {role.maxMembers != null && getRoleMemberCount(role.id as number) >= role.maxMembers ? '✓' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditRole(role)}
                          className="text-gray-400 hover:text-emerald-600 transition-colors p-1"
                          title={t('common.edit') || 'Edit'}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteRoleConfirm(role)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title={t('common.delete') || 'Delete'}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ------ MODALS ------ */}

      {/* Member search + add modal (combined) */}
      <MemberSearchModal
        open={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        onAdd={handleAddMember}
        availableRoles={roles}
      />

      {/* Edit group modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-charcoal mb-4">
              {t('groups.edit') || 'Edit Group'}
            </h2>
            <div className="space-y-4">
              {/* English */}
              <fieldset className="border border-gray-200 rounded-lg p-3">
                <legend className="text-xs font-medium text-gray-500 px-1">English</legend>
                <div className="space-y-2">
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder={t('groups.name') || 'Name'}
                    value={editNameEn}
                    onChange={(e) => setEditNameEn(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                    rows={2}
                    placeholder={t('groups.description') || 'Description'}
                    value={editDescEn}
                    onChange={(e) => setEditDescEn(e.target.value)}
                  />
                </div>
              </fieldset>

              {/* Dutch */}
              <fieldset className="border border-gray-200 rounded-lg p-3">
                <legend className="text-xs font-medium text-gray-500 px-1">Nederlands</legend>
                <div className="space-y-2">
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder={t('groups.name') || 'Naam'}
                    value={editNameNl}
                    onChange={(e) => setEditNameNl(e.target.value)}
                  />
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                    rows={2}
                    placeholder={t('groups.description') || 'Beschrijving'}
                    value={editDescNl}
                    onChange={(e) => setEditDescNl(e.target.value)}
                  />
                </div>
              </fieldset>

              {/* Dates + Active */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('groups.start_date') || 'Start Date'}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('groups.end_date') || 'End Date'}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">{t('groups.active') || 'Active'}</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowEdit(false)}>
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleEditSave} disabled={saving || !editNameEn.trim()}>
                {saving ? '...' : t('common.save') || 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Remove member confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title={t('groups.remove_member_title') || 'Remove Member'}
        message={t('groups.remove_member_message') || `Remove ${deleteConfirm ? getMemberName(deleteConfirm) : ''} from this group?`}
        confirmLabel={t('common.delete') || 'Remove'}
        cancelLabel={t('common.cancel') || 'Cancel'}
        variant="danger"
        onConfirm={handleRemove}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Edit member modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-charcoal mb-1">
              {t('groups.edit_member') || 'Edit Member'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {getMemberName(editingMember)}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('groups.role_in_group') || 'Role in Group'}</label>
                {roles.length > 0 ? (
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                    value={editMemberRoleId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setEditMemberRoleId(Number(val));
                        const role = roles.find(r => r.id === Number(val));
                        if (role) {
                          const tr = role.translations?.find(t => t.locale === locale) || role.translations?.find(t => t.locale === 'en');
                          setEditMemberRole(tr?.name || role.name);
                        }
                      } else {
                        setEditMemberRoleId(undefined);
                        setEditMemberRole('');
                      }
                    }}
                    autoFocus
                  >
                    <option value="">{t('groups.select_role') || '-- Select a role --'}</option>
                    {roles.filter(r => r.isActive !== false).map(role => {
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
                    value={editMemberRole}
                    onChange={(e) => setEditMemberRole(e.target.value)}
                    autoFocus
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('groups.start_date') || 'Start Date'}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={editMemberStartDate}
                    onChange={(e) => setEditMemberStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('groups.end_date') || 'End Date'}</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={editMemberEndDate}
                    onChange={(e) => setEditMemberEndDate(e.target.value)}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editMemberActive}
                  onChange={(e) => setEditMemberActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">{t('groups.active') || 'Active'}</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setEditingMember(null)}>
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleEditMemberSave} disabled={savingMember}>
                {savingMember ? '...' : t('common.save') || 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-charcoal mb-4">
              {editingRole ? (t('groups.edit_role') || 'Edit Role') : (t('groups.add_role') || 'Add Role')}
            </h2>
            <div className="space-y-4">
              {/* English */}
              <fieldset className="border border-gray-200 rounded-lg p-3">
                <legend className="text-xs font-medium text-gray-500 px-1">English</legend>
                <input
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder={t('groups.role_name') || 'Role name'}
                  value={roleNameEn}
                  onChange={(e) => setRoleNameEn(e.target.value)}
                  autoFocus
                />
              </fieldset>

              {/* Dutch */}
              <fieldset className="border border-gray-200 rounded-lg p-3">
                <legend className="text-xs font-medium text-gray-500 px-1">Nederlands</legend>
                <input
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder={t('groups.role_name') || 'Rolnaam'}
                  value={roleNameNl}
                  onChange={(e) => setRoleNameNl(e.target.value)}
                />
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('groups.sort_order') || 'Sort Order'}</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    value={roleSortOrder}
                    onChange={(e) => setRoleSortOrder(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('groups.max_members') || 'Max Members'}</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder={t('groups.unlimited') || 'Unlimited'}
                    value={roleMaxMembers}
                    onChange={(e) => setRoleMaxMembers(e.target.value)}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={roleIsActive}
                  onChange={(e) => setRoleIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">{t('groups.active') || 'Active'}</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setShowRoleModal(false)}>
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button onClick={handleSaveRole} disabled={savingRole || !roleNameEn.trim()}>
                {savingRole ? '...' : t('common.save') || 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete role confirmation */}
      <ConfirmDialog
        open={!!deleteRoleConfirm}
        title={t('groups.delete_role_title') || 'Delete Role'}
        message={t('groups.delete_role_message') || `Delete role "${deleteRoleConfirm ? getRoleName(deleteRoleConfirm) : ''}"?`}
        confirmLabel={t('common.delete') || 'Delete'}
        cancelLabel={t('common.cancel') || 'Cancel'}
        variant="danger"
        onConfirm={handleDeleteRole}
        onCancel={() => setDeleteRoleConfirm(null)}
      />
    </div>
  );
}

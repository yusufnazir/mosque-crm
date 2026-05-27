'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { memberApi } from '@/lib/api';
import { PersonSearchResult } from '@/types';
import {
  eventFeatureApi,
  EventKind,
  EventResource,
  EventResourceAssignment,
  EventResourceCategory,
  EventResourceCategoryCreate,
  EventResourceCreate,
  EventResourceType,
  EventResourceTypeCreate,
} from '@/lib/eventFeatureApi';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import ScrollableTabs from '@/components/ScrollableTabs';
import EventFormModal, {
  EVENT_FORM_BTN_PRIMARY,
  EVENT_FORM_BTN_SECONDARY,
  EVENT_FORM_INPUT,
} from '@/components/events/EventFormModal';
import {
  TabSectionHeader,
  ResponsiveFilters,
  ResponsiveFilterSelect,
  MobileCardList,
  MobileCardItem,
  DesktopTableWrap,
} from '@/components/ResponsiveEventLayout';
import { ActionButton, RowActions, SelectionIndicator } from '@/components/events/EventResourceRowActions';

interface Props {
  eventKind: EventKind;
  eventId: number;
}

type SubTab = 'category' | 'type' | 'resource' | 'assignment';
type FormMode = 'category' | 'type' | 'resource' | null;

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-amber-100 text-amber-800 ring-amber-200',
    COMPLETED: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    CANCELLED: 'bg-stone-100 text-stone-600 ring-stone-200',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${styles[status] ?? styles.CANCELLED}`}>
      {status}
    </span>
  );
}

export default function EventResourcesTab({ eventKind, eventId }: Props) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>('category');
  const [formSaving, setFormSaving] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [categories, setCategories] = useState<EventResourceCategory[]>([]);
  const [types, setTypes] = useState<EventResourceType[]>([]);
  const [resources, setResources] = useState<EventResource[]>([]);
  const [assignments, setAssignments] = useState<EventResourceAssignment[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<number | null>(null);

  const [catForm, setCatForm] = useState<EventResourceCategoryCreate>({ name: '', description: '', sortOrder: 0 });
  const [typeForm, setTypeForm] = useState<EventResourceTypeCreate>({ name: '', description: '', sortOrder: 0 });
  const [resForm, setResForm] = useState<EventResourceCreate>({ name: '', description: '', assignable: false });

  const [assignmentFilter, setAssignmentFilter] = useState('');
  const [assignModal, setAssignModal] = useState<{ resourceId: number; resourceName: string } | null>(null);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<PersonSearchResult[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const memberTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => Promise<void> } | null>(null);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const selectedType = types.find(ty => ty.id === selectedTypeId);

  const loadCategories = useCallback(async () => {
    const list = await eventFeatureApi.listCategories(eventKind, eventId);
    setCategories(list);
    if (selectedCategoryId && !list.some(c => c.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
      setSelectedTypeId(null);
    }
  }, [eventKind, eventId, selectedCategoryId]);

  const loadTypes = useCallback(async (categoryId: number) => {
    const list = await eventFeatureApi.listTypes(eventKind, eventId, categoryId);
    setTypes(list);
    if (selectedTypeId && !list.some(ty => ty.id === selectedTypeId)) {
      setSelectedTypeId(null);
    }
  }, [eventKind, eventId, selectedTypeId]);

  const loadResources = useCallback(async (typeId: number) => {
    setResources(await eventFeatureApi.listResources(eventKind, eventId, typeId));
  }, [eventKind, eventId]);

  const loadAssignments = useCallback(async () => {
    setAssignments(await eventFeatureApi.listAssignments(eventKind, eventId));
  }, [eventKind, eventId]);

  const refreshAll = useCallback(async () => {
    await loadCategories();
    await loadAssignments();
    if (selectedCategoryId) await loadTypes(selectedCategoryId);
    if (selectedTypeId) await loadResources(selectedTypeId);
  }, [loadCategories, loadAssignments, loadTypes, loadResources, selectedCategoryId, selectedTypeId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadCategories();
        await loadAssignments();
      } catch {
        setToast({ message: t('event_features.toast.error'), type: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [eventKind, eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedCategoryId) loadTypes(selectedCategoryId);
    else setTypes([]);
  }, [selectedCategoryId, loadTypes]);

  useEffect(() => {
    if (selectedTypeId) loadResources(selectedTypeId);
    else setResources([]);
  }, [selectedTypeId, loadResources]);

  useEffect(() => {
    if ((subTab === 'type' || subTab === 'resource') && categories.length > 0 && selectedCategoryId === null) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [subTab, categories, selectedCategoryId]);

  useEffect(() => {
    if (subTab === 'resource' && types.length > 0 && selectedCategoryId !== null && selectedTypeId === null) {
      setSelectedTypeId(types[0].id);
    }
  }, [subTab, types, selectedCategoryId, selectedTypeId]);

  const handleSubTabChange = (id: SubTab) => {
    setSubTab(id);
    closeForm();
  };

  const onCategoryFilterChange = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setSelectedTypeId(null);
    closeForm();
  };

  const handleMemberSearch = (val: string) => {
    setMemberQuery(val);
    setSelectedPersonId(null);
    if (memberTimeout.current) clearTimeout(memberTimeout.current);
    if (val.length < 2) {
      setMemberResults([]);
      return;
    }
    memberTimeout.current = setTimeout(async () => {
      setMemberSearchLoading(true);
      try {
        setMemberResults(await memberApi.search(val));
      } catch {
        setMemberResults([]);
      } finally {
        setMemberSearchLoading(false);
      }
    }, 300);
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingCategoryId(null);
    setEditingTypeId(null);
    setEditingResourceId(null);
  };

  const openCategoryForm = (cat?: EventResourceCategory) => {
    setFormMode('category');
    if (cat) {
      setEditingCategoryId(cat.id);
      setCatForm({ name: cat.name, description: cat.description ?? '', sortOrder: cat.sortOrder ?? 0 });
    } else {
      setEditingCategoryId(null);
      setCatForm({ name: '', description: '', sortOrder: 0 });
    }
  };

  const openTypeForm = (ty?: EventResourceType) => {
    if (!selectedCategoryId) return;
    setFormMode('type');
    if (ty) {
      setEditingTypeId(ty.id);
      setTypeForm({ name: ty.name, description: ty.description ?? '', sortOrder: ty.sortOrder ?? 0 });
    } else {
      setEditingTypeId(null);
      setTypeForm({ name: '', description: '', sortOrder: 0 });
    }
  };

  const openResourceForm = (res?: EventResource) => {
    if (!selectedTypeId) return;
    setFormMode('resource');
    if (res) {
      setEditingResourceId(res.id);
      setResForm({ name: res.name, description: res.description ?? '', assignable: res.assignable });
    } else {
      setEditingResourceId(null);
      setResForm({ name: '', description: '', assignable: false });
    }
  };

  const saveCategory = async () => {
    if (!catForm.name.trim()) return;
    setFormSaving(true);
    try {
      if (editingCategoryId) {
        await eventFeatureApi.updateCategory(eventKind, eventId, editingCategoryId, catForm);
      } else {
        await eventFeatureApi.createCategory(eventKind, eventId, catForm);
      }
      closeForm();
      setToast({ message: t('event_features.toast.saved'), type: 'success' });
      await loadCategories();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : t('event_features.toast.error'), type: 'error' });
    } finally {
      setFormSaving(false);
    }
  };

  const saveType = async () => {
    if (!typeForm.name.trim() || !selectedCategoryId) return;
    setFormSaving(true);
    try {
      if (editingTypeId) {
        await eventFeatureApi.updateType(eventKind, eventId, editingTypeId, typeForm);
      } else {
        await eventFeatureApi.createType(eventKind, eventId, selectedCategoryId, typeForm);
      }
      closeForm();
      setToast({ message: t('event_features.toast.saved'), type: 'success' });
      await loadTypes(selectedCategoryId);
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : t('event_features.toast.error'), type: 'error' });
    } finally {
      setFormSaving(false);
    }
  };

  const saveResource = async () => {
    if (!resForm.name.trim() || !selectedTypeId) return;
    setFormSaving(true);
    try {
      if (editingResourceId) {
        await eventFeatureApi.updateResource(eventKind, eventId, editingResourceId, resForm);
      } else {
        await eventFeatureApi.createResource(eventKind, eventId, selectedTypeId, resForm);
      }
      closeForm();
      setToast({ message: t('event_features.toast.saved'), type: 'success' });
      await loadResources(selectedTypeId);
      await loadAssignments();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : t('event_features.toast.error'), type: 'error' });
    } finally {
      setFormSaving(false);
    }
  };

  const openAssignModal = (resourceId: number, resourceName: string) => {
    setAssignModal({ resourceId, resourceName });
    setMemberQuery('');
    setSelectedPersonId(null);
    setMemberResults([]);
  };

  const handleAssign = async () => {
    if (!assignModal || !selectedPersonId) return;
    setAssignSaving(true);
    try {
      await eventFeatureApi.createAssignment(eventKind, eventId, assignModal.resourceId, { personId: selectedPersonId });
      setAssignModal(null);
      setMemberQuery('');
      setSelectedPersonId(null);
      setToast({ message: t('event_features.assignments.assigned'), type: 'success' });
      if (selectedTypeId) await loadResources(selectedTypeId);
      await loadAssignments();
    } catch (e: unknown) {
      setToast({ message: e instanceof Error ? e.message : t('event_features.toast.error'), type: 'error' });
    } finally {
      setAssignSaving(false);
    }
  };

  const handleComplete = async (assignmentId: number) => {
    try {
      await eventFeatureApi.completeAssignment(eventKind, eventId, assignmentId);
      setToast({ message: t('event_features.assignments.completed'), type: 'success' });
      if (selectedTypeId) await loadResources(selectedTypeId);
      await loadAssignments();
    } catch {
      setToast({ message: t('event_features.toast.error'), type: 'error' });
    }
  };

  const handleCancelAssignment = async (assignmentId: number) => {
    try {
      await eventFeatureApi.cancelAssignment(eventKind, eventId, assignmentId);
      setToast({ message: t('event_features.assignments.cancelled'), type: 'success' });
      if (selectedTypeId) await loadResources(selectedTypeId);
      await loadAssignments();
    } catch {
      setToast({ message: t('event_features.toast.error'), type: 'error' });
    }
  };

  const filteredAssignments = assignments.filter(a =>
    !assignmentFilter || a.status === assignmentFilter
  );

  const activeCount = assignments.filter(a => a.status === 'ACTIVE').length;
  const completedCount = assignments.filter(a => a.status === 'COMPLETED').length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderResourceStatus = (res: EventResource) => {
    if (!res.assignable) return <span className="text-xs text-stone-400">—</span>;
    if (res.activeAssignmentStatus === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {t('event_features.resources.in_use')} · {res.assignedPersonName}
        </span>
      );
    }
    return <span className="text-xs font-medium text-emerald-700">{t('event_features.resources.available')}</span>;
  };

  const renderResourceActions = (res: EventResource) => (
    <>
      {res.assignable && res.activeAssignmentStatus !== 'ACTIVE' && (
        <ActionButton variant="primary" onClick={() => openAssignModal(res.id, res.name)}>
          {t('event_features.assignments.assign')}
        </ActionButton>
      )}
      {res.assignable && res.activeAssignmentId && res.activeAssignmentStatus === 'ACTIVE' && (
        <ActionButton variant="primary" onClick={() => handleComplete(res.activeAssignmentId!)}>
          {t('event_features.assignments.complete')}
        </ActionButton>
      )}
      <ActionButton variant="default" onClick={() => openResourceForm(res)}>{t('common.edit')}</ActionButton>
      <ActionButton
        variant="danger"
        onClick={() =>
          setConfirm({
            title: t('event_features.resources.delete_resource'),
            message: t('event_features.resources.delete_resource_confirm'),
            action: async () => {
              await eventFeatureApi.deleteResource(eventKind, eventId, res.id);
              if (selectedTypeId) await loadResources(selectedTypeId);
              await loadAssignments();
            },
          })
        }
      >
        {t('common.delete')}
      </ActionButton>
    </>
  );

  return (
    <div className="w-full min-w-0 space-y-5">
      <ScrollableTabs
        variant="pills"
        className="w-full"
        tabs={(
          [
            { id: 'category' as SubTab, badge: categories.length },
            { id: 'type' as SubTab, badge: types.length },
            { id: 'resource' as SubTab, badge: resources.length },
            { id: 'assignment' as SubTab, badge: activeCount || undefined },
          ] as const
        ).map(tab => ({
          id: tab.id,
          label: t(`event_features.resources.sub_tabs.${tab.id}`),
          badge: tab.badge,
        }))}
        activeId={subTab}
        onChange={id => handleSubTabChange(id as SubTab)}
      />

      {subTab === 'category' && (
        <section className="w-full min-w-0 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <TabSectionHeader
            inCard
            title={t('event_features.resources.categories')}
            subtitle={t('event_features.resources.intro')}
            action={
              <button type="button" className={EVENT_FORM_BTN_PRIMARY} onClick={() => openCategoryForm()}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('event_features.resources.add_category')}
              </button>
            }
          />

          {categories.length === 0 ? (
              <p className="px-4 sm:px-6 py-10 text-center text-stone-500 text-sm">{t('event_features.resources.no_categories')}</p>
            ) : (
              <>
                <p className="px-4 sm:px-6 pt-3 text-xs text-stone-500">{t('event_features.resources.click_row_hint')}</p>
                <ul className="md:hidden divide-y divide-stone-100">
                  {categories.map(cat => (
                    <li
                      key={cat.id}
                      className={`${selectedCategoryId === cat.id ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-500/40' : ''}`}
                    >
                      <button
                        type="button"
                        className="w-full text-left p-4 hover:bg-stone-50/80 transition-colors"
                        onClick={() => { setSelectedCategoryId(cat.id); setSelectedTypeId(null); closeForm(); }}
                      >
                        <div className="flex gap-3">
                          <SelectionIndicator selected={selectedCategoryId === cat.id} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-stone-900">{cat.name}</p>
                            {cat.description ? <p className="text-sm text-stone-500 mt-0.5">{cat.description}</p> : null}
                            <p className="text-xs text-stone-400 mt-1">{t('event_features.resources.sort_order')}: {cat.sortOrder ?? 0}</p>
                          </div>
                        </div>
                      </button>
                      <div className="px-4 pb-4">
                        <RowActions>
                          <ActionButton
                            variant="primary"
                            onClick={() => {
                              setSelectedCategoryId(cat.id);
                              setSelectedTypeId(null);
                              handleSubTabChange('type');
                            }}
                          >
                            {t('event_features.resources.view_types')}
                          </ActionButton>
                          <ActionButton variant="primary" onClick={() => openCategoryForm(cat)}>{t('common.edit')}</ActionButton>
                          <ActionButton
                            variant="danger"
                            onClick={() => setConfirm({
                              title: t('event_features.resources.delete_category'),
                              message: t('event_features.resources.delete_category_confirm'),
                              action: async () => {
                                await eventFeatureApi.deleteCategory(eventKind, eventId, cat.id);
                                if (selectedCategoryId === cat.id) { setSelectedCategoryId(null); setSelectedTypeId(null); }
                                await refreshAll();
                              },
                            })}
                          >
                            {t('common.delete')}
                          </ActionButton>
                        </RowActions>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-stone-200">
                    <thead className="bg-stone-50">
                      <tr>
                        <th className="w-10 px-4 py-3" aria-hidden />
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">{t('event_features.resources.category_name')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">{t('event_features.resources.description')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wide">{t('event_features.resources.sort_order')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wide" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {categories.map(cat => (
                        <tr
                          key={cat.id}
                          onClick={() => { setSelectedCategoryId(cat.id); setSelectedTypeId(null); closeForm(); }}
                          className={`cursor-pointer transition-colors ${selectedCategoryId === cat.id ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-500/40' : 'hover:bg-stone-50'}`}
                        >
                          <td className="px-4 py-4 text-center">
                            <SelectionIndicator selected={selectedCategoryId === cat.id} />
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-stone-900">{cat.name}</td>
                          <td className="px-6 py-4 text-sm text-stone-500">{cat.description || '—'}</td>
                          <td className="px-6 py-4 text-sm text-right text-stone-600">{cat.sortOrder ?? 0}</td>
                          <td className="px-6 py-4 text-right space-x-3" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                              onClick={() => {
                                setSelectedCategoryId(cat.id);
                                setSelectedTypeId(null);
                                handleSubTabChange('type');
                              }}
                            >
                              {t('event_features.resources.view_types')}
                            </button>
                            <button type="button" className="text-sm text-emerald-700 hover:text-emerald-900 font-medium" onClick={() => openCategoryForm(cat)}>{t('common.edit')}</button>
                            <button
                              type="button"
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                              onClick={() => setConfirm({
                                title: t('event_features.resources.delete_category'),
                                message: t('event_features.resources.delete_category_confirm'),
                                action: async () => {
                                  await eventFeatureApi.deleteCategory(eventKind, eventId, cat.id);
                                  if (selectedCategoryId === cat.id) { setSelectedCategoryId(null); setSelectedTypeId(null); }
                                  await refreshAll();
                                },
                              })}
                            >{t('common.delete')}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
        </section>
      )}

      {subTab === 'type' && (
        <section className="w-full min-w-0 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <TabSectionHeader
            inCard
            title={t('event_features.resources.types')}
            subtitle={
              selectedCategory
                ? t('event_features.resources.types_for', { name: selectedCategory.name })
                : t('event_features.resources.select_category_first')
            }
            action={
              <button
                type="button"
                className={EVENT_FORM_BTN_PRIMARY}
                disabled={!selectedCategoryId || categories.length === 0}
                onClick={() => openTypeForm()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('event_features.resources.add_type')}
              </button>
            }
          />

          {categories.length === 0 ? (
            <p className="px-4 sm:px-6 py-10 text-center text-stone-500 text-sm">{t('event_features.resources.no_categories')}</p>
          ) : (
            <>
              <div className="px-4 sm:px-6 py-4 border-b border-stone-100">
                <ResponsiveFilters className="!mb-0">
                  <label className="text-sm font-medium text-stone-700 shrink-0">{t('event_features.resources.filter_category')}</label>
                  <ResponsiveFilterSelect
                    value={selectedCategoryId ?? ''}
                    onChange={e => onCategoryFilterChange(Number(e.target.value))}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </ResponsiveFilterSelect>
                </ResponsiveFilters>
              </div>

            {!selectedCategoryId ? (
              <p className="px-6 py-8 text-center text-stone-400 text-sm">{t('event_features.resources.select_category_first')}</p>
            ) : types.length === 0 ? (
              <p className="px-4 sm:px-6 py-10 text-center text-stone-500 text-sm">{t('event_features.resources.no_types')}</p>
            ) : (
              <>
                <ul className="md:hidden divide-y divide-stone-100">
                  {types.map(ty => (
                    <li key={ty.id} className={selectedTypeId === ty.id ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-500/40' : ''}>
                      <button
                        type="button"
                        className="w-full text-left p-4 hover:bg-stone-50/80 transition-colors"
                        onClick={() => { setSelectedTypeId(ty.id); closeForm(); }}
                      >
                        <div className="flex gap-3">
                          <SelectionIndicator selected={selectedTypeId === ty.id} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-stone-900">{ty.name}</p>
                            {ty.description ? <p className="text-sm text-stone-500 mt-0.5">{ty.description}</p> : null}
                          </div>
                        </div>
                      </button>
                      <div className="px-4 pb-4">
                        <RowActions>
                          <ActionButton
                            variant="primary"
                            onClick={() => {
                              setSelectedTypeId(ty.id);
                              handleSubTabChange('resource');
                            }}
                          >
                            {t('event_features.resources.view_resources')}
                          </ActionButton>
                          <ActionButton variant="primary" onClick={() => openTypeForm(ty)}>{t('common.edit')}</ActionButton>
                          <ActionButton
                            variant="danger"
                            onClick={() => setConfirm({
                              title: t('event_features.resources.delete_type'),
                              message: t('event_features.resources.delete_type_confirm'),
                              action: async () => {
                                await eventFeatureApi.deleteType(eventKind, eventId, ty.id);
                                if (selectedTypeId === ty.id) setSelectedTypeId(null);
                                await refreshAll();
                              },
                            })}
                          >
                            {t('common.delete')}
                          </ActionButton>
                        </RowActions>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-stone-200">
                    <thead className="bg-stone-50">
                      <tr>
                        <th className="w-10 px-4 py-3" aria-hidden />
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('event_features.resources.type_name')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('event_features.resources.description')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {types.map(ty => (
                        <tr
                          key={ty.id}
                          onClick={() => { setSelectedTypeId(ty.id); closeForm(); }}
                          className={`cursor-pointer transition-colors ${selectedTypeId === ty.id ? 'bg-emerald-50 ring-2 ring-inset ring-emerald-500/40' : 'hover:bg-stone-50'}`}
                        >
                          <td className="px-4 py-4 text-center">
                            <SelectionIndicator selected={selectedTypeId === ty.id} />
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-stone-900">{ty.name}</td>
                          <td className="px-6 py-4 text-sm text-stone-500">{ty.description || '—'}</td>
                          <td className="px-6 py-4 text-right space-x-3" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                              onClick={() => {
                                setSelectedTypeId(ty.id);
                                handleSubTabChange('resource');
                              }}
                            >
                              {t('event_features.resources.view_resources')}
                            </button>
                            <button type="button" className="text-sm text-emerald-700 hover:text-emerald-900 font-medium" onClick={() => openTypeForm(ty)}>{t('common.edit')}</button>
                            <button
                              type="button"
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                              onClick={() => setConfirm({
                                title: t('event_features.resources.delete_type'),
                                message: t('event_features.resources.delete_type_confirm'),
                                action: async () => {
                                  await eventFeatureApi.deleteType(eventKind, eventId, ty.id);
                                  if (selectedTypeId === ty.id) setSelectedTypeId(null);
                                  await refreshAll();
                                },
                              })}
                            >{t('common.delete')}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            </>
          )}
        </section>
      )}

      {subTab === 'resource' && (
        <section className="w-full min-w-0 bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <TabSectionHeader
            inCard
            title={t('event_features.resources.items')}
            subtitle={
              selectedType && selectedCategory
                ? `${selectedCategory.name} / ${selectedType.name}`
                : t('event_features.resources.select_type_first')
            }
            action={
              <button
                type="button"
                className={EVENT_FORM_BTN_PRIMARY}
                disabled={!selectedTypeId}
                onClick={() => openResourceForm()}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t('event_features.resources.add_resource')}
              </button>
            }
          />

          {categories.length === 0 ? (
            <p className="px-4 sm:px-6 py-10 text-center text-stone-500 text-sm">{t('event_features.resources.no_categories')}</p>
          ) : (
            <>
              <div className="px-4 sm:px-6 py-4 border-b border-stone-100">
                <ResponsiveFilters className="!mb-0">
                  <ResponsiveFilterSelect
                    value={selectedCategoryId ?? ''}
                    onChange={e => onCategoryFilterChange(Number(e.target.value))}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </ResponsiveFilterSelect>
                  <ResponsiveFilterSelect
                    value={selectedTypeId ?? ''}
                    onChange={e => {
                      setSelectedTypeId(Number(e.target.value));
                      closeForm();
                    }}
                    disabled={!selectedCategoryId || types.length === 0}
                  >
                    {types.map(ty => (
                      <option key={ty.id} value={ty.id}>{ty.name}</option>
                    ))}
                  </ResponsiveFilterSelect>
                </ResponsiveFilters>
              </div>

            {!selectedTypeId ? (
              <p className="px-6 py-8 text-center text-stone-400 text-sm">{t('event_features.resources.select_type_first')}</p>
            ) : resources.length === 0 ? (
              <p className="px-4 sm:px-6 py-10 text-center text-stone-500 text-sm">{t('event_features.resources.no_resources')}</p>
            ) : (
              <>
                <MobileCardList>
                  {resources.map(res => (
                    <MobileCardItem key={res.id}>
                      <p className="text-sm font-semibold text-stone-900">{res.name}</p>
                      {res.description ? <p className="text-sm text-stone-500 mt-0.5">{res.description}</p> : null}
                      <div className="mt-2">{renderResourceStatus(res)}</div>
                      <RowActions>{renderResourceActions(res)}</RowActions>
                    </MobileCardItem>
                  ))}
                </MobileCardList>
                <DesktopTableWrap>
                  <table className="min-w-full divide-y divide-stone-200">
                    <thead className="bg-stone-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('event_features.resources.resource_name')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('event_features.resources.description')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('common.status')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {resources.map(res => (
                        <tr key={res.id} className="hover:bg-stone-50">
                          <td className="px-6 py-4 text-sm font-medium text-stone-900">{res.name}</td>
                          <td className="px-6 py-4 text-sm text-stone-500">{res.description || '—'}</td>
                          <td className="px-6 py-4">{renderResourceStatus(res)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end items-center gap-3 flex-wrap">
                              {res.assignable && res.activeAssignmentStatus !== 'ACTIVE' && (
                                <button type="button" className="text-sm text-emerald-700 hover:text-emerald-900 font-medium" onClick={() => openAssignModal(res.id, res.name)}>
                                  {t('event_features.assignments.assign')}
                                </button>
                              )}
                              {res.assignable && res.activeAssignmentId && res.activeAssignmentStatus === 'ACTIVE' && (
                                <button type="button" className="text-sm text-emerald-700 font-medium" onClick={() => handleComplete(res.activeAssignmentId!)}>
                                  {t('event_features.assignments.complete')}
                                </button>
                              )}
                              <button type="button" className="text-sm text-stone-600 hover:text-stone-900" onClick={() => openResourceForm(res)}>{t('common.edit')}</button>
                              <button
                                type="button"
                                className="text-sm text-red-600 hover:text-red-800"
                                onClick={() => setConfirm({
                                  title: t('event_features.resources.delete_resource'),
                                  message: t('event_features.resources.delete_resource_confirm'),
                                  action: async () => {
                                    await eventFeatureApi.deleteResource(eventKind, eventId, res.id);
                                    if (selectedTypeId) await loadResources(selectedTypeId);
                                    await loadAssignments();
                                  },
                                })}
                              >{t('common.delete')}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DesktopTableWrap>
              </>
            )}
            </>
          )}
        </section>
      )}

      {subTab === 'assignment' && (
        <div className="space-y-5">
          <TabSectionHeader
            title={t('event_features.assignments.title')}
            subtitle={t('event_features.assignments.subtitle')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
              <p className="text-sm text-stone-500">{t('event_features.assignments.active_count')}</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{activeCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
              <p className="text-sm text-stone-500">{t('event_features.assignments.completed_count')}</p>
              <p className="text-3xl font-bold text-emerald-700 mt-1">{completedCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
              <p className="text-sm text-stone-500">{t('event_features.assignments.total_count')}</p>
              <p className="text-3xl font-bold text-stone-800 mt-1">{assignments.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4">
              <label className="text-sm font-medium text-stone-700">{t('event_features.assignments.filter_status')}</label>
              <select
                className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={assignmentFilter}
                onChange={e => setAssignmentFilter(e.target.value)}
              >
                <option value="">{t('event_features.assignments.all_statuses')}</option>
                <option value="ACTIVE">{t('event_features.assignments.status_active')}</option>
                <option value="COMPLETED">{t('event_features.assignments.status_completed')}</option>
                <option value="CANCELLED">{t('event_features.assignments.status_cancelled')}</option>
              </select>
            </div>

            {filteredAssignments.length === 0 ? (
              <p className="px-4 sm:px-6 py-12 text-center text-stone-500 text-sm">{t('event_features.assignments.empty')}</p>
            ) : (
              <>
                <ul className="md:hidden divide-y divide-stone-100">
                  {filteredAssignments.map(a => (
                    <li key={a.id} className="p-4">
                      <p className="text-sm font-semibold text-stone-900">{a.resourceName}</p>
                      <p className="text-sm text-stone-600 mt-0.5">{a.personName}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <StatusBadge status={a.status} />
                        <span className="text-xs text-stone-400">
                          {a.assignedAt ? new Date(a.assignedAt).toLocaleString() : '—'}
                        </span>
                      </div>
                      {a.status === 'ACTIVE' && (
                        <RowActions>
                          <ActionButton variant="primary" onClick={() => handleComplete(a.id)}>{t('event_features.assignments.complete')}</ActionButton>
                          <ActionButton variant="default" onClick={() => handleCancelAssignment(a.id)}>{t('event_features.assignments.cancel')}</ActionButton>
                        </RowActions>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-stone-200">
                    <thead className="bg-stone-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('event_features.assignments.resource')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('event_features.assignments.member')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('common.status')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase">{t('event_features.assignments.assigned_at')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredAssignments.map(a => (
                        <tr key={a.id} className="hover:bg-stone-50">
                          <td className="px-6 py-4 text-sm font-medium text-stone-900">{a.resourceName}</td>
                          <td className="px-6 py-4 text-sm text-stone-700">{a.personName}</td>
                          <td className="px-6 py-4"><StatusBadge status={a.status} /></td>
                          <td className="px-6 py-4 text-sm text-stone-500">
                            {a.assignedAt ? new Date(a.assignedAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-6 py-4 text-right space-x-3">
                            {a.status === 'ACTIVE' && (
                              <>
                                <button type="button" className="text-sm text-emerald-700 font-medium" onClick={() => handleComplete(a.id)}>{t('event_features.assignments.complete')}</button>
                                <button type="button" className="text-sm text-stone-600 font-medium" onClick={() => handleCancelAssignment(a.id)}>{t('event_features.assignments.cancel')}</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <EventFormModal
        open={formMode === 'category'}
        onClose={closeForm}
        title={editingCategoryId ? t('event_features.resources.edit_category') : t('event_features.resources.add_category')}
        size="lg"
        footer={
          <>
            <button type="button" className={EVENT_FORM_BTN_SECONDARY} onClick={closeForm} disabled={formSaving}>{t('common.cancel')}</button>
            <button type="button" className={EVENT_FORM_BTN_PRIMARY} disabled={!catForm.name.trim() || formSaving} onClick={saveCategory}>
              {formSaving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.resources.category_name')}</label>
            <input type="text" className={EVENT_FORM_INPUT} value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.resources.description')}</label>
            <input type="text" className={EVENT_FORM_INPUT} value={catForm.description ?? ''} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.resources.sort_order')}</label>
            <input type="number" className={EVENT_FORM_INPUT} value={catForm.sortOrder ?? 0} onChange={e => setCatForm(f => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))} />
          </div>
        </div>
      </EventFormModal>

      <EventFormModal
        open={formMode === 'type'}
        onClose={closeForm}
        title={editingTypeId ? t('event_features.resources.edit_type') : t('event_features.resources.add_type')}
        subtitle={selectedCategory?.name}
        size="lg"
        footer={
          <>
            <button type="button" className={EVENT_FORM_BTN_SECONDARY} onClick={closeForm} disabled={formSaving}>{t('common.cancel')}</button>
            <button type="button" className={EVENT_FORM_BTN_PRIMARY} disabled={!typeForm.name.trim() || formSaving} onClick={saveType}>
              {formSaving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.resources.type_name')}</label>
            <input type="text" className={EVENT_FORM_INPUT} value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.resources.description')}</label>
            <input type="text" className={EVENT_FORM_INPUT} value={typeForm.description ?? ''} onChange={e => setTypeForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.resources.sort_order')}</label>
            <input type="number" className={EVENT_FORM_INPUT} value={typeForm.sortOrder ?? 0} onChange={e => setTypeForm(f => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))} />
          </div>
        </div>
      </EventFormModal>

      <EventFormModal
        open={formMode === 'resource'}
        onClose={closeForm}
        title={editingResourceId ? t('event_features.resources.edit_resource') : t('event_features.resources.add_resource')}
        subtitle={selectedType?.name}
        size="md"
        footer={
          <>
            <button type="button" className={EVENT_FORM_BTN_SECONDARY} onClick={closeForm} disabled={formSaving}>{t('common.cancel')}</button>
            <button type="button" className={EVENT_FORM_BTN_PRIMARY} disabled={!resForm.name.trim() || formSaving} onClick={saveResource}>
              {formSaving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.resources.resource_name')}</label>
            <input type="text" className={EVENT_FORM_INPUT} value={resForm.name} onChange={e => setResForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">{t('event_features.resources.description')}</label>
            <input type="text" className={EVENT_FORM_INPUT} value={resForm.description ?? ''} onChange={e => setResForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <label className="flex items-start gap-3 p-3 rounded-lg border border-stone-200 bg-stone-50 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              checked={!!resForm.assignable}
              onChange={e => setResForm(f => ({ ...f, assignable: e.target.checked }))}
            />
            <div>
              <span className="text-sm font-medium text-stone-800">{t('event_features.resources.assignable')}</span>
              <p className="text-xs text-stone-500 mt-0.5">{t('event_features.resources.assignable_hint')}</p>
            </div>
          </label>
        </div>
      </EventFormModal>

      <EventFormModal
        open={assignModal !== null}
        onClose={() => setAssignModal(null)}
        title={t('event_features.assignments.modal_title')}
        subtitle={assignModal?.resourceName}
        footer={
          <>
            <button type="button" className={EVENT_FORM_BTN_SECONDARY} onClick={() => setAssignModal(null)} disabled={assignSaving}>{t('common.cancel')}</button>
            <button type="button" className={EVENT_FORM_BTN_PRIMARY} disabled={!selectedPersonId || assignSaving} onClick={handleAssign}>
              {assignSaving ? t('common.saving') : t('event_features.assignments.assign')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600">{t('event_features.assignments.modal_hint')}</p>
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
          {memberSearchLoading && <p className="text-xs text-stone-500">{t('common.loading')}</p>}
          {memberResults.length > 0 && (
            <ul className="border border-stone-200 rounded-lg divide-y divide-stone-100 max-h-48 overflow-y-auto bg-white shadow-sm">
              {memberResults.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 transition-colors ${selectedPersonId === Number(p.id) ? 'bg-emerald-50 text-emerald-900' : 'text-stone-800'}`}
                    onClick={() => {
                      setSelectedPersonId(Number(p.id));
                      setMemberQuery(`${p.firstName} ${p.lastName ?? ''}`.trim());
                      setMemberResults([]);
                    }}
                  >
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    {p.email && <span className="block text-xs text-stone-500 mt-0.5">{p.email}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </EventFormModal>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={async () => {
          if (confirm) {
            try {
              await confirm.action();
              setToast({ message: t('event_features.toast.deleted'), type: 'success' });
            } catch (e: unknown) {
              setToast({ message: e instanceof Error ? e.message : t('event_features.toast.error'), type: 'error' });
            }
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

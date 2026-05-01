'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useDateFormat } from '@/lib/DateFormatContext';
import DateInput from '@/components/DateInput';
import { expenseApi, ExpenseDTO, ExpenseTagDTO, ExpenseAuditEventDTO, ExpenseAuditLogPageDTO } from '@/lib/expenseApi';
import { currencyApi, OrganizationCurrencyDTO } from '@/lib/currencyApi';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import RecordAttachmentsPanel from '@/components/RecordAttachmentsPanel';

type Tab = 'details' | 'attachments' | 'audit';

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params?.id);
  const { can } = useAuth();
  const { formatDate } = useDateFormat();

  const canView = can('expense.view');
  const canManage = can('expense.manage');

  const [expense, setExpense] = useState<ExpenseDTO | null>(null);
  const [currencies, setCurrencies] = useState<OrganizationCurrencyDTO[]>([]);
  const [allTags, setAllTags] = useState<ExpenseTagDTO[]>([]);
  const [auditLog, setAuditLog] = useState<ExpenseAuditEventDTO[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [auditTotalPages, setAuditTotalPages] = useState(0);
  const [auditTotalElements, setAuditTotalElements] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // Form fields
  const [expenseDate, setExpenseDate] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyId, setCurrencyId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialogs
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadAuditLogPage = useCallback(async (page: number) => {
    const safePage = Math.max(0, page);
    setAuditLoading(true);
    try {
      const result: ExpenseAuditLogPageDTO = await expenseApi.getAuditLog(id, { page: safePage, size: auditPageSize });
      setAuditLog(result.content || []);
      setAuditPage(result.number ?? safePage);
      setAuditTotalPages(result.totalPages ?? 0);
      setAuditTotalElements(result.totalElements ?? 0);
    } finally {
      setAuditLoading(false);
    }
  }, [id, auditPageSize]);

  const loadExpense = useCallback(async () => {
    try {
      const data = await expenseApi.getById(id);
      setExpense(data);
      // Populate form
      setExpenseDate(data.expenseDate);
      setAmount(String(data.amount));
      setCurrencyId(data.currencyId);
      setTitle(data.title);
      setNotes(data.notes ?? '');
      setSelectedTagIds(data.tags.map((t) => t.id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load expense';
      setToast({ message, type: 'error' });
    }
  }, [id]);

  useEffect(() => {
    if (!canView) return;
    async function init() {
      setLoading(true);
      try {
        const [currList, tagList, log] = await Promise.all([
          currencyApi.getActiveOrganizationCurrencies(),
          expenseApi.listTags(),
          expenseApi.getAuditLog(id, { page: 0, size: auditPageSize }),
        ]);
        setCurrencies(currList);
        setAllTags(tagList);
        setAuditLog(log.content || []);
        setAuditPage(log.number ?? 0);
        setAuditTotalPages(log.totalPages ?? 0);
        setAuditTotalElements(log.totalElements ?? 0);
        await loadExpense();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setToast({ message, type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [canView, id, loadExpense, auditPageSize]);

  function toggleTag(tagId: number) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((i) => i !== tagId) : [...prev, tagId]
    );
  }

  async function handleCreateTag() {
    const name = newTagInput.trim();
    if (!name) return;
    setCreatingTag(true);
    try {
      const created = await expenseApi.createTag(name);
      setAllTags((prev) => [...prev, created]);
      setSelectedTagIds((prev) => [...prev, created.id]);
      setNewTagInput('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      setToast({ message, type: 'error' });
    } finally {
      setCreatingTag(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseDate || !amount || !currencyId || !title.trim()) {
      setToast({ message: 'Please fill in all required fields.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const updated = await expenseApi.update(id, {
        expenseDate,
        amount: parseFloat(amount),
        currencyId: currencyId as number,
        title: title.trim(),
        notes: notes.trim() || undefined,
        tagIds: selectedTagIds,
      });
      setExpense(updated);
      await loadAuditLogPage(0);
      setToast({ message: 'Expense updated successfully.', type: 'success' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save expense';
      setToast({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteReason.trim()) return;
    try {
      await expenseApi.softDelete(id, deleteReason.trim());
      router.push('/expenses');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete expense';
      setToast({ message, type: 'error' });
      setShowDeleteDialog(false);
    }
  }

  async function handleRestore() {
    try {
      const updated = await expenseApi.restore(id);
      setExpense(updated);
      await loadAuditLogPage(0);
      setToast({ message: 'Expense restored successfully.', type: 'success' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to restore expense';
      setToast({ message, type: 'error' });
    } finally {
      setShowRestoreDialog(false);
    }
  }

  async function handleAuditPrevPage() {
    if (auditPage <= 0 || auditLoading) return;
    await loadAuditLogPage(auditPage - 1);
  }

  async function handleAuditNextPage() {
    if (auditLoading || auditPage + 1 >= auditTotalPages) return;
    await loadAuditLogPage(auditPage + 1);
  }

  async function handleAuditFirstPage() {
    if (auditLoading || auditPage === 0) return;
    await loadAuditLogPage(0);
  }

  async function handleAuditLastPage() {
    if (auditLoading || auditTotalPages <= 1 || auditPage + 1 >= auditTotalPages) return;
    await loadAuditLogPage(auditTotalPages - 1);
  }

  async function handleAuditPageSizeChange(nextSize: number) {
    if (auditLoading || nextSize === auditPageSize) return;
    setAuditPageSize(nextSize);
    setAuditPage(0);
    setAuditTotalPages(0);
    setAuditTotalElements(0);
    setAuditLog([]);
  }

  function formatEventType(type: string) {
    return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
  }

  if (!canView) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          You do not have permission to view expenses.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Expense not found.</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Expense"
        message={
          <div className="space-y-3">
            <p>Are you sure you want to delete this expense? Please provide a reason.</p>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              placeholder="Reason for deletion (required)..."
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-y"
            />
          </div>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteDialog(false); setDeleteReason(''); }}
      />

      {/* Restore dialog */}
      <ConfirmDialog
        open={showRestoreDialog}
        title="Restore Expense"
        message="Are you sure you want to restore this expense?"
        confirmLabel="Restore"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={handleRestore}
        onCancel={() => setShowRestoreDialog(false)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-stone-900">{expense.title}</h1>
            {expense.deleted && (
              <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs border border-red-200">Deleted</span>
            )}
          </div>
          <p className="text-stone-500 text-sm mt-1">{formatDate(expense.expenseDate)}</p>
        </div>
        {canManage && (
          <div className="flex gap-2 shrink-0">
            {expense.deleted ? (
              <button
                onClick={() => setShowRestoreDialog(true)}
                className="px-3 py-2 text-sm font-medium text-amber-700 hover:text-amber-900 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
              >
                Restore
              </button>
            ) : (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-800 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              onClick={() => router.push('/expenses')}
              className="px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Back
            </button>
          </div>
        )}
        {!canManage && (
          <button
            onClick={() => router.push('/expenses')}
            className="px-3 py-2 text-sm font-medium text-stone-600 hover:text-stone-800 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            Back
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-200 mb-6">
        <div className="flex gap-0">
          {(['details', 'attachments', 'audit'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab === 'audit' ? 'Audit Log' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Details */}
      {activeTab === 'details' && (
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
          {expense.deleted && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              This expense is deleted{expense.deletionReason ? `: "${expense.deletionReason}"` : ''}.
              {canManage && ' Use the Restore button to reinstate it.'}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <DateInput
              value={expenseDate}
              onChange={setExpenseDate}
              required
              disabled={!canManage || expense.deleted}
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
              required
              disabled={!canManage || expense.deleted}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-50 disabled:text-stone-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
                required
                disabled={!canManage || expense.deleted}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-50 disabled:text-stone-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                value={currencyId}
                onChange={(e) => setCurrencyId(Number(e.target.value))}
                required
                disabled={!canManage || expense.deleted}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-50 disabled:text-stone-500"
              >
                <option value="">Select currency</option>
                {currencies.map((c) => (
                  <option key={c.currencyId} value={c.currencyId}>
                    {c.currencyCode} — {c.currencyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={!canManage || expense.deleted}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-50 disabled:text-stone-500 resize-y"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Tags</label>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {allTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={!canManage || expense.deleted}
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:cursor-not-allowed ${
                      selectedTagIds.includes(tag.id)
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-500'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
            {canManage && !expense.deleted && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag(); } }}
                  placeholder="Create new tag..."
                  className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagInput.trim() || creatingTag}
                  className="px-3 py-2 text-sm bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg border border-stone-300 disabled:opacity-50 transition-colors"
                >
                  {creatingTag ? '...' : 'Add'}
                </button>
              </div>
            )}
          </div>

          {canManage && !expense.deleted && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Tab: Attachments */}
      {activeTab === 'attachments' && (
        <RecordAttachmentsPanel entityType="EXPENSE" entityId={id} />
      )}

      {/* Tab: Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs text-stone-500">
              {auditTotalElements} event{auditTotalElements === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <label className="text-xs text-stone-500">Rows:</label>
              <select
                value={auditPageSize}
                onChange={(e) => handleAuditPageSizeChange(Number(e.target.value))}
                disabled={auditLoading}
                className="px-2 py-1.5 text-xs border border-stone-300 rounded-md text-stone-600 bg-white disabled:opacity-50"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <button
                type="button"
                onClick={handleAuditFirstPage}
                disabled={auditLoading || auditPage === 0}
                className="px-2.5 py-1.5 text-xs font-medium text-stone-600 border border-stone-300 rounded-md hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                type="button"
                onClick={handleAuditPrevPage}
                disabled={auditLoading || auditPage === 0}
                className="px-2.5 py-1.5 text-xs font-medium text-stone-600 border border-stone-300 rounded-md hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-stone-500 min-w-[90px] text-center">
                Page {auditTotalPages === 0 ? 0 : auditPage + 1} of {auditTotalPages}
              </span>
              <button
                type="button"
                onClick={handleAuditNextPage}
                disabled={auditLoading || auditPage + 1 >= auditTotalPages}
                className="px-2.5 py-1.5 text-xs font-medium text-stone-600 border border-stone-300 rounded-md hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                type="button"
                onClick={handleAuditLastPage}
                disabled={auditLoading || auditTotalPages <= 1 || auditPage + 1 >= auditTotalPages}
                className="px-2.5 py-1.5 text-xs font-medium text-stone-600 border border-stone-300 rounded-md hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>

          {auditLoading ? (
            <div className="text-center py-10 text-stone-400 text-sm">Loading...</div>
          ) : auditLog.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-sm">No audit records found.</div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {auditLog.map((event) => (
                <li key={event.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
                  <span className="font-medium text-stone-800 shrink-0">{formatEventType(event.eventType)}</span>
                  <span className="text-stone-500 shrink-0">by {event.actorName || 'System'}</span>
                  {event.detail && <span className="text-stone-500 truncate flex-1">{event.detail}</span>}
                  <span className="text-stone-400 text-xs shrink-0 sm:ml-auto">
                    {formatDate(event.occurredAt)}
                    {event.occurredAt?.includes('T') && ` ${event.occurredAt.split('T')[1].substring(0, 5)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

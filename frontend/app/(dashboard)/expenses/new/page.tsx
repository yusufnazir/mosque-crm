'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import DateInput from '@/components/DateInput';
import { expenseApi, ExpenseTagDTO } from '@/lib/expenseApi';
import { currencyApi, OrganizationCurrencyDTO } from '@/lib/currencyApi';
import ToastNotification from '@/components/ToastNotification';

export default function NewExpensePage() {
  const router = useRouter();
  const { can } = useAuth();
  const canManage = can('expense.manage');

  const [currencies, setCurrencies] = useState<OrganizationCurrencyDTO[]>([]);
  const [tags, setTags] = useState<ExpenseTagDTO[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // Form fields
  const [expenseDate, setExpenseDate] = useState('');
  const [amount, setAmount] = useState('');
  const [currencyId, setCurrencyId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [currList, tagList] = await Promise.all([
          currencyApi.getActiveOrganizationCurrencies(),
          expenseApi.listTags(),
        ]);
        setCurrencies(currList);
        setTags(tagList);
        if (currList.length > 0) {
          const primary = currList.find((c) => c.isPrimary) ?? currList[0];
          setCurrencyId(primary.currencyId);
        }
        // Default to today
        setExpenseDate(new Date().toISOString().split('T')[0]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setToast({ message, type: 'error' });
      }
    }
    if (canManage) loadData();
  }, [canManage]);

  function toggleTag(tagId: number) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleCreateTag() {
    const name = newTagInput.trim();
    if (!name) return;
    setCreatingTag(true);
    try {
      const created = await expenseApi.createTag(name);
      setTags((prev) => [...prev, created]);
      setSelectedTagIds((prev) => [...prev, created.id]);
      setNewTagInput('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      setToast({ message, type: 'error' });
    } finally {
      setCreatingTag(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!expenseDate || !amount || !currencyId || !title.trim()) {
      setToast({ message: 'Please fill in all required fields.', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const created = await expenseApi.create({
        expenseDate,
        amount: parseFloat(amount),
        currencyId: currencyId as number,
        title: title.trim(),
        notes: notes.trim() || undefined,
        tagIds: selectedTagIds,
      });
      router.push(`/expenses/${created.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save expense';
      setToast({ message, type: 'error' });
      setSaving(false);
    }
  }

  if (!canManage) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          You do not have permission to create expenses.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">New Expense</h1>
        <p className="text-stone-500 text-sm mt-1">Add a new expense record</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <DateInput
            value={expenseDate}
            onChange={setExpenseDate}
            required
            className="text-sm"
          />
        </div>

        {/* Title */}
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
            placeholder="e.g. Office supplies"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Amount + Currency */}
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
              placeholder="0.00"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes about this expense"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">Tags</label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
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
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/expenses')}
            className="px-4 py-2 text-sm font-medium text-stone-700 hover:text-stone-900 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
}

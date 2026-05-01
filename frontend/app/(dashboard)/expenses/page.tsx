'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useDateFormat } from '@/lib/DateFormatContext';
import DateInput from '@/components/DateInput';
import { expenseApi, ExpenseDTO, ExpenseTagDTO } from '@/lib/expenseApi';
import ToastNotification from '@/components/ToastNotification';
import { formatCurrencyAmount } from '@/lib/currencyDisplay';

export default function ExpensesPage() {
  const router = useRouter();
  const { can } = useAuth();
  const { formatDate } = useDateFormat();

  const canView = can('expense.view');
  const canManage = can('expense.manage');

  const [expenses, setExpenses] = useState<ExpenseDTO[]>([]);
  const [tags, setTags] = useState<ExpenseTagDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expenseList, tagList] = await Promise.all([
        expenseApi.list({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
          includeDeleted: includeDeleted || undefined,
        }),
        expenseApi.listTags(),
      ]);
      setExpenses(expenseList);
      setTags(tagList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load expenses';
      setToast({ message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedTagIds, includeDeleted]);

  useEffect(() => {
    if (canView) {
      loadData();
    }
  }, [canView, loadData]);

  function toggleTagFilter(tagId: number) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  function formatAmount(amount: number, code?: string, symbol?: string) {
    return formatCurrencyAmount(amount, { currencyCode: code, currencySymbol: symbol });
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

  return (
    <div className="p-8">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Expenses</h1>
          <p className="text-stone-500 text-sm mt-1">Track organisational expenditures</p>
        </div>
        {canManage && (
          <button
            onClick={() => router.push('/expenses/new')}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Expense
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Date from</label>
            <DateInput
              value={dateFrom}
              onChange={setDateFrom}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Date to</label>
            <DateInput
              value={dateTo}
              onChange={setDateTo}
              className="text-sm"
            />
          </div>
          {canManage && (
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(e) => setIncludeDeleted(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-stone-700">Show deleted</span>
              </label>
            </div>
          )}
        </div>

        {tags.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Filter by tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTagFilter(tag.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-500'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
              {selectedTagIds.length > 0 && (
                <button
                  onClick={() => setSelectedTagIds([])}
                  className="px-3 py-1 rounded-full text-xs font-medium text-stone-500 hover:text-stone-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-lg font-medium">No expenses found</p>
          <p className="text-sm mt-1">Adjust your filters or add a new expense.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-stone-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-stone-600">Title</th>
                  <th className="px-4 py-3 text-right font-semibold text-stone-600">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-stone-600">Tags</th>
                  <th className="px-4 py-3 text-left font-semibold text-stone-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    onClick={() => router.push(`/expenses/${expense.id}`)}
                    className={`cursor-pointer hover:bg-stone-50 transition-colors ${expense.deleted ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3 text-stone-700 whitespace-nowrap">{formatDate(expense.expenseDate)}</td>
                    <td className="px-4 py-3 text-stone-900 font-medium">{expense.title}</td>
                    <td className="px-4 py-3 text-right font-mono text-stone-800 whitespace-nowrap">
                      {formatAmount(expense.amount, expense.currencyCode, expense.currencySymbol)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {expense.tags.map((tag) => (
                          <span key={tag.id} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs border border-amber-200">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {expense.deleted && (
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs border border-red-200">Deleted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                onClick={() => router.push(`/expenses/${expense.id}`)}
                className={`bg-white rounded-xl border border-stone-200 p-4 cursor-pointer hover:border-emerald-400 transition-colors ${expense.deleted ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-semibold text-stone-900 text-sm">{expense.title}</span>
                  {expense.deleted && (
                    <span className="shrink-0 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-xs border border-red-200">Deleted</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>{formatDate(expense.expenseDate)}</span>
                  <span className="font-mono font-medium text-stone-800">
                    {formatAmount(expense.amount, expense.currencyCode, expense.currencySymbol)}
                  </span>
                </div>
                {expense.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {expense.tags.map((tag) => (
                      <span key={tag.id} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs border border-amber-200">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

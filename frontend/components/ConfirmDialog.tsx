'use client';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable confirmation dialog component.
 *
 * Use this instead of browser `confirm()` for all destructive or important actions.
 * See copilot-instructions.md for usage guidelines.
 *
 * @example
 * <ConfirmDialog
 *   open={showDeleteConfirm}
 *   title={t('common.confirm_delete_title')}
 *   message={t('users.confirm_delete')}
 *   confirmLabel={t('common.delete')}
 *   variant="danger"
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowDeleteConfirm(false)}
 * />
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmButtonClass =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : variant === 'warning'
        ? 'bg-amber-600 text-white hover:bg-amber-700'
        : 'bg-emerald-700 text-white hover:bg-emerald-800';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-bold text-stone-900 mb-2">{title}</h3>
        <p className="text-stone-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-stone-600 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

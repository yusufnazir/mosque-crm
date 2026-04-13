'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { joinRequestApi, JoinRequestDTO } from '@/lib/joinRequestApi';
import ConfirmDialog from '@/components/ConfirmDialog';
import ToastNotification from '@/components/ToastNotification';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function MemberRequestDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [request, setRequest] = useState<JoinRequestDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Approve confirm
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  // Reject flow
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    try {
      const data = await joinRequestApi.getById(id);
      setRequest(data);
    } catch {
      setToast({ message: t('member_requests.load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (id) fetchRequest();
  }, [id, fetchRequest]);

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await joinRequestApi.review(id, 'approve');
      setToast({ message: t('member_requests.approved_success'), type: 'success' });
      setShowApproveConfirm(false);
      window.dispatchEvent(new Event('requests:updated'));
      fetchRequest();
    } catch {
      setToast({ message: t('member_requests.approve_error'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await joinRequestApi.review(id, 'reject', rejectionReason || undefined);
      setToast({ message: t('member_requests.rejected_success'), type: 'success' });
      setShowRejectConfirm(false);
      window.dispatchEvent(new Event('requests:updated'));
      fetchRequest();
    } catch {
      setToast({ message: t('member_requests.reject_error'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const goBack = () => router.push('/member-requests');

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-6 md:p-8">
        <button onClick={goBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t('member_requests.back_to_list')}
        </button>
        <p className="text-gray-500 text-center py-12">{t('member_requests.load_error')}</p>
      </div>
    );
  }

  const initials = `${request.firstName[0] ?? ''}${request.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      {/* Back button */}
      <button onClick={goBack} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-700 mb-8 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        {t('member_requests.back_to_list')}
      </button>

      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="text-emerald-700 text-lg font-bold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-charcoal">{request.firstName} {request.lastName}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-700'}`}>
                {t(`member_requests.status_${request.status.toLowerCase()}`)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{request.email}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {t('member_requests.col_date')}: {new Date(request.submittedAt).toLocaleString()}
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-charcoal">{t('member_requests.detail_title')}</h2>
        </div>

        <div>
          {/* Personal */}
          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
            <DetailField label={t('member_requests.col_name')} value={`${request.firstName} ${request.lastName}`} />
            {request.gender && <DetailField label={t('register_member.gender')} value={request.gender} />}
            {request.dateOfBirth && <DetailField label={t('register_member.date_of_birth')} value={request.dateOfBirth} />}
            {request.idNumber && <DetailField label={t('register_member.id_number')} value={request.idNumber} />}
          </div>

          {/* Contact */}
          {(request.phone || request.email) && (
            <div>
              <div className="px-6">
                <div className="border-t border-gray-100" />
              </div>
              <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <DetailField label={t('member_requests.col_email')} value={request.email} />
                {request.phone && <DetailField label={t('register_member.phone')} value={request.phone} />}
              </div>
            </div>
          )}

          {/* Address */}
          {(request.address || request.city || request.postalCode || request.country) && (
            <div>
              <div className="px-6">
                <div className="border-t border-gray-100" />
              </div>
              <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                {request.address && <DetailField label={t('register_member.address')} value={request.address} />}
                {request.city && <DetailField label={t('register_member.city')} value={request.city} />}
                {request.postalCode && <DetailField label={t('register_member.postal_code')} value={request.postalCode} />}
                {request.country && <DetailField label={t('register_member.country')} value={request.country} />}
              </div>
            </div>
          )}

          {(request.termsVersionNumber || request.termsAcceptedAt || request.termsTitle) && (
            <div>
              <div className="px-6">
                <div className="border-t border-gray-100" />
              </div>
              <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                {request.termsTitle && <DetailField label={t('member_requests.terms_title')} value={request.termsTitle} />}
                {request.termsVersionNumber && <DetailField label={t('member_requests.terms_version')} value={t('member_requests.terms_version_value', { version: String(request.termsVersionNumber) })} />}
                {request.termsAcceptedAt && <DetailField label={t('member_requests.terms_accepted_at')} value={new Date(request.termsAcceptedAt).toLocaleString()} />}
              </div>
            </div>
          )}
        </div>

        {/* Review info */}
        {request.reviewedBy && (
          <div className="border-t border-gray-100">
            <div className="px-6 pt-4 pb-1">
              <h3 className="text-sm font-semibold text-gray-500">{t('member_requests.review_info')}</h3>
            </div>
            <div className="px-6 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 mt-3">
              <DetailField label={t('member_requests.reviewed_by')} value={request.reviewedBy} />
              {request.reviewedAt && <DetailField label={t('member_requests.reviewed_at')} value={new Date(request.reviewedAt).toLocaleString()} />}
              {request.rejectionReason && (
                <div className="sm:col-span-2">
                  <DetailField label={t('member_requests.rejection_reason')} value={request.rejectionReason} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {request.status === 'PENDING' && (
        <div className="flex gap-3">
          <button
            onClick={() => setShowApproveConfirm(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 active:scale-95 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {t('member_requests.approve')}
          </button>
          <button
            onClick={() => { setRejectionReason(''); setShowRejectConfirm(true); }}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 active:scale-95 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            {t('member_requests.reject')}
          </button>
        </div>
      )}

      {/* Approve confirm dialog */}
      <ConfirmDialog
        open={showApproveConfirm}
        title={t('member_requests.approve_confirm_title')}
        message={t('member_requests.approve_confirm_message')}
        confirmLabel={actionLoading ? t('common.loading') : t('member_requests.approve')}
        cancelLabel={t('common.cancel')}
        variant="default"
        onConfirm={handleApprove}
        onCancel={() => setShowApproveConfirm(false)}
      />

      {/* Reject modal (with reason textarea) */}
      {showRejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-charcoal mb-2">{t('member_requests.reject_confirm_title')}</h2>
            <p className="text-gray-600 text-sm mb-4">{t('member_requests.reject_confirm_message')}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-charcoal mb-1">{t('member_requests.rejection_reason_label')}</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-transparent transition text-sm"
                placeholder={t('member_requests.rejection_reason_placeholder')}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectConfirm(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {actionLoading ? t('common.loading') : t('member_requests.reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500 mb-1">{label}</dt>
      <dd className="text-gray-900">{value}</dd>
    </div>
  );
}

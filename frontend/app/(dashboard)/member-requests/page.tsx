'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { joinRequestApi, JoinRequestDTO } from '@/lib/joinRequestApi';
import ConfirmDialog from '@/components/ConfirmDialog';
import ToastNotification from '@/components/ToastNotification';

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function MemberRequestsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [requests, setRequests] = useState<JoinRequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');

  // Rejection flow
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pendingRejectId, setPendingRejectId] = useState<number | null>(null);

  // Approve confirm
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [pendingApproveId, setPendingApproveId] = useState<number | null>(null);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [actionLoading, setActionLoading] = useState(false);

  // Invite flow
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteSending(true);
    try {
      await joinRequestApi.invite(inviteEmail.trim());
      setShowInviteModal(false);
      setInviteEmail('');
      setToast({ message: t('members.invite_success'), type: 'success' });
    } catch {
      setToast({ message: t('members.invite_error'), type: 'error' });
    } finally {
      setInviteSending(false);
    }
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const status = statusFilter === 'ALL' ? undefined : statusFilter;
      const data = await joinRequestApi.getAll(status);
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setToast({ message: t('member_requests.load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openDetail = (req: JoinRequestDTO) => {
    router.push(`/member-requests/${req.id}`);
  };

  const initiateApprove = (id: number) => {
    setPendingApproveId(id);
    setShowApproveConfirm(true);
  };

  const initiateReject = (id: number) => {
    setPendingRejectId(id);
    setRejectionReason('');
    setShowRejectConfirm(true);
  };

  const initiateDelete = (id: number) => {
    setPendingDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleApprove = async () => {
    if (!pendingApproveId) return;
    setActionLoading(true);
    try {
      await joinRequestApi.review(pendingApproveId, 'approve');
      setToast({ message: t('member_requests.approved_success'), type: 'success' });
      setShowApproveConfirm(false);
      window.dispatchEvent(new Event('requests:updated'));
      fetchRequests();
    } catch (error) {
      setToast({ message: extractApiErrorMessage(error, t('member_requests.approve_error')), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const extractApiErrorMessage = (error: unknown, fallback: string): string => {
    if (!(error instanceof Error) || !error.message) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(error.message) as { error?: string; message?: string };
      return parsed.error || parsed.message || fallback;
    } catch {
      return error.message || fallback;
    }
  };

  const handleReject = async () => {
    if (!pendingRejectId) return;
    setActionLoading(true);
    try {
      await joinRequestApi.review(pendingRejectId, 'reject', rejectionReason || undefined);
      setToast({ message: t('member_requests.rejected_success'), type: 'success' });
      setShowRejectConfirm(false);
      window.dispatchEvent(new Event('requests:updated'));
      fetchRequests();
    } catch {
      setToast({ message: t('member_requests.reject_error'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setActionLoading(true);
    try {
      await joinRequestApi.remove(pendingDeleteId);
      setToast({ message: t('member_requests.deleted_success'), type: 'success' });
      setShowDeleteConfirm(false);
      window.dispatchEvent(new Event('requests:updated'));
      fetchRequests();
    } catch {
      setToast({ message: t('member_requests.delete_error'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'PENDING', label: t('member_requests.tab_pending') },
    { key: 'APPROVED', label: t('member_requests.tab_approved') },
    { key: 'REJECTED', label: t('member_requests.tab_rejected') },
    { key: 'ALL', label: t('member_requests.tab_all') },
  ];

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">{t('member_requests.title')}</h1>
          <p className="text-gray-600 mt-1">{t('member_requests.subtitle')}</p>
        </div>
        <button
          onClick={() => { setInviteEmail(''); setShowInviteModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {t('members.invite')}
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
              statusFilter === tab.key
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="font-medium">{t('member_requests.empty')}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('member_requests.col_name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('member_requests.col_email')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('member_requests.col_date')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('member_requests.col_status')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('member_requests.col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(req)}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{req.firstName} {req.lastName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{req.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(req.submittedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-700'}`}>
                        {t(`member_requests.status_${req.status.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {req.status === 'PENDING' && (
                          <>
                          <button
                            onClick={() => initiateApprove(req.id)}
                            className="text-xs px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
                          >
                            {t('member_requests.approve')}
                          </button>
                          <button
                            onClick={() => initiateReject(req.id)}
                            className="text-xs px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                          >
                            {t('member_requests.reject')}
                          </button>
                          </>
                        )}
                        {req.status !== 'APPROVED' && (
                          <button
                            onClick={() => initiateDelete(req.id)}
                            className="text-xs px-3 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition"
                          >
                            {t('member_requests.delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer"
                onClick={() => openDetail(req)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{req.firstName} {req.lastName}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{req.email}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(req.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-700'}`}>
                    {t(`member_requests.status_${req.status.toLowerCase()}`)}
                  </span>
                </div>
                <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                  {req.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => initiateApprove(req.id)}
                        className="flex-1 text-sm py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                      >
                        {t('member_requests.approve')}
                      </button>
                      <button
                        onClick={() => initiateReject(req.id)}
                        className="flex-1 text-sm py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        {t('member_requests.reject')}
                      </button>
                    </>
                  )}
                  {req.status !== 'APPROVED' && (
                    <button
                      onClick={() => initiateDelete(req.id)}
                      className="flex-1 text-sm py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition"
                    >
                      {t('member_requests.delete')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
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

      <ConfirmDialog
        open={showDeleteConfirm}
        title={t('member_requests.delete_confirm_title')}
        message={t('member_requests.delete_confirm_message')}
        confirmLabel={actionLoading ? t('common.loading') : t('member_requests.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
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

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-charcoal mb-1">{t('members.invite_title')}</h2>
            <p className="text-gray-600 text-sm mb-4">{t('members.invite_description')}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-charcoal mb-1">{t('members.invite_email_label')}</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendInvite(); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
                placeholder={t('members.invite_email_placeholder')}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSendInvite}
                disabled={inviteSending || !inviteEmail.trim()}
                className="flex-1 bg-emerald-700 text-white py-2 rounded-lg font-medium hover:bg-emerald-800 transition disabled:opacity-50"
              >
                {inviteSending ? t('members.invite_sending') : t('members.invite_send')}
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

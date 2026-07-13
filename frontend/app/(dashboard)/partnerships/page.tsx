'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import ConfirmDialog from '@/components/ConfirmDialog';
import ToastNotification from '@/components/ToastNotification';
import {
  OrganizationDiscoveryDTO,
  OrganizationPartnershipDTO,
  OrganizationShareSettingDTO,
  partnershipApi,
} from '@/lib/partnershipApi';
import { copyToClipboard } from '@/lib/utils';

type ActionType = 'accept' | 'approve' | 'reject' | 'end' | null;

export default function PartnershipsPage() {
  const { t } = useTranslation();
  const { user, can, selectedOrganization } = useAuth();
  const orgId = selectedOrganization?.id ?? user?.organizationId;
  const canManage = can('partnership.manage');

  const [partnerships, setPartnerships] = useState<OrganizationPartnershipDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCodeLoading, setInviteCodeLoading] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<OrganizationDiscoveryDTO[]>([]);
  const [selectedHandle, setSelectedHandle] = useState('');
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmAction, setConfirmAction] = useState<ActionType>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);

  const loadPartnerships = useCallback(async () => {
    setLoading(true);
    try {
      const data = await partnershipApi.list();
      setPartnerships(Array.isArray(data) ? data : []);
    } catch {
      setToast({ message: t('partnerships.load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPartnerships();
  }, [loadPartnerships]);

  // One-time recovery: re-send alerts for pending invites/requests that never reached admins
  // (cross-org tenant filter bug). Runs once per partnership id in this browser.
  useEffect(() => {
    if (!canManage || !orgId || partnerships.length === 0) return;
    partnerships.forEach((p) => {
      const actionableInvite = p.status === 'PENDING_INVITE' && p.memberOrganizationId === orgId;
      const actionableRequest = p.status === 'PENDING_REQUEST' && p.parentOrganizationId === orgId;
      if (!actionableInvite && !actionableRequest) return;
      const key = `partnership-alert-recovered-${p.id}`;
      try {
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, '1');
      } catch {
        return;
      }
      partnershipApi
        .resendNotification(p.id)
        .then(() => {
          window.dispatchEvent(new Event('notifications:updated'));
        })
        .catch(() => {
          try {
            localStorage.removeItem(key);
          } catch {
            /* ignore */
          }
        });
    });
  }, [partnerships, orgId, canManage]);

  const resendNotification = async (id: number) => {
    try {
      await partnershipApi.resendNotification(id);
      setToast({ message: t('partnerships.resend_notification_success'), type: 'success' });
      window.dispatchEvent(new Event('notifications:updated'));
    } catch {
      setToast({ message: t('partnerships.resend_notification_error'), type: 'error' });
    }
  };

  const loadInviteCode = useCallback(async () => {
    if (!canManage) return;
    setInviteCodeLoading(true);
    try {
      const data = await partnershipApi.getInviteCode();
      setInviteCode(data.inviteCode);
    } catch {
      setToast({ message: t('partnerships.invite_code_error'), type: 'error' });
    } finally {
      setInviteCodeLoading(false);
    }
  }, [canManage, t]);

  useEffect(() => {
    loadInviteCode();
  }, [loadInviteCode]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      partnershipApi.discover(query)
        .then((results) => setSearchResults(Array.isArray(results) ? results : []))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const code = inviteCodeInput.trim().toUpperCase();
    if (!code.startsWith('FED-') || code.length < 6) {
      return;
    }
    const timer = setTimeout(() => {
      partnershipApi.discover(code)
        .then((results) => {
          if (results.length === 1) {
            setSelectedHandle(results[0].handle);
          }
        })
        .catch(() => undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteCodeInput]);

  const copyInviteCode = async () => {
    if (!inviteCode) return;
    try {
      const ok = await copyToClipboard(inviteCode);
      if (ok) {
        setToast({ message: t('partnerships.invite_code_copied'), type: 'success' });
      } else {
        setToast({ message: t('partnerships.invite_code_error'), type: 'error' });
      }
    } catch {
      setToast({ message: t('partnerships.invite_code_error'), type: 'error' });
    }
  };

  const regenerateInviteCode = async () => {
    setActionLoading(true);
    try {
      const data = await partnershipApi.regenerateInviteCode();
      setInviteCode(data.inviteCode);
      setShowRegenerateConfirm(false);
      setToast({ message: t('partnerships.invite_code_regenerated'), type: 'success' });
    } catch {
      setToast({ message: t('partnerships.invite_code_error'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedHandle && !inviteCodeInput.trim()) return;
    setActionLoading(true);
    try {
      await partnershipApi.invite({
        orgHandle: selectedHandle || undefined,
        inviteCode: inviteCodeInput.trim() || undefined,
        message: message || undefined,
      });
      setShowInviteModal(false);
      setSelectedHandle('');
      setInviteCodeInput('');
      setMessage('');
      setSearchQuery('');
      setToast({ message: t('partnerships.invite_success'), type: 'success' });
      loadPartnerships();
    } catch {
      setToast({ message: t('partnerships.invite_error'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!selectedHandle && !inviteCodeInput.trim()) return;
    setActionLoading(true);
    try {
      await partnershipApi.requestToJoin({
        orgHandle: selectedHandle || undefined,
        inviteCode: inviteCodeInput.trim() || undefined,
        message: message || undefined,
      });
      setShowRequestModal(false);
      setSelectedHandle('');
      setInviteCodeInput('');
      setMessage('');
      setSearchQuery('');
      setToast({ message: t('partnerships.request_success'), type: 'success' });
      loadPartnerships();
    } catch {
      setToast({ message: t('partnerships.request_error'), type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmTargetId || !confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction === 'accept') await partnershipApi.accept(confirmTargetId);
      if (confirmAction === 'approve') await partnershipApi.approve(confirmTargetId);
      if (confirmAction === 'reject') await partnershipApi.reject(confirmTargetId);
      if (confirmAction === 'end') await partnershipApi.end(confirmTargetId);
      setToast({ message: t('partnerships.action_success'), type: 'success' });
      loadPartnerships();
    } catch {
      setToast({ message: t('partnerships.action_error'), type: 'error' });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
      setConfirmTargetId(null);
    }
  };

  const updateShareSetting = async (
    partnershipId: number,
    setting: OrganizationShareSettingDTO,
    enabled: boolean,
    shareLevel?: string
  ) => {
    try {
      await partnershipApi.updateShareSetting(partnershipId, setting.moduleKey, {
        enabled,
        shareLevel: (shareLevel as OrganizationShareSettingDTO['shareLevel']) || setting.shareLevel,
      });
      setToast({ message: t('partnerships.share_updated'), type: 'success' });
      loadPartnerships();
    } catch {
      setToast({ message: t('partnerships.share_update_error'), type: 'error' });
    }
  };

  const isParent = (p: OrganizationPartnershipDTO) => orgId != null && p.parentOrganizationId === orgId;
  const isMember = (p: OrganizationPartnershipDTO) => orgId != null && p.memberOrganizationId === orgId;

  const renderPartnerLabel = (p: OrganizationPartnershipDTO) => {
    if (isParent(p)) {
      return p.memberOrganizationName || p.memberOrganizationHandle || `#${p.memberOrganizationId}`;
    }
    return p.parentOrganizationName || p.parentOrganizationHandle || `#${p.parentOrganizationId}`;
  };

  const renderSearchPicker = () => (
    <div className="space-y-3">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={t('partnerships.search_placeholder')}
        className="w-full border border-gray-300 rounded-lg px-3 py-2"
      />
      {searchResults.length > 0 && (
        <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
          {searchResults.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => {
                setSelectedHandle(org.handle);
                setSearchQuery(org.name);
                setSearchResults([]);
              }}
              className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selectedHandle === org.handle ? 'bg-emerald-50' : ''}`}
            >
              <div className="font-medium">{org.name}</div>
              <div className="text-sm text-gray-500">@{org.handle}</div>
            </button>
          ))}
        </div>
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t('partnerships.message_placeholder')}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[80px]"
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('partnerships.join_by_code_label')}</label>
        <input
          type="text"
          value={inviteCodeInput}
          onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
          placeholder={t('partnerships.join_by_code_placeholder')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono"
        />
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('partnerships.title')}</h1>
          <p className="text-gray-600 mt-1">{t('partnerships.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowInviteModal(true); setSelectedHandle(''); setInviteCodeInput(''); setMessage(''); setSearchQuery(''); }}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
          >
            {t('partnerships.invite_org')}
          </button>
          <button
            onClick={() => { setShowRequestModal(true); setSelectedHandle(''); setInviteCodeInput(''); setMessage(''); setSearchQuery(''); }}
            className="px-4 py-2 border border-emerald-700 text-emerald-700 rounded-lg hover:bg-emerald-50"
          >
            {t('partnerships.request_join')}
          </button>
        </div>
      </div>

      {canManage && (
        <div className="bg-white border border-emerald-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">{t('partnerships.invite_code_label')}</h2>
          <p className="text-sm text-gray-600 mb-3">{t('partnerships.invite_code_hint')}</p>
          {inviteCodeLoading ? (
            <p className="text-gray-500 text-sm">{t('common.loading')}</p>
          ) : inviteCode ? (
            <div className="flex flex-wrap items-center gap-3">
              <code className="px-3 py-2 bg-gray-100 rounded-lg font-mono text-lg tracking-wide">{inviteCode}</code>
              <button onClick={copyInviteCode} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                {t('partnerships.invite_code_copy')}
              </button>
              <button onClick={() => setShowRegenerateConfirm(true)} className="px-3 py-2 border border-amber-300 text-amber-800 rounded-lg text-sm hover:bg-amber-50">
                {t('partnerships.invite_code_regenerate')}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">{t('common.loading')}</p>
      ) : partnerships.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          {t('partnerships.empty')}
        </div>
      ) : (
        <div className="space-y-4">
          {partnerships.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{renderPartnerLabel(p)}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {isParent(p) ? t('partnerships.role_parent') : t('partnerships.role_member')}
                    {' · '}
                    {t(`partnerships.status.${p.status}`)}
                  </p>
                  {p.message && <p className="text-sm text-gray-600 mt-2">{p.message}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.status === 'PENDING_INVITE' && isMember(p) && (
                    <>
                      <button onClick={() => { setConfirmAction('accept'); setConfirmTargetId(p.id); }} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm">{t('partnerships.accept')}</button>
                      <button onClick={() => { setConfirmAction('reject'); setConfirmTargetId(p.id); }} className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-sm">{t('partnerships.reject')}</button>
                    </>
                  )}
                  {p.status === 'PENDING_REQUEST' && isParent(p) && (
                    <>
                      <button onClick={() => { setConfirmAction('approve'); setConfirmTargetId(p.id); }} className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm">{t('partnerships.approve')}</button>
                      <button onClick={() => { setConfirmAction('reject'); setConfirmTargetId(p.id); }} className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-sm">{t('partnerships.reject')}</button>
                    </>
                  )}
                  {(p.status === 'PENDING_INVITE' && isParent(p) && canManage) && (
                    <button
                      type="button"
                      onClick={() => resendNotification(p.id)}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                    >
                      {t('partnerships.resend_notification')}
                    </button>
                  )}
                  {(p.status === 'PENDING_REQUEST' && isMember(p) && canManage) && (
                    <button
                      type="button"
                      onClick={() => resendNotification(p.id)}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                    >
                      {t('partnerships.resend_notification')}
                    </button>
                  )}
                  {(p.status === 'ACTIVE' || p.status === 'SUSPENDED') && (
                    <button onClick={() => { setConfirmAction('end'); setConfirmTargetId(p.id); }} className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm">{t('partnerships.end')}</button>
                  )}
                </div>
              </div>

              {p.status === 'ACTIVE' && isMember(p) && p.shareSettings && p.shareSettings.length > 0 && (() => {
                const partnerName =
                  p.parentOrganizationName || p.parentOrganizationHandle || t('partnerships.role_member');
                return (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">
                        {t('partnerships.share_settings')}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('partnerships.share_intro', { partner: partnerName })}
                      </p>
                    </div>
                    {p.shareSettings.map((setting) => {
                      const audienceValue =
                        setting.shareLevel === 'PUBLIC' ? 'SIBLINGS' : setting.shareLevel;
                      return (
                        <div
                          key={setting.id}
                          className="rounded-lg border border-stone-200 bg-stone-50/80 p-3 space-y-2"
                        >
                          <label className="flex items-start gap-3 text-sm text-stone-800">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={setting.enabled}
                              onChange={(e) => updateShareSetting(p.id, setting, e.target.checked)}
                            />
                            <span>
                              <span className="font-medium block">
                                {t(`partnerships.modules.${setting.moduleKey}`)}
                              </span>
                              <span className="text-stone-600 text-xs">
                                {t(`partnerships.module_enable.${setting.moduleKey}`)}
                              </span>
                            </span>
                          </label>
                          {setting.enabled && (
                            <div className="pl-7 space-y-1">
                              <label className="block text-xs font-medium text-stone-700">
                                {t('partnerships.share_audience_label')}
                              </label>
                              <select
                                value={audienceValue}
                                onChange={(e) =>
                                  updateShareSetting(p.id, setting, true, e.target.value)
                                }
                                className="w-full max-w-md border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                              >
                                <option value="PARENT_ONLY">
                                  {t('partnerships.share_level.parent_only', { partner: partnerName })}
                                </option>
                                <option value="SIBLINGS">
                                  {t('partnerships.share_level.siblings', { partner: partnerName })}
                                </option>
                              </select>
                              <p className="text-[11px] text-stone-500">
                                {t(`partnerships.module_hint.${setting.moduleKey}`)}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <p className="text-xs text-gray-500">{t('partnerships.share_hint')}</p>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {(showInviteModal || showRequestModal) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">
              {showInviteModal ? t('partnerships.invite_org') : t('partnerships.request_join')}
            </h2>
            {renderSearchPicker()}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowInviteModal(false); setShowRequestModal(false); }}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                disabled={(!selectedHandle && !inviteCodeInput.trim()) || actionLoading}
                onClick={showInviteModal ? handleInvite : handleRequest}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg disabled:opacity-50"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showRegenerateConfirm}
        title={t('partnerships.invite_code_regenerate')}
        message={t('partnerships.invite_code_regenerate_confirm')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={regenerateInviteCode}
        onCancel={() => setShowRegenerateConfirm(false)}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        title={t('partnerships.confirm_title')}
        message={t('partnerships.confirm_message')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        variant={confirmAction === 'reject' || confirmAction === 'end' ? 'danger' : 'default'}
        onConfirm={runConfirmedAction}
        onCancel={() => { setConfirmAction(null); setConfirmTargetId(null); }}
      />

      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

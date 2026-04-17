'use client';

import { useEffect, useState, useCallback } from 'react';
import Button from '@/components/Button';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  RecordAttachmentApi,
  DocumentApi,
  DocumentLinkDTO,
  DocumentDTO,
  DocumentLinkedEntityType,
} from '@/lib/documentApi';

interface RecordAttachmentsPanelProps {
  entityType: DocumentLinkedEntityType;
  entityId: number;
  className?: string;
}

export default function RecordAttachmentsPanel({ entityType, entityId, className }: RecordAttachmentsPanelProps) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const canManage = can('document.manage');

  const [links, setLinks] = useState<DocumentLinkDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<DocumentDTO[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<DocumentLinkDTO | null>(null);
  const [note, setNote] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(undefined);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadLinks = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      setLinks(await RecordAttachmentApi.getLinksForEntity(entityType, entityId));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const openPicker = async () => {
    setShowPickerModal(true);
    setPickerLoading(true);
    try {
      setAvailableDocs(await DocumentApi.list());
    } finally {
      setPickerLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedDocId) return;
    setLinking(true);
    try {
      await RecordAttachmentApi.link({ documentId: selectedDocId, entityType, entityId, note: note || undefined });
      setToast({ message: t('documents.attachSuccess'), type: 'success' });
      setShowPickerModal(false);
      setSelectedDocId(undefined);
      setNote('');
      loadLinks();
    } catch {
      setToast({ message: t('documents.attachError'), type: 'error' });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (link: DocumentLinkDTO) => {
    try {
      await RecordAttachmentApi.unlink(link.id);
      setToast({ message: t('documents.unlinkSuccess'), type: 'success' });
      loadLinks();
    } catch {
      setToast({ message: t('documents.unlinkError'), type: 'error' });
    }
    setUnlinkTarget(null);
  };

  const handleDownload = async (docId: number) => {
    try {
      const res = await DocumentApi.getDownloadUrl(docId);
      window.open(res.downloadUrl, '_blank');
    } catch {
      setToast({ message: t('documents.downloadError'), type: 'error' });
    }
  };

  return (
    <div className={className}>
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <ConfirmDialog
        open={!!unlinkTarget}
        title={t('documents.unlinkTitle')}
        message={t('documents.unlinkMessage')}
        confirmLabel={t('documents.unlink')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={() => unlinkTarget && handleUnlink(unlinkTarget)}
        onCancel={() => setUnlinkTarget(null)}
      />

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-700">{t('documents.attachments')}</h3>
        {canManage && (
          <Button variant="ghost" size="sm" onClick={openPicker}>
            + {t('documents.attach')}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-stone-400">{t('common.loading')}</p>
      ) : links.length === 0 ? (
        <p className="text-xs text-stone-400">{t('documents.noAttachments')}</p>
      ) : (
        <ul className="space-y-2">
          {links.map(link => (
            <li key={link.id} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-stone-700 font-medium truncate max-w-xs">
                {link.document?.title || `Document #${link.documentId}`}
              </span>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                {link.document?.documentType === 'FILE' && (
                  <button
                    onClick={() => handleDownload(link.documentId)}
                    className="text-emerald-600 hover:text-emerald-800 text-xs"
                  >
                    {t('documents.download')}
                  </button>
                )}
                {canManage && (
                  <button
                    onClick={() => setUnlinkTarget(link)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    {t('documents.unlink')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Document Picker Modal */}
      {showPickerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">{t('documents.attachDocument')}</h2>

            {pickerLoading ? (
              <p className="text-stone-400">{t('common.loading')}</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('documents.selectDocument')}</label>
                  <select
                    value={selectedDocId ?? ''}
                    onChange={e => setSelectedDocId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">{t('documents.selectDocumentPlaceholder')}</option>
                    {availableDocs.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('documents.noteOptional')}</label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                    placeholder={t('documents.notePlaceholder')}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="ghost" size="sm" onClick={() => setShowPickerModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleLink}
                disabled={!selectedDocId || linking}
              >
                {linking ? t('common.saving') : t('documents.attach')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

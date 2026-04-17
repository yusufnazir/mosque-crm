'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import Button from '@/components/Button';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';
import {
  DocumentApi,
  DocumentFolderApi,
  DocumentDTO,
  DocumentFolder,
  DocumentDetailDTO,
} from '@/lib/documentApi';

type View = 'browser' | 'trash';

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const { hasFeature } = useSubscription();
  const canView = can('document.view') && hasFeature('document.management');
  const canManage = can('document.manage') && hasFeature('document.management');
  const canUpload = can('document.upload') && hasFeature('document.management');

  const [view, setView] = useState<View>('browser');
  const [currentFolderId, setCurrentFolderId] = useState<number | undefined>(undefined);
  const [folderPath, setFolderPath] = useState<DocumentFolder[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetailDTO | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentDTO | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const loadContents = useCallback(async (folderId?: number) => {
    if (!canView) return;
    setLoading(true);
    try {
      const [foldersRes, docsRes] = await Promise.all([
        folderId != null ? DocumentFolderApi.listSubFolders(folderId) : DocumentFolderApi.listRoot(),
        DocumentApi.list(folderId),
      ]);
      setFolders(Array.isArray(foldersRes) ? foldersRes : []);
      setDocuments(Array.isArray(docsRes) ? docsRes : []);
    } catch {
      setToast({ message: t('documents.loadError'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [canView, t]);

  useEffect(() => {
    if (view === 'browser') {
      loadContents(currentFolderId);
    }
  }, [view, currentFolderId, loadContents]);

  const loadTrash = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await DocumentApi.listTrash();
      setDocuments(Array.isArray(res) ? res : []);
    } catch {
      setToast({ message: t('documents.loadError'), type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [canView, t]);

  useEffect(() => {
    if (view === 'trash') loadTrash();
  }, [view, loadTrash]);

  const openFolder = (folder: DocumentFolder) => {
    setFolderPath(prev => [...prev, folder]);
    setCurrentFolderId(folder.id);
  };

  const navigateTo = (index: number) => {
    if (index < 0) {
      setFolderPath([]);
      setCurrentFolderId(undefined);
    } else {
      const path = folderPath.slice(0, index + 1);
      setFolderPath(path);
      setCurrentFolderId(path[path.length - 1].id);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      await DocumentApi.uploadFile(uploadFile, {
        title: uploadTitle || uploadFile.name,
        folderId: currentFolderId,
      });
      setToast({ message: t('documents.uploadSuccess'), type: 'success' });
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      loadContents(currentFolderId);
    } catch {
      setToast({ message: t('documents.uploadError'), type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await DocumentFolderApi.create({ name: newFolderName.trim(), parentFolderId: currentFolderId });
      setToast({ message: t('documents.folderCreated'), type: 'success' });
      setShowNewFolderModal(false);
      setNewFolderName('');
      loadContents(currentFolderId);
    } catch {
      setToast({ message: t('documents.folderCreateError'), type: 'error' });
    }
  };

  const handleTrash = async (doc: DocumentDTO) => {
    try {
      await DocumentApi.trash(doc.id);
      setToast({ message: t('documents.trashed'), type: 'success' });
      loadContents(currentFolderId);
    } catch {
      setToast({ message: t('documents.trashError'), type: 'error' });
    }
    setDeleteTarget(null);
  };

  const handleRestore = async (doc: DocumentDTO) => {
    try {
      await DocumentApi.restore(doc.id);
      setToast({ message: t('documents.restored'), type: 'success' });
      loadTrash();
    } catch {
      setToast({ message: t('documents.restoreError'), type: 'error' });
    }
  };

  const handlePermanentDelete = async (doc: DocumentDTO) => {
    try {
      await DocumentApi.permanentDelete(doc.id);
      setToast({ message: t('documents.deleted'), type: 'success' });
      loadTrash();
    } catch {
      setToast({ message: t('documents.deleteError'), type: 'error' });
    }
    setDeleteTarget(null);
  };

  const handleDownload = async (doc: DocumentDTO) => {
    try {
      const res = await DocumentApi.getDownloadUrl(doc.id);
      window.open(res.downloadUrl, '_blank');
    } catch {
      setToast({ message: t('documents.downloadError'), type: 'error' });
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!canView) {
    return (
      <div className="p-8">
        <p className="text-stone-500">{t('common.noPermission')}</p>
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

      <ConfirmDialog
        open={!!deleteTarget}
        title={view === 'trash' ? t('documents.permanentDeleteTitle') : t('documents.trashTitle')}
        message={view === 'trash' ? t('documents.permanentDeleteMessage') : t('documents.trashMessage')}
        confirmLabel={view === 'trash' ? t('common.deleteForever') : t('common.moveToTrash')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={() => deleteTarget && (view === 'trash' ? handlePermanentDelete(deleteTarget) : handleTrash(deleteTarget))}
        onCancel={() => setDeleteTarget(null)}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{t('documents.title')}</h1>
          <p className="text-stone-500 mt-1">{t('documents.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'browser' ? 'primary' : 'ghost'}
            onClick={() => setView('browser')}
            size="sm"
          >
            {t('documents.browser')}
          </Button>
          <Button
            variant={view === 'trash' ? 'primary' : 'ghost'}
            onClick={() => setView('trash')}
            size="sm"
          >
            {t('documents.trash')}
          </Button>
        </div>
      </div>

      {view === 'browser' && (
        <>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm text-stone-500 mb-4">
            <button onClick={() => navigateTo(-1)} className="hover:text-emerald-700 font-medium">
              {t('documents.root')}
            </button>
            {folderPath.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                <span>/</span>
                <button
                  onClick={() => navigateTo(i)}
                  className="hover:text-emerald-700 font-medium"
                >
                  {f.name}
                </button>
              </span>
            ))}
          </nav>

          {/* Toolbar */}
          {(canManage || canUpload) && (
            <div className="flex gap-2 mb-4">
              {canManage && (
                <Button variant="ghost" size="sm" onClick={() => setShowNewFolderModal(true)}>
                  + {t('documents.newFolder')}
                </Button>
              )}
              {canUpload && (
                <Button variant="primary" size="sm" onClick={() => setShowUploadModal(true)}>
                  {t('documents.uploadFile')}
                </Button>
              )}
            </div>
          )}

          {loading ? (
            <p className="text-stone-400">{t('common.loading')}</p>
          ) : (
            <Card>
              <CardContent className="p-0">
                {folders.length === 0 && documents.length === 0 ? (
                  <p className="p-6 text-stone-400 text-center">{t('documents.empty')}</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100 text-stone-500 text-left">
                        <th className="px-4 py-3">{t('documents.name')}</th>
                        <th className="px-4 py-3">{t('documents.type')}</th>
                        <th className="px-4 py-3">{t('documents.size')}</th>
                        <th className="px-4 py-3">{t('documents.status')}</th>
                        <th className="px-4 py-3">{t('common.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {folders.map(folder => (
                        <tr key={`folder-${folder.id}`} className="border-b border-stone-50 hover:bg-stone-50">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openFolder(folder)}
                              className="text-emerald-700 hover:underline flex items-center gap-2 font-medium"
                            >
                              📁 {folder.name}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-stone-400">{t('documents.folder')}</td>
                          <td className="px-4 py-3">—</td>
                          <td className="px-4 py-3">—</td>
                          <td className="px-4 py-3">
                            {canManage && (
                              <button
                                onClick={() => DocumentFolderApi.delete(folder.id).then(() => loadContents(currentFolderId))}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                {t('common.delete')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {documents.map(doc => (
                        <tr key={`doc-${doc.id}`} className="border-b border-stone-50 hover:bg-stone-50">
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2">
                              {doc.documentType === 'FILE' ? '📄' : '📝'} {doc.title}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-stone-500">
                            {doc.documentType === 'FILE' ? (doc.mimeType || 'FILE') : 'RICH TEXT'}
                          </td>
                          <td className="px-4 py-3 text-stone-500">{formatSize(doc.fileSize)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              doc.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                              doc.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-stone-100 text-stone-600'
                            }`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 flex items-center gap-2">
                            {doc.documentType === 'FILE' && (
                              <button
                                onClick={() => handleDownload(doc)}
                                className="text-emerald-600 hover:text-emerald-800 text-xs"
                              >
                                {t('documents.download')}
                              </button>
                            )}
                            {canManage && (
                              <button
                                onClick={() => setDeleteTarget(doc)}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                {t('common.trash')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {view === 'trash' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('documents.trash')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-stone-400">{t('common.loading')}</p>
            ) : documents.length === 0 ? (
              <p className="p-6 text-stone-400 text-center">{t('documents.trashEmpty')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-500 text-left">
                    <th className="px-4 py-3">{t('documents.name')}</th>
                    <th className="px-4 py-3">{t('documents.deletedAt')}</th>
                    <th className="px-4 py-3">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} className="border-b border-stone-50 hover:bg-stone-50">
                      <td className="px-4 py-3">{doc.title}</td>
                      <td className="px-4 py-3 text-stone-400">
                        {doc.deletedAt ? new Date(doc.deletedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleRestore(doc)}
                              className="text-emerald-600 hover:text-emerald-800 text-xs"
                            >
                              {t('documents.restore')}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(doc)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              {t('documents.permanentDelete')}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">{t('documents.uploadFile')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('documents.file')}</label>
                <input
                  type="file"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-emerald-50 file:text-emerald-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('documents.title')}</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder={uploadFile?.name || t('documents.titlePlaceholder')}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button variant="ghost" size="sm" onClick={() => setShowUploadModal(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="primary" size="sm" onClick={handleUpload} disabled={!uploadFile || uploading}>
                  {uploading ? t('common.uploading') : t('documents.upload')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-stone-800 mb-4">{t('documents.newFolder')}</h2>
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder={t('documents.folderNamePlaceholder')}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowNewFolderModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                {t('common.create')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

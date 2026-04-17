'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';
import Button from '@/components/Button';
import {
  communicationApi,
  CommunicationMessageDTO,
  CommunicationTemplateDTO,
  SendMessageRequest,
} from '@/lib/communicationApi';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSubscription } from '@/lib/subscription/SubscriptionContext';

type Tab = 'compose' | 'history' | 'templates';

export default function CommunicationsPage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const { hasFeature } = useSubscription();
  const canManage = can('communication.manage') && hasFeature('communication.tools');
  const canView = can('communication.view') && hasFeature('communication.tools');

  const [activeTab, setActiveTab] = useState<Tab>('compose');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ---- Compose state ----
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [recipientType, setRecipientType] = useState('ALL_MEMBERS');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | undefined>(undefined);
  const [sending, setSending] = useState(false);

  // ---- History state ----
  const [messages, setMessages] = useState<CommunicationMessageDTO[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagePage, setMessagePage] = useState(0);
  const [messageTotalPages, setMessageTotalPages] = useState(0);

  // ---- Templates state ----
  const [templates, setTemplates] = useState<CommunicationTemplateDTO[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplateDTO | null>(null);
  const [tmplName, setTmplName] = useState('');
  const [tmplSubject, setTmplSubject] = useState('');
  const [tmplBody, setTmplBody] = useState('');
  const [tmplCategory, setTmplCategory] = useState('');
  const [tmplSaving, setTmplSaving] = useState(false);
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState<CommunicationTemplateDTO | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchMessages = useCallback(async (page = 0) => {
    setMessagesLoading(true);
    try {
      const data = await communicationApi.listMessages(page, 20);
      setMessages(Array.isArray(data?.content) ? data.content : []);
      setMessageTotalPages(data?.totalPages ?? 0);
      setMessagePage(page);
    } catch {
      showToast(t('communications.error_load_history'), 'error');
    } finally {
      setMessagesLoading(false);
    }
  }, [t]);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const res = await communicationApi.listTemplates();
      setTemplates(Array.isArray(res) ? res : []);
    } catch {
      showToast(t('communications.error_load_templates'), 'error');
    } finally {
      setTemplatesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (activeTab === 'history') fetchMessages(0);
    if (activeTab === 'templates') fetchTemplates();
    if (activeTab === 'compose') fetchTemplates();
  }, [activeTab, fetchMessages, fetchTemplates]);

  // ---- Compose ----
  const handleSend = async () => {
    if (!subject.trim() || !bodyHtml.trim()) {
      showToast(t('communications.error_required_fields'), 'error');
      return;
    }
    setSending(true);
    try {
      const req: SendMessageRequest = {
        subject,
        bodyHtml,
        recipientType,
        templateId: selectedTemplateId,
      };
      const result = await communicationApi.send(req);
      if (result.status === 'SENT') {
        showToast(t('communications.send_success', { count: result.totalRecipients ?? 0 }), 'success');
      } else {
        showToast(t('communications.send_failed'), 'error');
      }
      setSubject('');
      setBodyHtml('');
      setSelectedTemplateId(undefined);
    } catch {
      showToast(t('communications.send_failed'), 'error');
    } finally {
      setSending(false);
    }
  };

  const handleLoadTemplate = (tmplId: number) => {
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setBodyHtml(tmpl.bodyHtml);
      setSelectedTemplateId(tmpl.id);
    }
  };

  // ---- Templates CRUD ----
  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTmplName('');
    setTmplSubject('');
    setTmplBody('');
    setTmplCategory('');
    setShowTemplateForm(true);
  };

  const openEditTemplate = (tmpl: CommunicationTemplateDTO) => {
    setEditingTemplate(tmpl);
    setTmplName(tmpl.name);
    setTmplSubject(tmpl.subject);
    setTmplBody(tmpl.bodyHtml);
    setTmplCategory(tmpl.category || '');
    setShowTemplateForm(true);
  };

  const handleSaveTemplate = async () => {
    if (!tmplName.trim() || !tmplSubject.trim() || !tmplBody.trim()) {
      showToast(t('communications.error_required_fields'), 'error');
      return;
    }
    setTmplSaving(true);
    try {
      const dto: CommunicationTemplateDTO = {
        name: tmplName,
        subject: tmplSubject,
        bodyHtml: tmplBody,
        category: tmplCategory || undefined,
      };
      if (editingTemplate?.id) {
        await communicationApi.updateTemplate(editingTemplate.id, dto);
        showToast(t('communications.template_updated'), 'success');
      } else {
        await communicationApi.createTemplate(dto);
        showToast(t('communications.template_created'), 'success');
      }
      setShowTemplateForm(false);
      await fetchTemplates();
    } catch {
      showToast(t('communications.error_save_template'), 'error');
    } finally {
      setTmplSaving(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateConfirm?.id) return;
    try {
      await communicationApi.deleteTemplate(deleteTemplateConfirm.id);
      showToast(t('communications.template_deleted'), 'success');
      setDeleteTemplateConfirm(null);
      await fetchTemplates();
    } catch {
      showToast(t('communications.error_delete_template'), 'error');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const statusBadge = (status?: string) => {
    switch (status) {
      case 'SENT':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium">SENT</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-medium">FAILED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 font-medium">DRAFT</span>;
    }
  };

  if (!canView) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {t('common.access_denied')}
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'compose', label: t('communications.tab_compose') },
    { key: 'history', label: t('communications.tab_history') },
    { key: 'templates', label: t('communications.tab_templates') },
  ];

  return (
    <div className="p-8">
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete template confirm */}
      <ConfirmDialog
        open={!!deleteTemplateConfirm}
        title={t('communications.delete_template_title')}
        message={t('communications.delete_template_confirm', { name: deleteTemplateConfirm?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={handleDeleteTemplate}
        onCancel={() => setDeleteTemplateConfirm(null)}
      />

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">
          {t('communications.title')}
        </h1>
        <p className="text-gray-600">{t('communications.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ===== COMPOSE TAB ===== */}
      {activeTab === 'compose' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('communications.compose_title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Load from template */}
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('communications.load_template')}
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  value={selectedTemplateId ?? ''}
                  onChange={(e) => e.target.value ? handleLoadTemplate(Number(e.target.value)) : undefined}
                >
                  <option value="">{t('communications.no_template')}</option>
                  {templates.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('communications.recipients')} <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value)}
              >
                <option value="ALL_MEMBERS">{t('communications.all_members')}</option>
                <option value="ACTIVE_MEMBERS">{t('communications.active_members')}</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('communications.subject')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('communications.subject_placeholder')}
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('communications.body')} <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-48 font-mono"
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder={t('communications.body_placeholder')}
              />
              <p className="text-xs text-gray-500 mt-1">{t('communications.variable_hint')}</p>
            </div>

            {canManage && (
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSend}
                  disabled={sending || !subject.trim() || !bodyHtml.trim()}
                >
                  {sending ? t('communications.sending') : t('communications.send_button')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== HISTORY TAB ===== */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('communications.history_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {messagesLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">{t('communications.no_history')}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-3 py-3 text-gray-600 font-medium">{t('communications.subject')}</th>
                        <th className="text-left px-3 py-3 text-gray-600 font-medium">{t('communications.recipients')}</th>
                        <th className="text-left px-3 py-3 text-gray-600 font-medium">{t('communications.status')}</th>
                        <th className="text-left px-3 py-3 text-gray-600 font-medium">{t('communications.sent_at')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {messages.map((msg) => (
                        <tr key={msg.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-3 font-medium text-charcoal">{msg.subject}</td>
                          <td className="px-3 py-3 text-gray-600">{msg.totalRecipients ?? 0}</td>
                          <td className="px-3 py-3">{statusBadge(msg.status)}</td>
                          <td className="px-3 py-3 text-gray-600">{formatDate(msg.sentAt || msg.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {messageTotalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="secondary"
                      onClick={() => fetchMessages(messagePage - 1)}
                      disabled={messagePage === 0}
                    >
                      {t('common.previous')}
                    </Button>
                    <span className="text-sm text-gray-600 self-center">
                      {messagePage + 1} / {messageTotalPages}
                    </span>
                    <Button
                      variant="secondary"
                      onClick={() => fetchMessages(messagePage + 1)}
                      disabled={messagePage + 1 >= messageTotalPages}
                    >
                      {t('common.next')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== TEMPLATES TAB ===== */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Template form */}
          {showTemplateForm && canManage && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingTemplate ? t('communications.edit_template') : t('communications.new_template')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('communications.template_name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={tmplName}
                    onChange={(e) => setTmplName(e.target.value)}
                    placeholder={t('communications.template_name_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('communications.category')}
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={tmplCategory}
                    onChange={(e) => setTmplCategory(e.target.value)}
                    placeholder={t('communications.category_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('communications.subject')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    value={tmplSubject}
                    onChange={(e) => setTmplSubject(e.target.value)}
                    placeholder={t('communications.subject_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('communications.body')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-40 font-mono"
                    value={tmplBody}
                    onChange={(e) => setTmplBody(e.target.value)}
                    placeholder={t('communications.body_placeholder')}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setShowTemplateForm(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button variant="primary" onClick={handleSaveTemplate} disabled={tmplSaving}>
                    {tmplSaving ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Templates list */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('communications.templates_title')}</CardTitle>
              {canManage && !showTemplateForm && (
                <Button variant="primary" onClick={openCreateTemplate}>
                  {t('communications.new_template')}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2].map((i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">{t('communications.no_templates')}</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {templates.map((tmpl) => (
                    <div key={tmpl.id} className="py-4 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-charcoal">{tmpl.name}</p>
                        <p className="text-sm text-gray-500 truncate">{tmpl.subject}</p>
                        {tmpl.category && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                            {tmpl.category}
                          </span>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex gap-2 shrink-0">
                          <Button variant="secondary" onClick={() => openEditTemplate(tmpl)}>
                            {t('common.edit')}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => setDeleteTemplateConfirm(tmpl)}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

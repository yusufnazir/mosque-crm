'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { messageApi, ConversationSummaryDTO, MessageDTO, SendMessageDTO, InboxPageDTO, ThreadKey } from '@/lib/messageApi';
import { userApi, UserDTO } from '@/lib/userApi';
import ToastNotification from '@/components/ToastNotification';
import ConfirmDialog from '@/components/ConfirmDialog';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function threadKey(conv: ConversationSummaryDTO): string {
  return `${conv.otherUserId}::${conv.baseSubject}`;
}

export default function InboxPage() {
  const { t } = useTranslation();

  // Inbox state
  const [conversations, setConversations] = useState<ConversationSummaryDTO[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const pageSize = 20;

  // Selection
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Thread view
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showMobileThread, setShowMobileThread] = useState(false);

  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [compose, setCompose] = useState<Partial<SendMessageDTO>>({});
  const [sending, setSending] = useState(false);

  // Toast & confirm
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  // Reply
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Sync indeterminate state on select-all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      const some = selectedKeys.size > 0 && selectedKeys.size < conversations.length;
      selectAllRef.current.indeterminate = some;
    }
  }, [selectedKeys, conversations.length]);

  /* ───────── Data loading ───────── */

  const loadInbox = useCallback(async (p = page) => {
    try {
      const data: InboxPageDTO = await messageApi.getInbox(p, pageSize);
      setConversations(data.content ?? []);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
      setPage(data.page);
    } catch {
      // Silently fail
    } finally {
      setLoadingInbox(false);
    }
  }, [page]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const loadConversation = useCallback(async (otherUserId: number, baseSubject?: string) => {
    setLoadingMessages(true);
    try {
      const data = await messageApi.getConversation(otherUserId, baseSubject || undefined);
      setMessages(Array.isArray(data) ? data : []);
      setConversations((prev) =>
        prev.map((c) => (c.otherUserId === otherUserId && c.baseSubject === baseSubject ? { ...c, unreadCount: 0 } : c))
      );
      window.dispatchEvent(new Event('inbox:read'));
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, []);

  /* ───────── Selection ───────── */

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === conversations.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(conversations.map(threadKey)));
    }
  };

  const getSelectedThreads = (): ThreadKey[] =>
    conversations
      .filter((c) => selectedKeys.has(threadKey(c)))
      .map((c) => ({ otherUserId: c.otherUserId, baseSubject: c.baseSubject }));

  /* ───────── Actions ───────── */

  const handleSelectConversation = (otherUserId: number, baseSubject: string) => {
    setSelectedUserId(otherUserId);
    setSelectedSubject(baseSubject);
    setReplyText('');
    setShowMobileThread(true);
    loadConversation(otherUserId, baseSubject);
  };

  const handleMarkThreadRead = async (conv: ConversationSummaryDTO, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await messageApi.markThreadAsRead(conv.otherUserId, conv.baseSubject);
      setConversations((prev) =>
        prev.map((c) => (threadKey(c) === threadKey(conv) ? { ...c, unreadCount: 0 } : c))
      );
      window.dispatchEvent(new Event('inbox:read'));
      setToast({ message: t('inbox.marked_read_success'), type: 'success' });
    } catch {
      setToast({ message: t('inbox.action_error'), type: 'error' });
    }
  };

  const handleDeleteThread = (conv: ConversationSummaryDTO, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setConfirmDialog({
      open: true,
      title: t('inbox.delete_confirm_title'),
      message: t('inbox.delete_confirm_message'),
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          await messageApi.deleteThread(conv.otherUserId, conv.baseSubject);
          if (selectedUserId === conv.otherUserId && selectedSubject === conv.baseSubject) {
            setSelectedUserId(null);
            setSelectedSubject(null);
            setMessages([]);
            setShowMobileThread(false);
          }
          loadInbox(page);
          window.dispatchEvent(new Event('inbox:read'));
          setToast({ message: t('inbox.deleted_success'), type: 'success' });
        } catch {
          setToast({ message: t('inbox.action_error'), type: 'error' });
        }
      },
    });
  };

  const handleBatchMarkRead = async () => {
    const threads = getSelectedThreads();
    if (threads.length === 0) return;
    try {
      await messageApi.batchMarkAsRead(threads);
      setConversations((prev) =>
        prev.map((c) => (selectedKeys.has(threadKey(c)) ? { ...c, unreadCount: 0 } : c))
      );
      setSelectedKeys(new Set());
      window.dispatchEvent(new Event('inbox:read'));
      setToast({ message: t('inbox.marked_read_success'), type: 'success' });
    } catch {
      setToast({ message: t('inbox.action_error'), type: 'error' });
    }
  };

  const handleBatchDelete = () => {
    const threads = getSelectedThreads();
    if (threads.length === 0) return;
    setConfirmDialog({
      open: true,
      title: t('inbox.batch_delete_confirm_title'),
      message: t('inbox.batch_delete_confirm_message', { count: String(threads.length) }),
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        try {
          await messageApi.batchDelete(threads);
          setSelectedKeys(new Set());
          if (selectedUserId !== null && selectedSubject !== null) {
            const wasDeleted = threads.some(
              (t) => t.otherUserId === selectedUserId && t.baseSubject === selectedSubject
            );
            if (wasDeleted) {
              setSelectedUserId(null);
              setSelectedSubject(null);
              setMessages([]);
              setShowMobileThread(false);
            }
          }
          loadInbox(page);
          window.dispatchEvent(new Event('inbox:read'));
          setToast({ message: t('inbox.deleted_success'), type: 'success' });
        } catch {
          setToast({ message: t('inbox.action_error'), type: 'error' });
        }
      },
    });
  };

  const handleReply = async () => {
    if (!selectedUserId || !replyText.trim()) return;
    const conv = conversations.find((c) => c.otherUserId === selectedUserId && c.baseSubject === selectedSubject);
    const baseSubject = conv?.baseSubject || selectedSubject || t('inbox.no_subject');
    setReplying(true);
    try {
      const sent = await messageApi.send({
        recipientId: selectedUserId,
        subject: `RE: ${baseSubject}`,
        body: replyText.trim(),
      });
      setMessages((prev) => [...prev, sent as MessageDTO]);
      setReplyText('');
      loadInbox(page);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      setToast({ message: t('inbox.send_error'), type: 'error' });
    } finally {
      setReplying(false);
    }
  };

  const handleOpenCompose = async () => {
    try {
      const userList = await userApi.getAll();
      setUsers(Array.isArray(userList) ? userList : []);
    } catch {
      setUsers([]);
    }
    setCompose({});
    setShowCompose(true);
  };

  const handleSendNew = async () => {
    if (!compose.recipientId || !compose.subject?.trim() || !compose.body?.trim()) return;
    setSending(true);
    try {
      await messageApi.send(compose as SendMessageDTO);
      setToast({ message: t('inbox.sent_success'), type: 'success' });
      setShowCompose(false);
      loadInbox(page);
    } catch {
      setToast({ message: t('inbox.send_error'), type: 'error' });
    } finally {
      setSending(false);
    }
  };

  /* ───────── Pagination ───────── */

  const goToPage = (p: number) => {
    if (p < 0 || p >= totalPages) return;
    setLoadingInbox(true);
    setSelectedKeys(new Set());
    loadInbox(p);
  };

  const [searchQuery, setSearchQuery] = useState('');

  const selectedConv = conversations.find((c) => c.otherUserId === selectedUserId && c.baseSubject === selectedSubject);
  const hasSelection = selectedKeys.size > 0;
  const allSelected = conversations.length > 0 && selectedKeys.size === conversations.length;

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) =>
        c.otherUserName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.baseSubject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lastMessage?.body?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <div className="p-6 md:p-8 h-[calc(100vh-4rem)] flex flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('inbox.title')}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{t('inbox.subtitle')}</p>
        </div>
        <button
          onClick={handleOpenCompose}
          className="flex items-center gap-2 bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('inbox.compose')}
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0 rounded-xl border border-gray-200 overflow-hidden">

        {/* ═══ Left: Conversation list ═══ */}
        <div className={`${showMobileThread ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-80 md:max-w-[320px] shrink-0 border-r border-gray-200 overflow-hidden bg-white`}>

          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emails..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 border-0 rounded-lg h-9 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
              />
            </div>
          </div>

          {/* Toolbar: select-all + batch actions */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 shrink-0">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              title="Select all"
            />
            {hasSelection ? (
              <>
                <span className="text-xs text-gray-500 flex-1">
                  {t('inbox.selected_count', { count: String(selectedKeys.size) })}
                </span>
                <button
                  onClick={handleBatchMarkRead}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition"
                >
                  {t('inbox.mark_read')}
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="text-xs font-medium text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition"
                >
                  {t('inbox.delete')}
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-400 flex-1">{totalElements} {t('inbox.title')}</span>
            )}
          </div>

          {/* List */}
          {loadingInbox ? (
            <div className="flex items-center justify-center flex-1">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-gray-600" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center p-8">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-400">{t('inbox.no_conversations')}</p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1">
              {filteredConversations.map((conv) => {
                const key = threadKey(conv);
                const isActive = selectedUserId === conv.otherUserId && selectedSubject === conv.baseSubject;
                const isUnread = conv.unreadCount > 0;
                const isChecked = selectedKeys.has(key);

                return (
                  <div
                    key={key}
                    className={`group flex items-center gap-3 w-full px-4 py-3 border-b border-gray-200 last:border-0 transition-colors cursor-pointer
                      ${isActive ? 'bg-blue-50' : isUnread ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}
                    `}
                    onClick={() => handleSelectConversation(conv.otherUserId, conv.baseSubject)}
                  >
                    {/* Checkbox */}
                    <div className="shrink-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => { e.stopPropagation(); toggleSelect(key); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Unread dot */}
                    <div className="shrink-0 w-2">
                      {isUnread && <span className="block w-2 h-2 rounded-full bg-emerald-500" />}
                    </div>

                    {/* Sender name — fixed width, never wraps */}
                    <span className={`shrink-0 w-32 text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-normal text-gray-500'}`}>
                      {conv.otherUserName}
                      {conv.unreadCount > 1 && (
                        <span className="ml-1 text-xs font-normal text-gray-400">{conv.unreadCount}</span>
                      )}
                    </span>

                    {/* Subject + preview — fills remaining space */}
                    <span className="flex-1 min-w-0 text-sm truncate">
                      <span className={isUnread ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                        {conv.baseSubject || t('inbox.no_subject')}
                      </span>
                      {conv.lastMessage?.body && (
                        <span className="text-gray-400 font-normal">
                          {' – '}{conv.lastMessage.body}
                        </span>
                      )}
                    </span>

                    {/* Date */}
                    <span className={`shrink-0 text-xs ${isUnread ? 'font-semibold text-gray-700' : 'text-gray-400'}`}>
                      {conv.lastMessage?.createdAt && formatRelativeTime(conv.lastMessage.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination — always shown */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 shrink-0 bg-white">
            <span className="text-xs text-gray-400">
              {t('inbox.page_info', { page: String(page + 1), total: String(Math.max(totalPages, 1)) })}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 0}
                className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-xs text-gray-500 px-1">{page + 1} / {Math.max(totalPages, 1)}</span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="h-7 w-7 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* ═══ Right: Message reader ═══ */}
        <div className={`${!showMobileThread ? 'hidden' : 'flex'} md:flex flex-col flex-1 min-w-0 overflow-hidden bg-white`}>
          {!selectedUserId ? (
            <div className="flex flex-col flex-1">
              {/* Back button shown on mobile so user can return to inbox list */}
              <div className="flex items-center p-3 border-b border-gray-200 md:hidden">
                <button
                  onClick={() => setShowMobileThread(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition"
                  title={t('inbox.back_to_inbox')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
              </div>
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center">
                <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-400">{t('inbox.select_conversation')}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Toolbar — matches reference: justify-between, left group + right group */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
                <div className="flex items-center gap-1">
                  {/* Back to list — always visible */}
                  <button
                    onClick={() => { setSelectedUserId(null); setSelectedSubject(null); setShowMobileThread(false); }}
                    className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition"
                    title={t('inbox.back_to_inbox')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {/* Archive / mark read */}
                  <button
                    onClick={(e) => selectedConv && handleMarkThreadRead(selectedConv, e)}
                    disabled={!selectedConv}
                    className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition"
                    title={t('inbox.mark_read')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
                  {/* Delete */}
                  <button
                    onClick={(e) => selectedConv && handleDeleteThread(selectedConv, e)}
                    disabled={!selectedConv}
                    className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-500 disabled:opacity-30 transition"
                    title={t('inbox.delete')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {/* Reply (scroll to reply bar) */}
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition"
                    title="Reply"
                    onClick={() => document.querySelector<HTMLInputElement>('input[placeholder^="Reply"]')?.focus()}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  {/* Forward */}
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition"
                    title="Forward"
                    onClick={handleOpenCompose}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6" />
                    </svg>
                  </button>
                  {/* More */}
                  <button
                    className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition"
                    title="More options"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages (subject + content all in scroll area) */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Subject */}
                <h1 className="text-xl font-semibold text-gray-900 mb-2 text-balance">
                  {selectedConv?.baseSubject || t('inbox.no_subject')}
                </h1>

                {loadingMessages ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-gray-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-gray-400 text-sm">{t('inbox.no_messages')}</p>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.recipientId === selectedUserId;
                    const senderName = isMine ? 'You' : (selectedConv?.otherUserName ?? 'Unknown');
                    const initials = senderName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
                    const avatarColor = isMine ? 'bg-emerald-600' : 'bg-pink-500';
                    const formattedDate = new Date(msg.createdAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
                    const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                      <div key={msg.id || idx} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="flex items-start gap-4 px-5 py-4">
                          {/* Avatar */}
                          <div className={`w-10 h-10 rounded-full ${avatarColor} text-white flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5`}>
                            {initials || '?'}
                          </div>
                          {/* Right column: sender info + body */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <span className="font-semibold text-gray-900">{senderName}</span>
                                <span className="text-gray-500 ml-2 text-sm">&lt;{isMine ? 'me' : (selectedConv?.otherUserName ?? '').toLowerCase().replace(/\s+/g, '.')}&gt;</span>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap shrink-0 pt-0.5">
                                {formattedDate}, {formattedTime}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 mb-3">
                              to {isMine ? selectedConv?.otherUserName : 'me'}
                            </p>
                            {/* Body — same column as sender name, naturally aligned */}
                            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm">
                              {msg.body}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply bar — matches reference */}
              <div className="shrink-0 border-t border-gray-200 px-4 py-4 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center text-xs font-semibold shrink-0">
                    ME
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleReply(); } }}
                      placeholder={`Reply to ${selectedConv?.otherUserName ?? ''}...`}
                      className="w-full bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 transition"
                    />
                  </div>
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || replying}
                    className="px-4 py-2 bg-emerald-700 text-white text-sm font-medium rounded-md hover:bg-emerald-800 transition disabled:opacity-40 shrink-0"
                  >
                    {t('inbox.send')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-charcoal">{t('inbox.compose_title')}</h2>
              <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">{t('inbox.compose_to')} <span className="text-red-500">*</span></label>
                <select
                  value={compose.recipientId ?? ''}
                  onChange={(e) => setCompose((p) => ({ ...p, recipientId: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white text-sm"
                >
                  <option value="">{t('inbox.compose_to_placeholder')}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.personName || u.username} {u.roles.length > 0 ? `(${u.roles[0]})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">{t('inbox.compose_subject')} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={compose.subject ?? ''}
                  onChange={(e) => setCompose((p) => ({ ...p, subject: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
                  placeholder={t('inbox.compose_subject_placeholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">{t('inbox.compose_message')} <span className="text-red-500">*</span></label>
                <textarea
                  value={compose.body ?? ''}
                  onChange={(e) => setCompose((p) => ({ ...p, body: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm resize-none"
                  placeholder={t('inbox.compose_message_placeholder')}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowCompose(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSendNew}
                disabled={sending || !compose.recipientId || !compose.subject?.trim() || !compose.body?.trim()}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {sending ? t('common.loading') : t('inbox.send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={t('inbox.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />

      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

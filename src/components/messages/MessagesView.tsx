'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Inbox, Plus, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface InboxItem {
  id: string;
  messageId: string;
  subject: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
  sender: { id: string; firstName: string | null; lastName: string | null; email: string } | null;
}

interface SentItem {
  id: string;
  subject: string;
  body: string;
  createdAt: Date;
  recipients: { id: string; firstName: string | null; lastName: string | null; email: string }[];
}

interface Department {
  id: string;
  name: string;
}

interface ProcessRef {
  id: string;
  lfProcessId: string | null;
  processTemplate: { name: string };
}

interface Props {
  userId: string;
  tenantId: string;
  inbox: InboxItem[];
  sent: SentItem[];
  departments: Department[];
  instances: ProcessRef[];
}

export default function MessagesView({ inbox, sent, departments, instances }: Props) {
  const t = useTranslations('messages');
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');
  const [selected, setSelected] = useState<InboxItem | SentItem | null>(null);
  const [composing, setComposing] = useState(false);
  const [sending, setSending] = useState(false);
  const [localInbox, setLocalInbox] = useState(inbox);

  // Compose form state
  const [composeData, setComposeData] = useState({
    departmentId: '',
    processInstanceId: '',
    subject: '',
    body: '',
  });

  const unreadCount = localInbox.filter((i) => !i.isRead).length;

  const handleMarkRead = async (item: InboxItem) => {
    if (item.isRead) return;
    try {
      await fetch(`/api/messages/${item.messageId}/read`, { method: 'PATCH' });
      setLocalInbox((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i))
      );
    } catch {
      // silent
    }
  };

  const handleSelect = (item: InboxItem | SentItem) => {
    setSelected(item);
    setComposing(false);
    if (tab === 'inbox') {
      handleMarkRead(item as InboxItem);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeData.departmentId || !composeData.subject.trim() || !composeData.body.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(composeData),
      });
      if (!res.ok) throw new Error();
      toast.success(t('sent_success'));
      setComposing(false);
      setComposeData({ departmentId: '', processInstanceId: '', subject: '', body: '' });
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const senderName = (item: InboxItem) => {
    if (!item.sender) return 'System';
    return `${item.sender.firstName ?? ''} ${item.sender.lastName ?? ''}`.trim() || item.sender.email;
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => { setComposing(true); setSelected(null); }}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {t('staff_contact')}
        </Button>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <button
            onClick={() => setTab('inbox')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors ${tab === 'inbox' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
          >
            <Inbox className="w-4 h-4" />
            {t('inbox')}
            {unreadCount > 0 && (
              <Badge className="ml-auto text-xs bg-blue-600 text-white border-0">{unreadCount}</Badge>
            )}
          </button>
          <button
            onClick={() => setTab('sent')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors ${tab === 'sent' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
          >
            <Send className="w-4 h-4" />
            {t('sent')}
          </button>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {tab === 'inbox' ? (
            localInbox.length === 0 ? (
              <p className="text-slate-500 text-sm px-2">{t('no_messages')}</p>
            ) : (
              localInbox.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selected && 'id' in selected && selected.id === item.id ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
                >
                  <div className="flex items-center gap-2">
                    {!item.isRead && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                    <p className={`text-sm truncate ${!item.isRead ? 'font-semibold text-white' : 'text-slate-300'}`}>
                      {item.subject}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{senderName(item)}</p>
                </button>
              ))
            )
          ) : (
            sent.length === 0 ? (
              <p className="text-slate-500 text-sm px-2">{t('no_messages')}</p>
            ) : (
              sent.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selected && 'id' in selected && selected.id === item.id ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
                >
                  <p className="text-sm truncate text-slate-300">{item.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </button>
              ))
            )
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden flex flex-col">
        {composing ? (
          /* Compose form */
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
              <h2 className="text-sm font-semibold text-white">{t('staff_contact')}</h2>
              <button onClick={() => setComposing(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSend} className="flex flex-col flex-1 p-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('select_recipient')} *</label>
                <div className="relative">
                  <select
                    value={composeData.departmentId}
                    onChange={(e) => setComposeData((d) => ({ ...d, departmentId: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Select a department...</option>
                    {departments.map((dep) => (
                      <option key={dep.id} value={dep.id}>{dep.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {instances.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('select_process')}</label>
                  <div className="relative">
                    <select
                      value={composeData.processInstanceId}
                      onChange={(e) => setComposeData((d) => ({ ...d, processInstanceId: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-blue-500"
                    >
                      <option value="">None</option>
                      {instances.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.processTemplate.name} {inst.lfProcessId ? `(${inst.lfProcessId})` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('subject')} *</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData((d) => ({ ...d, subject: e.target.value }))}
                  placeholder={t('subject_placeholder')}
                  className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                  required
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('body')} *</label>
                <textarea
                  value={composeData.body}
                  onChange={(e) => setComposeData((d) => ({ ...d, body: e.target.value }))}
                  placeholder={t('body_placeholder')}
                  className="w-full h-full min-h-[120px] bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-500 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setComposing(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  Cancel
                </Button>
                <Button type="submit" disabled={sending} className="bg-blue-600 hover:bg-blue-700">
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {sending ? 'Sending...' : t('send')}
                </Button>
              </div>
            </form>
          </div>
        ) : selected ? (
          /* Message detail */
          <div className="flex flex-col h-full">
            <div className="px-5 py-4 border-b border-slate-700">
              <h2 className="font-semibold text-white">{selected.subject}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {new Date(selected.createdAt).toLocaleString()}
                {tab === 'inbox' && 'sender' in selected && selected.sender
                  ? ` · From: ${senderName(selected as InboxItem)}`
                  : ''}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{selected.body}</p>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Inbox className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-slate-500 text-sm">Select a message to read</p>
          </div>
        )}
      </div>
    </div>
  );
}

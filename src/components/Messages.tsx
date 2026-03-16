import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Check,
  CheckCheck,
  Grid,
  Users,
  MessageSquare,
  Calendar,
  Settings,
  ArrowLeft,
  Send,
  ChevronRight,
} from 'lucide-react';
import { fetchMessages, sendMessage, fetchUsersByIds, markMessagesAsRead } from '../services/api';
import { useAuth } from '../context/AuthContext';

const defaultAvatar = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=150&auto=format&fit=crop';

/** Timestamp du message (colonnes timestamp ou created_at selon le schéma Supabase). */
function msgTs(m: { timestamp?: string; created_at?: string }): string {
  return (m.timestamp ?? m.created_at ?? '') as string;
}

function formatMessageTime(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  if (now.toDateString() === d.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === d.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (now.toDateString() === d.toDateString()) return "Aujourd'hui";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === d.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Groupe les messages par jour pour afficher des séparateurs. */
function groupMessagesByDate(threadMessages: any[]): { dateLabel: string; messages: any[] }[] {
  const groups: { dateLabel: string; messages: any[] }[] = [];
  let currentDate = '';
  let currentGroup: any[] = [];
  threadMessages.forEach((m) => {
    const d = new Date(msgTs(m)).toDateString();
    if (d !== currentDate) {
      if (currentGroup.length) groups.push({ dateLabel: formatDateLabel(msgTs(currentGroup[0])), messages: currentGroup });
      currentDate = d;
      currentGroup = [m];
    } else {
      currentGroup.push(m);
    }
  });
  if (currentGroup.length) groups.push({ dateLabel: formatDateLabel(msgTs(currentGroup[0])), messages: currentGroup });
  return groups;
}

interface MessagesProps {
  onBack: () => void;
  openWithUserId?: string | null;
  onClearOpenWith?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToClients?: () => void;
  onNavigateToCalendar?: () => void;
  onNavigateToSettings?: () => void;
}

export const Messages: React.FC<MessagesProps> = ({
  onBack,
  openWithUserId,
  onClearOpenWith,
  onNavigateToDashboard,
  onNavigateToClients,
  onNavigateToCalendar,
  onNavigateToSettings,
}) => {
  const { appUser } = useAuth();
  const myId = appUser?.id;

  const [messages, setMessages] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, { id: string; name: string | null; avatar: string | null; role?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOtherId, setSelectedOtherId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openWithUserId && myId && openWithUserId !== myId) {
      setSelectedOtherId(openWithUserId);
      onClearOpenWith?.();
      fetchUsersByIds([openWithUserId])
        .then((users) => {
          if (Array.isArray(users) && users.length) setUsersMap((prev) => ({ ...prev, [openWithUserId]: users[0] }));
        })
        .catch(() => {});
    }
  }, [openWithUserId, myId, onClearOpenWith]);

  const loadMessages = useCallback(async () => {
    if (!myId) return;
    try {
      const data = await fetchMessages();
      const list = Array.isArray(data) ? data : [];
      setMessages(list);
      const otherIds = new Set<string>();
      list.forEach((m: any) => {
        if (m.sender_id !== myId) otherIds.add(m.sender_id);
        if (m.receiver_id !== myId) otherIds.add(m.receiver_id);
      });
      const ids = Array.from(otherIds);
      if (ids.length > 0) {
        const users = await fetchUsersByIds(ids).catch(() => []);
        const map: Record<string, any> = {};
        (Array.isArray(users) ? users : []).forEach((u: any) => { if (u?.id) map[u.id] = u; });
        setUsersMap(map);
      } else setUsersMap({});
    } catch (err) {
      console.error('Messages load error:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [myId]);

  const conversations = useMemo(() => {
    if (!myId) return [];
    const byOther: Record<string, { last: any; unread: number }> = {};
    messages.forEach((m: any) => {
      const other = m.sender_id === myId ? m.receiver_id : m.sender_id;
      if (!byOther[other]) byOther[other] = { last: m, unread: 0 };
      if (m.receiver_id === myId && !m.is_read) byOther[other].unread++;
      if (new Date(msgTs(m)) > new Date(msgTs(byOther[other].last))) byOther[other].last = m;
    });
    return Object.entries(byOther)
      .map(([otherId, { last, unread }]) => ({
        otherId,
        last,
        unread,
        name: usersMap[otherId]?.name ?? 'Utilisateur',
        avatar: usersMap[otherId]?.avatar ?? null,
      }))
      .sort((a, b) => new Date(msgTs(b.last)).getTime() - new Date(msgTs(a.last)).getTime());
  }, [messages, myId, usersMap]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((c) => c.name.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const threadMessages = useMemo(() => {
    if (!myId || !selectedOtherId) return [];
    return messages
      .filter((m: any) => (m.sender_id === myId && m.receiver_id === selectedOtherId) || (m.sender_id === selectedOtherId && m.receiver_id === myId))
      .sort((a: any, b: any) => new Date(msgTs(a)).getTime() - new Date(msgTs(b)).getTime());
  }, [messages, myId, selectedOtherId]);

  useEffect(() => {
    if (!myId) {
      setLoading(false);
      return;
    }
    loadMessages();
  }, [myId, loadMessages]);

  /** Scroll vers le bas du fil quand la conversation ou les messages changent. */
  useEffect(() => {
    if (selectedOtherId && threadMessages.length) {
      requestAnimationFrame(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    }
  }, [selectedOtherId, threadMessages.length]);

  /** Rafraîchissement périodique quand une conversation est ouverte. */
  useEffect(() => {
    if (!selectedOtherId || !myId) return;
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedOtherId, myId, loadMessages]);

  const openConversation = (otherId: string) => {
    setSelectedOtherId(otherId);
    const toMark = messages.filter((m: any) => m.receiver_id === myId && m.sender_id === otherId && !m.is_read).map((m: any) => m.id);
    if (toMark.length > 0) markMessagesAsRead(toMark).then(() => loadMessages());
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !myId || !selectedOtherId || sending) return;
    setSending(true);
    try {
      await sendMessage(myId, selectedOtherId, text);
      setInputText('');
      await loadMessages();
      requestAnimationFrame(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
    } catch (err: unknown) {
      console.error('Send message error:', err);
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message?: string }).message) : '';
      alert(msg ? `Erreur lors de l'envoi : ${msg}` : 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const selectedUser = selectedOtherId ? usersMap[selectedOtherId] : null;
  const selectedName = selectedUser?.name ?? 'Utilisateur';

  if (!appUser?.id) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Chargement des messages...</p>
        <button type="button" onClick={onBack} className="text-primary text-sm font-medium hover:underline">
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={() => (selectedOtherId ? setSelectedOtherId(null) : onBack?.())} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft size={24} />
        </button>
        {selectedOtherId ? (
          <>
            <img
              src={selectedUser?.avatar || defaultAvatar}
              alt={selectedName}
              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold tracking-tight truncate">{selectedName}</h1>
              <p className="text-xs text-slate-500">Conversation</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
              <MessageSquare size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Messages</h1>
          </>
        )}
      </header>

      {!selectedOtherId ? (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-slate-100 dark:bg-slate-900 border-none rounded-lg focus:ring-2 focus:ring-primary text-sm placeholder:text-slate-500 transition-all outline-none"
                  placeholder="Rechercher..."
                  type="text"
                />
              </div>
            </div>

            <main className="flex-1 overflow-y-auto hide-scrollbar">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-10 text-slate-500">Aucune conversation.</div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.otherId}
                    onClick={() => openConversation(conv.otherId)}
                    className={`flex items-center gap-4 px-4 py-4 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-800/50 ${conv.unread > 0 ? 'bg-primary/5 border-l-4 border-primary dark:bg-primary/10' : 'hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={conv.avatar || defaultAvatar}
                        alt={conv.name}
                        className="w-14 h-14 rounded-xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className="font-bold text-base truncate">{conv.name}</h3>
                        <span className={`text-xs ${conv.unread > 0 ? 'font-semibold text-primary' : 'text-slate-500'}`}>
                          {formatMessageTime(msgTs(conv.last))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <p className={`text-sm truncate ${conv.unread > 0 ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                          {conv.last.sender_id === myId ? 'Vous : ' : ''}{conv.last.content || ''}
                        </p>
                        {conv.unread > 0 && (
                          <span className="flex-shrink-0 bg-primary text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1">
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-400" />
                  </div>
                ))
              )}
            </main>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto hide-scrollbar p-4">
              {threadMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <MessageSquare size={32} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Aucun message</p>
                  <p className="text-sm text-slate-400 mt-1">Envoyez le premier message à {selectedName}</p>
                </div>
              ) : (
                groupMessagesByDate(threadMessages).map((group) => (
                  <div key={group.dateLabel} className="space-y-3">
                    <div className="flex justify-center my-4">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full capitalize">
                        {group.dateLabel}
                      </span>
                    </div>
                    {group.messages.map((m: any) => {
                      const isMe = m.sender_id === myId;
                      return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                              isMe
                                ? 'bg-primary text-white rounded-br-md'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-white/90' : 'text-slate-500'}`}>
                              <span className="text-[10px]">{formatMessageTime(msgTs(m))}</span>
                              {isMe && (m.is_read ? <CheckCheck size={14} className="opacity-90" /> : <Check size={14} className="opacity-80" />)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark flex gap-2 items-end">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Écrire un message..."
                rows={1}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none min-h-[44px] max-h-32"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={sending || !inputText.trim()}
                className="bg-primary text-white p-3 rounded-xl flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition-opacity min-w-[48px]"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        )}

      {!selectedOtherId && (
        <nav className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe px-2 py-2">
          <div className="flex justify-around items-center max-w-screen-xl mx-auto">
            <button type="button" onClick={() => onNavigateToDashboard?.()} className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-primary transition-colors">
              <Grid size={24} />
              <span className="text-[10px] font-medium">Tableau de bord</span>
            </button>
            <button type="button" onClick={() => (onNavigateToClients ?? onNavigateToDashboard)?.()} className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-primary transition-colors">
              <Users size={24} />
              <span className="text-[10px] font-medium">Clients</span>
            </button>
            <button type="button" className="flex flex-col items-center gap-1 p-2 text-primary">
              <MessageSquare size={24} fill="currentColor" />
              <span className="text-[10px] font-bold">Messages</span>
            </button>
            <button type="button" onClick={() => onNavigateToCalendar?.()} className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-primary transition-colors">
              <Calendar size={24} />
              <span className="text-[10px] font-medium">Planning</span>
            </button>
            <button type="button" onClick={() => onNavigateToSettings?.()} className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-primary transition-colors">
              <Settings size={24} />
              <span className="text-[10px] font-medium">Paramètres</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

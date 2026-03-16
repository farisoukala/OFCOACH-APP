import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatNotifDate(createdAt: string): string {
  const d = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface NotificationsProps {
  onBack: () => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ onBack }) => {
  const { appUser } = useAuth();
  const userId = appUser?.id;
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchNotifications(userId);
      setList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    load();
  }, [userId, load]);

  const handleRead = async (id: string) => {
    const n = list.find((x) => x.id === id);
    if (n?.is_read) return;
    try {
      await markNotificationRead(id);
      setList((prev) => prev.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(userId);
      setList((prev) => prev.map((x) => ({ ...x, is_read: true })));
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = list.filter((n) => !n.is_read).length;

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display">
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Bell size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-500">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="text-primary text-sm font-bold flex items-center gap-1 disabled:opacity-50"
            >
              <CheckCheck size={18} />
              {markingAll ? '...' : 'Tout lire'}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Bell size={48} className="mx-auto mb-4 opacity-40" />
            <p className="font-medium">Aucune notification</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleRead(n.id)}
                className={`w-full text-left p-4 rounded-2xl border transition-colors ${
                  n.is_read
                    ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    : 'bg-primary/5 border-primary/20 dark:border-primary/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.is_read && <span className="mt-1.5 size-2 rounded-full bg-primary flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{n.title}</p>
                    {n.body && <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{n.body}</p>}
                    <p className="text-xs text-slate-500 mt-2">{formatNotifDate(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

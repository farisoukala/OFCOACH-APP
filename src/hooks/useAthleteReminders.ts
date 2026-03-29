import { useEffect, useRef } from 'react';
import { localTodayIso } from '../lib/workoutPlanning';
import { toast } from '../lib/toast';
import { showBrowserNotification } from '../lib/browserNotifications';

type Appt = { id?: string; starts_at?: string; title?: string } | null | undefined;

const RDV_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Rappels discrets (toast in-app + notification navigateur si autorisée) :
 * RDV coach sous 48h, séance du jour non terminée, passage à des messages non lus.
 */
export function useAthleteReminders(opts: {
  enabled: boolean;
  nextAppt: Appt;
  todayWorkoutTitle: string | null;
  unreadMessages: number;
}) {
  const prevUnreadRef = useRef<number | null>(null);

  useEffect(() => {
    if (!opts.enabled) return;

    const appt = opts.nextAppt;
    if (appt?.starts_at) {
      const t = new Date(appt.starts_at).getTime();
      const now = Date.now();
      if (t > now && t - now <= RDV_WINDOW_MS) {
        const key = `ofcoach_remind_rdv_${appt.id || appt.starts_at}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          const when = new Date(appt.starts_at).toLocaleString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          });
          const desc = `${appt.title || 'Rendez-vous'} — ${when}`;
          toast.info('Rappel : rendez-vous coach', desc);
          showBrowserNotification('OfCoach — RDV coach', { body: desc });
        }
      }
    }

    if (opts.todayWorkoutTitle) {
      const dayKey = `ofcoach_remind_seance_${localTodayIso()}`;
      if (!sessionStorage.getItem(dayKey)) {
        sessionStorage.setItem(dayKey, '1');
        toast.info('Séance prévue aujourd’hui', opts.todayWorkoutTitle);
        showBrowserNotification('OfCoach — Séance du jour', { body: opts.todayWorkoutTitle });
      }
    }
  }, [
    opts.enabled,
    opts.nextAppt?.id,
    opts.nextAppt?.starts_at,
    opts.nextAppt?.title,
    opts.todayWorkoutTitle,
  ]);

  useEffect(() => {
    if (!opts.enabled) return;
    const u = opts.unreadMessages;
    if (prevUnreadRef.current === null) {
      prevUnreadRef.current = u;
      if (u > 0 && !sessionStorage.getItem('ofcoach_msg_open_toast')) {
        sessionStorage.setItem('ofcoach_msg_open_toast', '1');
        const desc = `${u} message${u > 1 ? 's' : ''} non lu${u > 1 ? 's' : ''}.`;
        toast.message('Messagerie', desc);
        showBrowserNotification('OfCoach — Messages', { body: desc });
      }
      return;
    }
    if (prevUnreadRef.current === 0 && u > 0) {
      const desc = `${u} message${u > 1 ? 's' : ''} non lu${u > 1 ? 's' : ''}.`;
      toast.message('Nouveau(x) message(s)', desc);
      showBrowserNotification('OfCoach — Messages', { body: desc });
    }
    prevUnreadRef.current = u;
  }, [opts.enabled, opts.unreadMessages]);
}

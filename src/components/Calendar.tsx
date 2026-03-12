import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Calendar as CalendarIcon,
  X,
  Trash2,
} from 'lucide-react';
import { fetchCalendarEvents, createCalendarEvent, deleteCalendarEvent } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface CalendarProps {
  onBack: () => void;
}

export const Calendar: React.FC<CalendarProps> = ({ onBack }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '09:00', duration: '1h', type: 'Entraînement' });
  const { appUser } = useAuth();
  const userId = appUser?.id;

  const loadEvents = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchCalendarEvents(userId);
      setEvents(data || []);
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
    loadEvents();
  }, [userId, loadEvents]);

  const goPrevMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const goNextMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  const gridDays: { date: Date; currentMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1) {
      const d = new Date(year, month, dayNum);
      gridDays.push({ date: d, currentMonth: false });
    } else if (dayNum > daysInMonth) {
      const d = new Date(year, month, dayNum);
      gridDays.push({ date: d, currentMonth: false });
    } else {
      gridDays.push({ date: new Date(year, month, dayNum), currentMonth: true });
    }
  }

  const selectedKey = formatDateKey(selectedDate);
  const eventsForDay = events.filter((e) => e.date === selectedKey).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const openAddModal = () => {
    setForm({
      title: '',
      date: formatDateKey(selectedDate),
      time: '09:00',
      duration: '1h',
      type: 'Entraînement',
    });
    setShowAddModal(true);
  };

  const handleCreateEvent = async () => {
    if (!form.title.trim() || !userId) return;
    setSaving(true);
    try {
      await createCalendarEvent(userId, {
        title: form.title.trim(),
        date: form.date,
        time: form.time || null,
        duration: form.duration || null,
        type: form.type || null,
        color: null,
      });
      await loadEvents();
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la création de l\'événement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (!confirm('Supprimer cet événement ?')) return;
    try {
      await deleteCalendarEvent(eventId);
      await loadEvents();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background-light dark:bg-background-dark border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Planning</h1>
        <button
          onClick={openAddModal}
          className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          title="Ajouter un événement"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="px-4 py-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">
            {MOIS[month]} {year}
          </h2>
          <div className="flex gap-2">
            <button onClick={goPrevMonth} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={goNextMonth} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {JOURS.map((j) => (
            <div key={j} className="text-center text-xs font-semibold text-slate-500 uppercase py-1">
              {j}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 mb-6">
          {gridDays.map(({ date, currentMonth: inMonth }, i) => {
            const key = formatDateKey(date);
            const hasEvents = events.some((e) => e.date === key);
            const selected = isSameDay(date, selectedDate);
            const today = isSameDay(date, new Date());
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(date)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all ${
                  !inMonth ? 'text-slate-300 dark:text-slate-600' : 'text-slate-800 dark:text-slate-200'
                } ${selected ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'} ${today && !selected ? 'ring-2 ring-primary' : ''}`}
              >
                {date.getDate()}
                {hasEvents && inMonth && !selected && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />}
              </button>
            );
          })}
        </div>

        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
          {isSameDay(selectedDate, new Date()) ? "Aujourd'hui" : selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : eventsForDay.length === 0 ? (
          <div className="text-center py-10 text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            Aucun événement ce jour-là.
          </div>
        ) : (
          <div className="space-y-3">
            {eventsForDay.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 items-start group"
              >
                <div className="flex flex-col items-center gap-1 pt-1 min-w-[48px]">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{event.time || '—'}</span>
                  <div className="w-px flex-1 min-h-[20px] bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 relative overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${event.color ? `bg-[${event.color}]` : 'bg-primary'}`} style={event.color ? { backgroundColor: event.color } : undefined} />
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-base">{event.title}</h4>
                      {(event.duration || event.type) && (
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          {[event.duration, event.type].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteEvent(e, event.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && setShowAddModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white dark:bg-[#1c263b] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <CalendarIcon size={22} className="text-primary" />
                  Nouvel événement
                </h3>
                <button onClick={() => !saving && setShowAddModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={22} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Titre</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Ex: Séance musculation"
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Heure</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Durée</label>
                    <input
                      value={form.duration}
                      onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                      placeholder="1h"
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option>Entraînement</option>
                      <option>Réunion</option>
                      <option>Compétition</option>
                      <option>Récupération</option>
                      <option>Autre</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCreateEvent}
                  disabled={saving || !form.title.trim()}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Création...' : 'Ajouter l\'événement'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dumbbell,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Play,
  ArrowLeft,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  fetchWorkoutsByAthlete,
  updateWorkout,
  updateExercise,
  insertExerciseForWorkout,
  deleteExercise,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  pickFeaturedWorkout,
  sortWorkoutsBySchedule,
  startOfWeekMonday,
  addDaysLocal,
  localDateIso,
  localTodayIso,
  type WorkoutExerciseRow,
  type WorkoutSchedulePick,
} from '../lib/workoutPlanning';
import { toast } from '../lib/toast';

function formatWorkoutDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(dateStr + 'T12:00:00')
    : new Date(dateStr);
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (today) return "Aujourd'hui";
  if (yesterday.toDateString() === d.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

type EditExerciseRow = {
  id: string;
  name: string;
  sets: string | number;
  reps: string;
  weight: string | number;
  rest_time: string;
};

const LOG_ADD = '__add_exercise__';

export const Workout: React.FC = () => {
  const [workouts, setWorkouts] = useState<WorkoutSchedulePick[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  /** Séance ouverte depuis la liste (bilan / relecture, y compris terminées). */
  const [openedWorkoutId, setOpenedWorkoutId] = useState<string | null>(null);
  const [editRows, setEditRows] = useState<EditExerciseRow[]>([]);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [exSavingId, setExSavingId] = useState<string | null>(null);
  const [exDeletingId, setExDeletingId] = useState<string | null>(null);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const { appUser } = useAuth();
  const athleteId = appUser?.id;

  const loadWorkouts = useCallback(async () => {
    if (!athleteId) return;
    try {
      const data = await fetchWorkoutsByAthlete(athleteId);
      setWorkouts(data);
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    if (!athleteId) {
      setLoading(false);
      return;
    }
    loadWorkouts();
  }, [athleteId, loadWorkouts]);

  const sortedList = sortWorkoutsBySchedule(workouts);
  const featuredWorkout = pickFeaturedWorkout(workouts);
  const currentWorkout = useMemo(() => {
    if (openedWorkoutId) {
      const found = workouts.find((w) => w.id === openedWorkoutId);
      if (found) return found;
    }
    return featuredWorkout;
  }, [openedWorkoutId, workouts, featuredWorkout]);
  const completedCount = workouts.filter((w) => w.status === 'completed').length;

  useEffect(() => {
    if (!openedWorkoutId) return;
    if (!workouts.some((w) => w.id === openedWorkoutId)) {
      setOpenedWorkoutId(null);
    }
  }, [openedWorkoutId, workouts]);

  const workoutId = currentWorkout?.id;

  useEffect(() => {
    if (!workoutId) {
      setEditRows([]);
      setSessionTitle('');
      setSessionDesc('');
      setSessionDate('');
      return;
    }
    setSessionTitle(String(currentWorkout?.title ?? ''));
    setSessionDesc(String(currentWorkout?.description ?? ''));
    const d = currentWorkout?.date;
    setSessionDate(d && /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? String(d) : '');
    const ex = currentWorkout?.exercises;
    if (!Array.isArray(ex) || ex.length === 0) {
      setEditRows([]);
      return;
    }
    setEditRows(
      ex.map((e: WorkoutExerciseRow) => ({
        id: String(e.id),
        name: String(e.name ?? ''),
        sets: e.sets != null && e.sets !== '' ? e.sets : '',
        reps: String(e.reps ?? ''),
        weight: e.weight != null && e.weight !== '' ? e.weight : '',
        rest_time: String(e.rest_time ?? ''),
      }))
    );
  }, [workoutId, currentWorkout?.title, currentWorkout?.description, currentWorkout?.date, currentWorkout?.exercises]);

  const updateRowField = (id: string, field: keyof EditExerciseRow, value: string | number) => {
    setEditRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const saveExerciseRow = async (row: EditExerciseRow) => {
    if (!row.id) return;
    setExSavingId(row.id);
    setEditError(null);
    try {
      const setsNum =
        row.sets === '' || row.sets == null
          ? null
          : Math.max(0, parseInt(String(row.sets), 10));
      const weightNum =
        row.weight === '' || row.weight == null || String(row.weight).trim() === ''
          ? null
          : parseFloat(String(row.weight).replace(',', '.'));
      await updateExercise(row.id, {
        name: String(row.name ?? '').trim() || 'Exercice',
        sets: setsNum === null || Number.isNaN(setsNum) ? null : setsNum,
        reps: String(row.reps ?? '').trim() || null,
        weight: weightNum === null || Number.isNaN(weightNum) ? null : weightNum,
        rest_time: String(row.rest_time ?? '').trim() || null,
      });
      await loadWorkouts();
    } catch (e) {
      console.error(e);
      const detail =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
          ? (e as { message: string }).message
          : e instanceof Error
            ? e.message
            : '';
      setEditError(detail || 'Impossible d’enregistrer l’exercice.');
    } finally {
      setExSavingId(null);
    }
  };

  const handleAddExercise = async () => {
    if (!workoutId) return;
    setExSavingId(LOG_ADD);
    setEditError(null);
    try {
      await insertExerciseForWorkout(workoutId);
      await loadWorkouts();
    } catch (e) {
      console.error(e);
      const detail =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
          ? (e as { message: string }).message
          : '';
      setEditError(detail || 'Impossible d’ajouter l’exercice.');
    } finally {
      setExSavingId(null);
    }
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!window.confirm('Supprimer cet exercice ?')) return;
    setExDeletingId(exerciseId);
    setEditError(null);
    try {
      await deleteExercise(exerciseId);
      await loadWorkouts();
    } catch (e) {
      console.error(e);
      const detail =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
          ? (e as { message: string }).message
          : '';
      setEditError(detail || 'Impossible de supprimer l’exercice.');
    } finally {
      setExDeletingId(null);
    }
  };

  const handleSaveSessionMeta = async () => {
    if (!workoutId || currentWorkout?.status === 'completed') return;
    setSessionSaving(true);
    setEditError(null);
    try {
      await updateWorkout(workoutId, {
        title: sessionTitle.trim() || 'Séance',
        description: sessionDesc.trim() || null,
        date: sessionDate.trim() || null,
      });
      await loadWorkouts();
      toast.success('Séance mise à jour');
    } catch (e) {
      console.error(e);
      const detail =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
          ? (e as { message: string }).message
          : '';
      setEditError(detail || 'Impossible d’enregistrer la séance.');
      toast.error('Mise à jour impossible', detail || '');
    } finally {
      setSessionSaving(false);
    }
  };

  const editBusy = exSavingId !== null || exDeletingId !== null || sessionSaving;

  const monday = startOfWeekMonday();
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = addDaysLocal(monday, i);
    const iso = localDateIso(d);
    const label = d.toLocaleDateString('fr-FR', { weekday: 'short' });
    const dayWorkouts = workouts.filter((w) => w.date === iso);
    return { iso, label, dayNum: d.getDate(), dayWorkouts };
  });
  const todayIso = localTodayIso();

  const handleMarkCompleted = async (workoutId: string) => {
    if (markingId) return;
    setMarkingId(workoutId);
    try {
      await updateWorkout(workoutId, { status: 'completed' });
      await loadWorkouts();
    } catch (err: unknown) {
      console.error(err);
      const o = err && typeof err === 'object' ? (err as Record<string, unknown>) : {};
      const msg =
        (o.code ? `[${o.code}] ` : '') +
        String(o.message ?? o.error_description ?? o.hint ?? 'Erreur lors de la mise à jour.');
      toast.error('Séance non mise à jour', msg);
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <section>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
              <Dumbbell size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Séances</span>
            </div>
            <p className="text-2xl font-bold">{workouts.length} <span className="text-sm font-normal text-slate-500">assignées</span></p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
              <CheckCircle2 size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Terminées</span>
            </div>
            <p className="text-2xl font-bold">{completedCount} <span className="text-sm font-normal text-slate-500">/ {workouts.length}</span></p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-3">Planning de la semaine</h2>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {weekDays.map((day) => (
            <div
              key={day.iso}
              className={`min-w-[100px] shrink-0 rounded-2xl p-3 border ${
                day.iso === todayIso
                  ? 'bg-primary/15 border-primary/40 ring-1 ring-primary/30'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">{day.label}</p>
              <p className="text-lg font-extrabold leading-tight">{day.dayNum}</p>
              <div className="mt-2 space-y-1">
                {day.dayWorkouts.length === 0 ? (
                  <p className="text-[10px] text-slate-400">—</p>
                ) : (
                  day.dayWorkouts.map((w: WorkoutSchedulePick) => (
                    <p
                      key={w.id}
                      className={`text-[10px] font-semibold truncate ${
                        w.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400 line-through opacity-80' : 'text-slate-700 dark:text-slate-200'
                      }`}
                      title={w.title}
                    >
                      {w.title}
                    </p>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold">
            {openedWorkoutId ? 'Bilan de la séance' : 'MA SEANCE'}
          </h2>
          {openedWorkoutId && (
            <button
              type="button"
              onClick={() => setOpenedWorkoutId(null)}
              className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft size={18} aria-hidden />
              Retour
            </button>
          )}
        </div>
        {loading ? (
          <div className="bg-slate-100 dark:bg-slate-900 h-48 rounded-2xl animate-pulse flex items-center justify-center">
            <Dumbbell className="text-slate-300 animate-spin" size={32} />
          </div>
        ) : currentWorkout ? (
          <div className={`rounded-2xl p-5 border ${currentWorkout.status === 'completed' ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : 'bg-primary/10 border-primary/20'}`}>
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="min-w-0 flex-1 space-y-3">
                {currentWorkout.status === 'completed' ? (
                  <>
                    <h3 className="text-xl font-bold text-primary">{currentWorkout.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{currentWorkout.description || 'Aucune description'}</p>
                    {currentWorkout.date && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={12} /> {formatWorkoutDate(currentWorkout.date)}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Titre de la séance</label>
                      <input
                        type="text"
                        value={sessionTitle}
                        onChange={(e) => setSessionTitle(e.target.value)}
                        className="w-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-base font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Ex. Bas du corps"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                      <textarea
                        value={sessionDesc}
                        onChange={(e) => setSessionDesc(e.target.value)}
                        rows={2}
                        className="w-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-primary resize-none"
                        placeholder="Notes…"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                        <Calendar size={12} /> Date prévue
                      </label>
                      <input
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="w-full max-w-[220px] bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSaveSessionMeta()}
                      disabled={editBusy}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-sm font-bold disabled:opacity-50"
                    >
                      {sessionSaving ? 'Enregistrement…' : 'Enregistrer la séance'}
                    </button>
                  </>
                )}
              </div>
              <div className="shrink-0 bg-primary text-white p-2 rounded-xl">
                <Play size={20} fill="currentColor" />
              </div>
            </div>

            {editError && (
              <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-500/15 rounded-xl px-3 py-2 mb-4">{editError}</p>
            )}

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Exercices</p>
            {editRows.length === 0 ? (
              <div className="space-y-3 mb-6">
                <p className="text-sm text-slate-500 py-2">Aucun exercice — ajoute le tien ou demande à ton coach.</p>
                <button
                  type="button"
                  onClick={() => void handleAddExercise()}
                  disabled={editBusy}
                  className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus size={18} />
                  {exSavingId === LOG_ADD ? 'Ajout…' : 'Ajouter un exercice'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {editRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">Ex. {idx + 1}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {exSavingId === row.id && (
                          <span className="text-[10px] font-semibold text-slate-500">Enregistrement…</span>
                        )}
                        {exDeletingId === row.id && (
                          <span className="text-[10px] font-semibold text-slate-500">Suppression…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteExercise(row.id)}
                          disabled={editBusy}
                          className="p-2 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40"
                          aria-label="Supprimer cet exercice"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nom</label>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRowField(row.id, 'name', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold mb-3 outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex. Squat"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Séries</label>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={row.sets === '' ? '' : row.sets}
                          onChange={(e) => updateRowField(row.id, 'sets', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                          placeholder="4"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Charge (kg)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.weight === '' ? '' : row.weight}
                          onChange={(e) => updateRowField(row.id, 'weight', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                          placeholder="60"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Répétitions</label>
                        <input
                          type="text"
                          value={row.reps}
                          onChange={(e) => updateRowField(row.id, 'reps', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                          placeholder="10 ou 8-10"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Repos</label>
                        <input
                          type="text"
                          value={row.rest_time}
                          onChange={(e) => updateRowField(row.id, 'rest_time', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                          placeholder="90s"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={editBusy || exSavingId === row.id || exSavingId === LOG_ADD}
                      onClick={() => void saveExerciseRow(row)}
                      className="mt-4 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50"
                    >
                      Enregistrer cet exercice
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => void handleAddExercise()}
                  disabled={editBusy}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm font-bold inline-flex items-center justify-center gap-2 hover:border-primary/50 hover:text-primary disabled:opacity-50"
                >
                  <Plus size={18} />
                  {exSavingId === LOG_ADD ? 'Ajout…' : 'Ajouter un exercice'}
                </button>
              </div>
            )}

            {currentWorkout.status !== 'completed' && (
              <button
                onClick={() => handleMarkCompleted(currentWorkout.id)}
                disabled={markingId === currentWorkout.id}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                {markingId === currentWorkout.id ? 'Enregistrement...' : 'Marquer comme terminée'}
              </button>
            )}
            {currentWorkout.status === 'completed' && (
              <div className="w-full py-3 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-2">
                <CheckCircle2 size={20} />
                Séance terminée
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-100 dark:bg-slate-900 p-10 rounded-2xl text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-slate-500">Aucune séance assignée pour le moment.</p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4">Toutes les séances</h2>
        {sortedList.length === 0 ? (
          <div className="bg-slate-100 dark:bg-slate-900 p-8 rounded-2xl text-center text-slate-500 text-sm">
            Aucune séance dans l'historique.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedList.map((w) => {
              const wid = w.id;
              if (!wid) return null;
              const isOpen = openedWorkoutId === wid;
              return (
                <button
                  key={wid}
                  type="button"
                  onClick={() => setOpenedWorkoutId(wid)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl text-left transition-colors border ${
                    isOpen
                      ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                      : 'bg-slate-100 dark:bg-slate-900 border-transparent hover:bg-slate-200/80 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`shrink-0 size-10 rounded-xl flex items-center justify-center ${w.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                      {w.status === 'completed' ? <CheckCircle2 size={20} /> : <Dumbbell size={20} />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm truncate">{w.title}</h4>
                      <p className="text-xs text-slate-500">
                        {formatWorkoutDate(w.date)} • {w.exercises?.length ?? 0} exercice{(w.exercises?.length ?? 0) !== 1 ? 's' : ''}
                        {w.status === 'completed' && ' • Terminé'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-slate-400" aria-hidden />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

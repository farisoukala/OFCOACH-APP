import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dumbbell,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Play,
  ArrowLeft,
} from 'lucide-react';
import { fetchWorkoutsByAthlete, updateWorkout } from '../services/api';
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

export const Workout: React.FC = () => {
  const [workouts, setWorkouts] = useState<WorkoutSchedulePick[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  /** Séance ouverte depuis la liste (bilan / relecture, y compris terminées). */
  const [openedWorkoutId, setOpenedWorkoutId] = useState<string | null>(null);
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
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-primary">{currentWorkout.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{currentWorkout.description || 'Aucune description'}</p>
                {currentWorkout.date && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Calendar size={12} /> {formatWorkoutDate(currentWorkout.date)}
                  </p>
                )}
              </div>
              <div className="bg-primary text-white p-2 rounded-xl">
                <Play size={20} fill="currentColor" />
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {currentWorkout.exercises?.length ? (
                currentWorkout.exercises.map((ex: WorkoutExerciseRow) => (
                  <div key={ex.id} className="flex items-center justify-between py-2 border-b border-primary/10 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {ex.sets ?? 0}x
                      </div>
                      <span className="font-medium">{ex.name}</span>
                    </div>
                    <span className="text-sm text-slate-500">
                      {ex.reps ?? '—'} reps {ex.weight != null ? `• ${ex.weight} kg` : ''}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 py-2">Aucun exercice dans cette séance.</p>
              )}
            </div>

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

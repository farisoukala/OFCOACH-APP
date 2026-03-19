import React, { useCallback, useEffect, useState } from 'react';
import {
  Dumbbell,
  Clock,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { fetchWorkoutsByAthlete, updateWorkout } from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatWorkoutDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (today) return "Aujourd'hui";
  if (yesterday.toDateString() === d.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const Workout: React.FC = () => {
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
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

  const pendingWorkouts = workouts.filter((w) => w.status !== 'completed');
  const currentWorkout = pendingWorkouts[0] ?? workouts[0];
  const completedCount = workouts.filter((w) => w.status === 'completed').length;

  const handleMarkCompleted = async (workoutId: string) => {
    if (markingId) return;
    setMarkingId(workoutId);
    try {
      await updateWorkout(workoutId, { status: 'completed' });
      await loadWorkouts();
    } catch (err: any) {
      console.error(err);
      const msg =
        (err?.code ? `[${err.code}] ` : '') +
        (err?.message || err?.error_description || err?.hint || 'Erreur lors de la mise à jour.');
      alert(msg);
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
        <h2 className="text-lg font-bold mb-4">Séance du jour</h2>
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
                currentWorkout.exercises.map((ex: any) => (
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
        <h2 className="text-lg font-bold mb-4">Historique</h2>
        {workouts.length === 0 ? (
          <div className="bg-slate-100 dark:bg-slate-900 p-8 rounded-2xl text-center text-slate-500 text-sm">
            Aucune séance dans l'historique.
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-900 rounded-2xl"
              >
                <div className="flex items-center gap-4">
                  <div className={`size-10 rounded-xl flex items-center justify-center ${w.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                    {w.status === 'completed' ? <CheckCircle2 size={20} /> : <Dumbbell size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{w.title}</h4>
                    <p className="text-xs text-slate-500">
                      {formatWorkoutDate(w.date)} • {w.exercises?.length ?? 0} exercices
                      {w.status === 'completed' && ' • Terminé'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-400" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

import React, { useEffect, useState, useRef, lazy, Suspense, useCallback, useMemo } from 'react';
import { 
  Bell, 
  Home,
  Dumbbell,
  Apple,
  TrendingUp,
  MessageCircle,
  User,
  Target,
  LogOut,
  Calendar,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  fetchWorkoutsByAthlete,
  fetchNutritionPlan,
  fetchAthleteAppointments,
  fetchClientById,
  updateExercise,
  insertExerciseForWorkout,
  deleteExercise,
  countUnreadNotifications,
  countUnreadMessagesForUser,
} from '../services/api';
import { pickFeaturedWorkout, localTodayIso } from '../lib/workoutPlanning';

const Progress = lazy(() => import('./Progress').then((m) => ({ default: m.Progress })));
const Nutrition = lazy(() => import('./Nutrition').then((m) => ({ default: m.Nutrition })));
const Workout = lazy(() => import('./Workout').then((m) => ({ default: m.Workout })));
const Profile = lazy(() => import('./Profile').then((m) => ({ default: m.Profile })));
import { useAuth } from '../context/AuthContext';

type Tab = 'accueil' | 'workout' | 'nutrition' | 'progress' | 'profile';

type LogbookRow = {
  id: string;
  name: string;
  sets: string | number;
  reps: string;
  weight: string | number;
  rest_time: string;
};

interface AthleteDashboardProps {
  onNavigateToMessages: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToCalendar?: () => void;
}

export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({
  onNavigateToMessages,
  onNavigateToNotifications,
  onNavigateToCalendar,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('accueil');
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [nutrition, setNutrition] = useState<any>(null);
  const [coachAppointments, setCoachAppointments] = useState<any[]>([]);
  const [coachingObjective, setCoachingObjective] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logbookRows, setLogbookRows] = useState<LogbookRow[]>([]);
  const [logbookSavingId, setLogbookSavingId] = useState<string | null>(null);
  const [logbookDeletingId, setLogbookDeletingId] = useState<string | null>(null);
  const [logbookError, setLogbookError] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { appUser, signOut } = useAuth();
  const athleteId = appUser?.id;
  const athleteName = appUser?.name ?? 'Athlète';
  const athleteAvatar = appUser?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop';

  useEffect(() => {
    const loadData = async () => {
      if (!athleteId) {
        setLoading(false);
        return;
      }
      try {
        const [workoutsData, nutritionData, appts, userRow] = await Promise.all([
          fetchWorkoutsByAthlete(athleteId),
          fetchNutritionPlan(athleteId),
          fetchAthleteAppointments(athleteId).catch(() => [] as any[]),
          fetchClientById(athleteId).catch(() => null),
        ]);
        setWorkouts(workoutsData);
        setNutrition(nutritionData);
        setCoachAppointments(appts || []);
        const o = userRow?.objectives;
        setCoachingObjective(typeof o === 'string' && o.trim() ? o.trim() : null);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [athleteId]);

  const refreshBadgeCounts = useCallback(async () => {
    if (!athleteId) return;
    try {
      const [n, m] = await Promise.all([
        countUnreadNotifications(athleteId).catch(() => 0),
        countUnreadMessagesForUser(athleteId).catch(() => 0),
      ]);
      setUnreadNotifications(n);
      setUnreadMessages(m);
    } catch {
      setUnreadNotifications(0);
      setUnreadMessages(0);
    }
  }, [athleteId]);

  useEffect(() => {
    void refreshBadgeCounts();
    const id = window.setInterval(() => void refreshBadgeCounts(), 60000);
    const onFocus = () => void refreshBadgeCounts();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshBadgeCounts]);

  const reloadWorkouts = useCallback(async () => {
    if (!athleteId) return;
    const data = await fetchWorkoutsByAthlete(athleteId);
    setWorkouts(data);
  }, [athleteId]);

  const logbookWorkout = useMemo(() => {
    const f = pickFeaturedWorkout(workouts);
    if (f) return f;
    if (Array.isArray(workouts) && workouts.length > 0) return workouts[0];
    return null;
  }, [workouts]);

  useEffect(() => {
    if (!logbookWorkout?.id) {
      setLogbookRows([]);
      return;
    }
    const ex = logbookWorkout.exercises;
    if (!Array.isArray(ex) || ex.length === 0) {
      setLogbookRows([]);
      return;
    }
    setLogbookRows(
      ex.map((e: any) => ({
        id: String(e.id),
        name: String(e.name ?? ''),
        sets: e.sets != null && e.sets !== '' ? e.sets : '',
        reps: String(e.reps ?? ''),
        weight: e.weight != null && e.weight !== '' ? e.weight : '',
        rest_time: String(e.rest_time ?? ''),
      }))
    );
  }, [workouts, logbookWorkout?.id]);

  const saveLogbookRow = async (row: LogbookRow) => {
    if (!row.id) return;
    setLogbookSavingId(row.id);
    setLogbookError(null);
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
      await reloadWorkouts();
    } catch (e) {
      console.error(e);
      const detail =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
          ? (e as { message: string }).message
          : e instanceof Error
            ? e.message
            : '';
      setLogbookError(
        detail
          ? `Impossible d’enregistrer : ${detail}. Si c’est un refus d’accès, ré-exécute supabase_migration_exercises_athlete_update.sql sur Supabase.`
          : 'Impossible d’enregistrer. Ré-exécute sur Supabase supabase_migration_exercises_athlete_update.sql (droits athlète sur exercises).'
      );
    } finally {
      setLogbookSavingId(null);
    }
  };

  const updateLogbookField = (id: string, field: keyof LogbookRow, value: string | number) => {
    setLogbookRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const LOG_ADD = '__add_exercise__';

  const handleAddLogbookExercise = async () => {
    if (!logbookWorkout?.id) {
      setLogbookError(
        'Aucune séance disponible pour ajouter un exercice. Ouvre l’onglet Entraînement ou demande à ton coach de te créer une séance.'
      );
      return;
    }
    setLogbookSavingId(LOG_ADD);
    setLogbookError(null);
    try {
      await insertExerciseForWorkout(logbookWorkout.id);
      await reloadWorkouts();
    } catch (e) {
      console.error(e);
      const detail =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
          ? (e as { message: string }).message
          : e instanceof Error
            ? e.message
            : '';
      setLogbookError(
        detail
          ? `Impossible d’ajouter l’exercice : ${detail}. Si c’est un refus d’accès, ré-exécute supabase_migration_exercises_athlete_update.sql sur Supabase.`
          : 'Impossible d’ajouter l’exercice. Ré-exécute sur Supabase le script supabase_migration_exercises_athlete_update.sql (INSERT, UPDATE et DELETE).'
      );
    } finally {
      setLogbookSavingId(null);
    }
  };

  const handleDeleteLogbookExercise = async (exerciseId: string) => {
    if (!window.confirm('Supprimer cet exercice ?')) return;
    setLogbookDeletingId(exerciseId);
    setLogbookError(null);
    try {
      await deleteExercise(exerciseId);
      await reloadWorkouts();
    } catch (e) {
      console.error(e);
      const detail =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: string }).message === 'string'
          ? (e as { message: string }).message
          : e instanceof Error
            ? e.message
            : '';
      setLogbookError(
        detail
          ? `Impossible de supprimer : ${detail}. Si c’est un refus d’accès, ré-exécute supabase_migration_exercises_athlete_update.sql sur Supabase (policy DELETE).`
          : 'Impossible de supprimer. Ré-exécute sur Supabase supabase_migration_exercises_athlete_update.sql (policy DELETE sur exercises).'
      );
    } finally {
      setLogbookDeletingId(null);
    }
  };

  const logbookBusy = logbookSavingId !== null || logbookDeletingId !== null;

  const prevTabRef = useRef<Tab>(activeTab);
  useEffect(() => {
    const prev = prevTabRef.current;
    prevTabRef.current = activeTab;
    if (!athleteId || activeTab !== 'accueil' || prev === 'accueil') return;
    void fetchClientById(athleteId)
      .then((row) => {
        const ob = row?.objectives;
        setCoachingObjective(typeof ob === 'string' && ob.trim() ? ob.trim() : null);
      })
      .catch(() => {});
  }, [activeTab, athleteId]);

  const todayIso = localTodayIso();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const nextCoachAppt = [...coachAppointments]
    .filter((a) => a?.starts_at && !Number.isNaN(new Date(a.starts_at).getTime()))
    .filter((a) => new Date(a.starts_at) >= startOfToday)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];

  const renderContent = () => {
    switch (activeTab) {
      case 'accueil':
        return (
          <div className="space-y-8">
            {onNavigateToCalendar && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="text-primary" size={20} />
                    Rendez-vous coach
                  </h2>
                  <button
                    type="button"
                    onClick={() => onNavigateToCalendar()}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Planning complet
                  </button>
                </div>
                {nextCoachAppt ? (
                  <button
                    type="button"
                    onClick={() => onNavigateToCalendar()}
                    className="w-full text-left bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/25 rounded-2xl p-4 space-y-1 hover:bg-sky-500/15 transition-colors"
                  >
                    <p className="text-xs font-bold uppercase text-sky-600 dark:text-sky-400">Prochain créneau</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{nextCoachAppt.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {new Date(nextCoachAppt.starts_at).toLocaleString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {nextCoachAppt.duration_minutes != null ? ` · ${nextCoachAppt.duration_minutes} min` : ''}
                    </p>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigateToCalendar()}
                    className="w-full py-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 text-sm font-medium hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    Aucun rendez-vous à venir — ouvre le planning pour tes événements perso
                  </button>
                )}
              </section>
            )}

            <section>
              <h2 className="text-lg font-bold mb-4 tracking-wide">OBJECTIF</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-2xl border border-transparent dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <TrendingUp className="text-orange-500" size={20} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Objectif calories</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight">{nutrition?.calories_target ?? '--'}</span>
                    <span className="text-xs text-slate-500">kcal</span>
                  </div>
                </div>
                <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-2xl border border-transparent dark:border-slate-700 min-h-[108px] flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                      <Target className="text-emerald-600 dark:text-emerald-400" size={20} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Objectif coach</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-4">
                    {coachingObjective || (
                      <span className="font-medium text-slate-500 dark:text-slate-400">
                        Non défini — ton coach peut l’indiquer dans ton profil (ex. perte de poids, prise de masse, santé).
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </section>

            <section className="pb-2">
              <div className="flex items-center justify-between mb-2 gap-2">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Dumbbell className="text-primary shrink-0" size={20} />
                  Carnet d’entraînement
                </h2>
                <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-lg uppercase tracking-wider shrink-0">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Ajoute des exercices, puis modifie séries, charges, répétitions et repos ; enregistre chaque ligne avec le bouton sous la carte.
              </p>

              {logbookWorkout ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{logbookWorkout.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {logbookWorkout.date
                          ? String(logbookWorkout.date) === todayIso
                            ? "Séance prévue aujourd’hui"
                            : new Date(String(logbookWorkout.date) + 'T12:00:00').toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'short',
                              })
                          : 'Date à définir'}
                        {logbookRows.length ? ` · ${logbookRows.length} exercice${logbookRows.length > 1 ? 's' : ''}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleAddLogbookExercise}
                        disabled={logbookBusy}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary text-white px-3 py-2 rounded-xl disabled:opacity-50 active:scale-[0.98]"
                      >
                        <Plus size={16} />
                        {logbookSavingId === LOG_ADD ? 'Ajout…' : 'Ajouter un exercice'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('workout')}
                        className="text-xs font-bold text-primary hover:underline whitespace-nowrap"
                      >
                        Planning complet
                      </button>
                    </div>
                  </div>

                  {logbookError && (
                    <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-xl px-3 py-2">{logbookError}</p>
                  )}

                  {logbookRows.length === 0 ? (
                    <div className="bg-slate-100 dark:bg-slate-900 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                      <p className="text-slate-500 text-sm">Aucun exercice dans cette séance pour l’instant.</p>
                      <button
                        type="button"
                        onClick={handleAddLogbookExercise}
                        disabled={logbookBusy}
                        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50"
                      >
                        <Plus size={18} />
                        {logbookSavingId === LOG_ADD ? 'Ajout…' : 'Ajouter un exercice'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('workout')}
                        className="text-primary text-sm font-bold hover:underline block w-full"
                      >
                        Voir l’onglet Entraînement
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {logbookRows.map((row, idx) => (
                        <div
                          key={row.id}
                          className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">Ex. {idx + 1}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {logbookSavingId === row.id && (
                                <span className="text-[10px] font-semibold text-slate-500">Enregistrement…</span>
                              )}
                              {logbookDeletingId === row.id && (
                                <span className="text-[10px] font-semibold text-slate-500">Suppression…</span>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleDeleteLogbookExercise(row.id)}
                                disabled={logbookBusy}
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
                            onChange={(e) => updateLogbookField(row.id, 'name', e.target.value)}
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
                                onChange={(e) => updateLogbookField(row.id, 'sets', e.target.value)}
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
                                onChange={(e) => updateLogbookField(row.id, 'weight', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                placeholder="60"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Répétitions</label>
                              <input
                                type="text"
                                value={row.reps}
                                onChange={(e) => updateLogbookField(row.id, 'reps', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                placeholder="10 ou 8-10"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Repos</label>
                              <input
                                type="text"
                                value={row.rest_time}
                                onChange={(e) => updateLogbookField(row.id, 'rest_time', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                                placeholder="90s"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={
                              logbookBusy || logbookSavingId === row.id || logbookSavingId === LOG_ADD
                            }
                            onClick={() => saveLogbookRow(row)}
                            className="mt-4 w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 active:scale-[0.99] transition-transform"
                          >
                            Enregistrer cet exercice
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddLogbookExercise}
                        disabled={logbookBusy}
                        className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm font-bold inline-flex items-center justify-center gap-2 hover:border-primary/50 hover:text-primary disabled:opacity-50 transition-colors"
                      >
                        <Plus size={18} />
                        {logbookSavingId === LOG_ADD ? 'Ajout…' : 'Ajouter un exercice'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-100 dark:bg-slate-900 p-8 rounded-2xl text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">Aucune séance à afficher pour le moment.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('workout')}
                    className="text-primary font-bold text-sm hover:underline inline-flex items-center gap-1"
                  >
                    <TrendingUp size={16} />
                    Ouvrir Entraînement
                  </button>
                </div>
              )}
            </section>
          </div>
        );
      case 'workout':
        return (
          <Suspense fallback={<div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>}>
            <Workout />
          </Suspense>
        );
      case 'nutrition':
        return (
          <Suspense fallback={<div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>}>
            <Nutrition />
          </Suspense>
        );
      case 'progress':
        return (
          <Suspense fallback={<div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>}>
            <Progress />
          </Suspense>
        );
      case 'profile':
        return (
          <Suspense fallback={<div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" /></div>}>
            <Profile />
          </Suspense>
        );
      default:
        return <div className="text-center py-20 opacity-50">En cours de développement...</div>;
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen pb-24 font-display">
      <header className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-12 rounded-full border-2 border-primary p-0.5">
                <img 
                  className="size-full rounded-full object-cover" 
                  src={athleteAvatar} 
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-background-dark rounded-full"></div>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bon retour,</p>
              <h1 className="text-xl font-bold tracking-tight">Salut {athleteName} ! 👋</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToCalendar && (
              <button
                type="button"
                onClick={() => onNavigateToCalendar()}
                className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/20 transition-colors"
                title="Planning"
              >
                <Calendar size={20} />
              </button>
            )}
            <button
              onClick={() => onNavigateToNotifications?.()}
              className="relative p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary/20 transition-colors"
            >
              <Bell size={20} />
              <span className="absolute top-2 right-2 size-2 bg-primary rounded-full ring-2 ring-background-dark"></span>
            </button>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <LogOut size={14} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs for athlete view */}
        <div className="flex px-4">
          {[
            { id: 'accueil', label: 'Accueil', icon: <Home size={16} /> },
            { id: 'progress', label: 'Progrès', icon: <TrendingUp size={16} /> },
            { id: 'nutrition', label: 'Nutrition', icon: <Apple size={16} /> },
            { id: 'workout', label: 'Entraînement', icon: <Dumbbell size={16} /> }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-slate-400'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-6 py-8 max-w-xl mx-auto">
        <div key={activeTab}>
          {renderContent()}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background-light dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pt-3 pb-8 z-50 px-2">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab('accueil')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'accueil' ? 'text-primary' : 'text-slate-400'}`}
          >
            <Home size={24} />
            <span className="text-[10px] font-bold">Accueil</span>
          </button>
          <button 
            onClick={() => setActiveTab('workout')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'workout' ? 'text-primary' : 'text-slate-400'}`}
          >
            <Dumbbell size={24} />
            <span className="text-[10px] font-medium">Entraînement</span>
          </button>
          <button 
            onClick={() => setActiveTab('nutrition')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'nutrition' ? 'text-primary' : 'text-slate-400'}`}
          >
            <Apple size={24} />
            <span className="text-[10px] font-medium">Nutrition</span>
          </button>
          <button 
            onClick={() => setActiveTab('progress')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'progress' ? 'text-primary' : 'text-slate-400'}`}
          >
            <TrendingUp size={24} />
            <span className="text-[10px] font-medium">Progrès</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateToMessages()}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors relative"
          >
            <MessageCircle size={24} />
            <span className="text-[10px] font-medium">Messagerie</span>
            {unreadMessages > 0 && (
              <span className="absolute top-0 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full ring-2 ring-background-light dark:ring-background-dark">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-primary' : 'text-slate-400'}`}
          >
            <User size={24} />
            <span className="text-[10px] font-medium">Profil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

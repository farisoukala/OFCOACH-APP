import React, { useEffect, useState, lazy, Suspense } from 'react';
import { 
  Bell, 
  Home,
  Dumbbell,
  Apple,
  TrendingUp,
  MessageCircle,
  User,
  Clock,
  LogOut,
  Calendar,
} from 'lucide-react';
import { fetchWorkoutsByAthlete, fetchNutritionPlan, fetchAthleteAppointments } from '../services/api';
import { pickFeaturedWorkout, localTodayIso } from '../lib/workoutPlanning';

const Progress = lazy(() => import('./Progress').then((m) => ({ default: m.Progress })));
const Nutrition = lazy(() => import('./Nutrition').then((m) => ({ default: m.Nutrition })));
const Workout = lazy(() => import('./Workout').then((m) => ({ default: m.Workout })));
const Profile = lazy(() => import('./Profile').then((m) => ({ default: m.Profile })));
import { useAuth } from '../context/AuthContext';

type Tab = 'accueil' | 'workout' | 'nutrition' | 'progress' | 'profile';

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
  const [loading, setLoading] = useState(true);
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
        const [workoutsData, nutritionData, appts] = await Promise.all([
          fetchWorkoutsByAthlete(athleteId),
          fetchNutritionPlan(athleteId),
          fetchAthleteAppointments(athleteId).catch(() => [] as any[]),
        ]);
        setWorkouts(workoutsData);
        setNutrition(nutritionData);
        setCoachAppointments(appts || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [athleteId]);

  const featuredWorkout = pickFeaturedWorkout(workouts);
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
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Séance du jour</h2>
                <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-lg uppercase tracking-wider">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              </div>
              {featuredWorkout ? (
                <div className="relative overflow-hidden rounded-2xl group shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent z-10"></div>
                  <img 
                    src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop" 
                    className="w-full aspect-[16/9] object-cover group-hover:scale-105 transition-transform duration-500" 
                    alt="Workout"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                    <div className="flex items-center gap-2 mb-1">
                      <Dumbbell className="text-primary" size={14} />
                      <p className="text-primary text-sm font-bold uppercase tracking-widest">Force & Puissance</p>
                    </div>
                    <h3 className="text-2xl font-extrabold text-white mb-1">{featuredWorkout.title}</h3>
                    <p className="text-slate-300 text-sm mb-1">
                      {featuredWorkout.exercises?.length || 0} exercices
                      {featuredWorkout.date && (
                        <>
                          {' '}
                          ·{' '}
                          {String(featuredWorkout.date) === todayIso
                            ? "Prévue aujourd'hui"
                            : new Date(featuredWorkout.date + 'T12:00:00').toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'short',
                              })}
                        </>
                      )}
                    </p>
                    <p className="text-slate-400 text-xs mb-4">Voir l’onglet Entraînement pour le planning de la semaine.</p>
                    <button 
                      onClick={() => setActiveTab('workout')}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <TrendingUp size={20} />
                      Démarrer la séance
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-100 dark:bg-slate-900 p-10 rounded-2xl text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-slate-500">Repos aujourd'hui ! 🧘‍♂️</p>
                </div>
              )}
            </section>

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
              <h2 className="text-lg font-bold mb-4">Statistiques récentes</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-2xl border border-transparent dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <TrendingUp className="text-orange-500" size={20} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Objectif Cal.</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight">{nutrition?.calories_target || '--'}</span>
                    <span className="text-xs text-slate-500">kcal</span>
                  </div>
                </div>
                <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-2xl border border-transparent dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Clock className="text-blue-500" size={20} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Activité</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold tracking-tight">185</span>
                    <span className="text-xs text-slate-500">min</span>
                  </div>
                </div>
              </div>
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
            onClick={() => onNavigateToMessages()}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors relative"
          >
            <MessageCircle size={24} />
            <span className="text-[10px] font-medium">Messagerie</span>
            <span className="absolute -top-1 right-2 size-2 bg-red-500 rounded-full border-2 border-background-dark"></span>
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

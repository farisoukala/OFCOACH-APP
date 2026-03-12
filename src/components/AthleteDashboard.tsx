import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Home,
  Dumbbell,
  Apple,
  TrendingUp,
  MessageCircle,
  User,
  Clock,
  LogOut
} from 'lucide-react';
import { Progress } from './Progress';
import { Nutrition } from './Nutrition';
import { Workout } from './Workout';
import { Profile } from './Profile';
import { fetchWorkoutsByAthlete, fetchNutritionPlan } from '../services/api';
import { useAuth } from '../context/AuthContext';

type Tab = 'accueil' | 'workout' | 'nutrition' | 'progress' | 'profile';

interface AthleteDashboardProps {
  onNavigateToMessages: () => void;
  onNavigateToNotifications?: () => void;
}

export const AthleteDashboard: React.FC<AthleteDashboardProps> = ({ onNavigateToMessages, onNavigateToNotifications }) => {
  const [activeTab, setActiveTab] = useState<Tab>('accueil');
  const [workout, setWorkout] = useState<any>(null);
  const [nutrition, setNutrition] = useState<any>(null);
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
        const [workoutsData, nutritionData] = await Promise.all([
          fetchWorkoutsByAthlete(athleteId),
          fetchNutritionPlan(athleteId)
        ]);
        setWorkout(workoutsData[0]);
        setNutrition(nutritionData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [athleteId]);

  const renderContent = () => {
    switch (activeTab) {
      case 'accueil':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Séance du jour</h2>
                <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-lg uppercase tracking-wider">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              </div>
              {workout ? (
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
                    <h3 className="text-2xl font-extrabold text-white mb-1">{workout.title}</h3>
                    <p className="text-slate-300 text-sm mb-4">{workout.exercises?.length || 0} exercices • Intensité Élevée</p>
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
          </motion.div>
        );
      case 'workout':
        return <Workout />;
      case 'nutrition':
        return <Nutrition />;
      case 'progress':
        return <Progress />;
      case 'profile':
        return <Profile />;
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
            <button
              onClick={onNavigateToNotifications}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
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

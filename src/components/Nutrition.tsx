import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Utensils, 
  Flame, 
  Droplets, 
  Wheat, 
  Beef,
  CheckCircle2,
  ChevronRight,
  Plus,
  Sunrise,
  Sun,
  Moon,
  Smartphone,
  PlusCircle,
  History
} from 'lucide-react';
import { fetchNutritionPlan, updateMeal } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MACRO_COLORS: Record<string, string> = { 'Protéines': '#3b82f6', 'Glucides': '#f59e0b', 'Lipides': '#f43f5e' };

export const Nutrition: React.FC = () => {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { appUser } = useAuth();
  const athleteId = appUser?.id;

  const loadPlan = React.useCallback(async () => {
    if (!athleteId) return;
    try {
      const data = await fetchNutritionPlan(athleteId);
      setPlan(data);
    } catch (error) {
      console.error('Error loading nutrition plan:', error);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    if (!athleteId) {
      setLoading(false);
      return;
    }
    loadPlan();
  }, [athleteId, loadPlan]);

  const toggleMealCompleted = async (meal: any) => {
    if (togglingId) return;
    setTogglingId(meal.id);
    try {
      await updateMeal(meal.id, { is_completed: !meal.is_completed });
      await loadPlan();
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="text-center py-20 text-slate-500">
        Aucun plan nutritionnel assigné.
      </div>
    );
  }

  const caloriesTarget = plan.calories_target || 2000;
  const completedCalories = plan.meals?.reduce((acc: number, meal: any) => meal.is_completed ? acc + (meal.calories || 0) : acc, 0) || 0;
  const progressPercent = caloriesTarget ? Math.min(Math.round((completedCalories / caloriesTarget) * 100), 100) : 0;

  return (
    <div className="space-y-6 pb-24">
      <section className="bg-white dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-slate-900 dark:text-white font-bold text-lg">Aujourd'hui</h3>
          <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-wider">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        
        <div className="flex flex-col items-center justify-center relative py-4">
          <div className="relative flex items-center justify-center">
            <svg className="size-48">
              <circle className="text-slate-200 dark:text-slate-800" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeWidth="10"></circle>
              <circle 
                className="text-primary" 
                cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" 
                strokeDasharray="502.6" 
                strokeDashoffset={502.6 - (502.6 * progressPercent / 100)} 
                strokeLinecap="round" 
                strokeWidth="10" 
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', filter: 'drop-shadow(0 0 4px rgba(17, 82, 212, 0.4))' }}
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{completedCalories}</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">/ {caloriesTarget} kcal</span>
              <div className="mt-2 text-primary font-bold bg-primary/10 px-3 py-1 rounded-full text-xs">{progressPercent}% atteint</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          {[
            { label: 'Protéines', current: plan.meals?.filter((m: any) => m.is_completed).reduce((acc: number, m: any) => acc + (m.protein || 0), 0) || 0, total: plan.protein_target || 150 },
            { label: 'Glucides', current: plan.meals?.filter((m: any) => m.is_completed).reduce((acc: number, m: any) => acc + (m.carbs || 0), 0) || 0, total: plan.carbs_target || 250 },
            { label: 'Lipides', current: plan.meals?.filter((m: any) => m.is_completed).reduce((acc: number, m: any) => acc + (m.fat || 0), 0) || 0, total: plan.fat_target || 70 }
          ].map((macro) => (
            <div key={macro.label} className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <span>{macro.label}</span>
                <span className="text-slate-900 dark:text-slate-200">{macro.current}/{macro.total}g</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min((macro.total ? (macro.current / macro.total) * 100 : 0), 100)}%`, backgroundColor: MACRO_COLORS[macro.label] || '#94a3b8' }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-slate-900 dark:text-white font-bold text-lg">Journal Alimentaire</h3>
          <button className="text-primary text-sm font-bold flex items-center gap-1">
            <History size={14} /> Historique
          </button>
        </div>
        
        <div className="space-y-3">
          {plan.meals?.map((meal: any) => (
            <button
              key={meal.id}
              type="button"
              onClick={() => toggleMealCompleted(meal)}
              disabled={togglingId === meal.id}
              className="w-full bg-white dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-4 text-left hover:border-primary/30 transition-colors disabled:opacity-70"
            >
              <div className={`size-12 rounded-lg flex items-center justify-center flex-shrink-0 ${meal.is_completed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                {meal.is_completed ? <CheckCircle2 size={24} /> : <Utensils size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white">{meal.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  P: {meal.protein ?? 0}g • G: {meal.carbs ?? 0}g • L: {meal.fat ?? 0}g
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="block font-bold text-slate-900 dark:text-white">{meal.calories ?? 0} <span className="text-[10px] font-medium text-slate-500">kcal</span></span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">{meal.time || '—'}</span>
              </div>
            </button>
          ))}
        </div>

        <button className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:border-primary/50 hover:text-primary transition-all group">
          <PlusCircle className="group-hover:scale-110 transition-transform" size={20} />
          <span className="text-sm font-bold">Ajouter un repas</span>
        </button>
      </section>
    </div>
  );
};

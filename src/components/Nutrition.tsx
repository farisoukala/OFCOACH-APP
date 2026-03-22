import React, { useEffect, useState, useCallback } from 'react';
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
  History,
  Pencil,
  X,
  Trash2,
} from 'lucide-react';
import {
  fetchNutritionPlan,
  updateMeal,
  updateNutritionPlan,
  deleteMealsForPlan,
  addMealToPlan,
} from '../services/api';
import { localTodayIso } from '../lib/workoutPlanning';
import { useAuth } from '../context/AuthContext';

const MACRO_COLORS: Record<string, string> = { Protéines: '#3b82f6', Glucides: '#f59e0b', Lipides: '#f43f5e' };

function formatErr(err: any, fallback: string) {
  if (!err) return fallback;
  const parts = [err.code && `[${err.code}]`, err.message, err.details, err.hint].filter(Boolean);
  return parts.length ? parts.join(' ') : fallback;
}

export const Nutrition: React.FC = () => {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    date: '',
    calories_target: 2000,
    protein_target: 150,
    carbs_target: 250,
    fat_target: 70,
  });
  const [editMeals, setEditMeals] = useState<
    { name: string; calories: string; protein: string; carbs: string; fat: string; time: string }[]
  >([{ name: '', calories: '', protein: '', carbs: '', fat: '', time: '12:00' }]);

  const { appUser } = useAuth();
  const athleteId = appUser?.id;

  const loadPlan = useCallback(async () => {
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

  const openEditModal = () => {
    if (!plan) return;
    const d = plan.date ? String(plan.date).slice(0, 10) : localTodayIso();
    setEditForm({
      title: plan.title || 'Mon plan',
      date: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : localTodayIso(),
      calories_target: plan.calories_target ?? 2000,
      protein_target: plan.protein_target ?? 150,
      carbs_target: plan.carbs_target ?? 250,
      fat_target: plan.fat_target ?? 70,
    });
    const meals = plan.meals;
    if (Array.isArray(meals) && meals.length > 0) {
      setEditMeals(
        meals.map((m: any) => ({
          name: m.name ?? '',
          calories: m.calories != null ? String(m.calories) : '',
          protein: m.protein != null ? String(m.protein) : '',
          carbs: m.carbs != null ? String(m.carbs) : '',
          fat: m.fat != null ? String(m.fat) : '',
          time: m.time ?? '12:00',
        }))
      );
    } else {
      setEditMeals([{ name: '', calories: '', protein: '', carbs: '', fat: '', time: '12:00' }]);
    }
    setEditError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setShowEditModal(false);
    setEditError(null);
  };

  const addEditMeal = () => {
    setEditMeals((m) => [...m, { name: '', calories: '', protein: '', carbs: '', fat: '', time: '12:00' }]);
  };
  const removeEditMeal = (idx: number) => {
    setEditMeals((m) => m.filter((_, i) => i !== idx));
  };
  const updateEditMeal = (idx: number, field: string, value: string) => {
    setEditMeals((m) => m.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const handleSaveEdit = async () => {
    if (!plan?.id || !athleteId) return;
    setEditError(null);
    const mealsToAdd = editMeals.filter((m) => m.name.trim());
    if (mealsToAdd.length === 0) {
      setEditError('Ajoute au moins un repas avec un nom.');
      return;
    }
    setEditSaving(true);
    try {
      const toIntOrNull = (v: string) => {
        const s = String(v).trim();
        if (!s) return null;
        const n = parseInt(s, 10);
        return Number.isNaN(n) ? null : n;
      };
      await updateNutritionPlan(plan.id, {
        title: editForm.title || 'Mon plan',
        date: editForm.date || localTodayIso(),
        calories_target: editForm.calories_target || null,
        protein_target: editForm.protein_target || null,
        carbs_target: editForm.carbs_target || null,
        fat_target: editForm.fat_target || null,
      });
      await deleteMealsForPlan(plan.id);
      for (const meal of mealsToAdd) {
        await addMealToPlan(plan.id, {
          name: meal.name.trim(),
          calories: toIntOrNull(meal.calories),
          protein: toIntOrNull(meal.protein),
          carbs: toIntOrNull(meal.carbs),
          fat: toIntOrNull(meal.fat),
          time: meal.time || null,
        });
      }
      await loadPlan();
      setShowEditModal(false);
      setEditError(null);
    } catch (e: any) {
      console.error(e);
      setEditError(formatErr(e, 'Impossible d’enregistrer. Vérifie que la migration SQL « nutrition athlète » est appliquée sur Supabase.'));
    } finally {
      setEditSaving(false);
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
  const completedCalories =
    plan.meals?.reduce((acc: number, meal: any) => (meal.is_completed ? acc + (meal.calories || 0) : acc), 0) || 0;
  const progressPercent = caloriesTarget ? Math.min(Math.round((completedCalories / caloriesTarget) * 100), 100) : 0;

  return (
    <div className="space-y-6 pb-24">
      <section className="bg-white dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6 gap-2">
          <h3 className="text-slate-900 dark:text-white font-bold text-lg">Aujourd'hui</h3>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={openEditModal}
              className="text-primary text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/15"
            >
              <Pencil size={14} />
              Modifier mon plan
            </button>
            <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded-full uppercase tracking-wider">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center relative py-4">
          <div className="relative flex items-center justify-center">
            <svg className="size-48">
              <circle className="text-slate-200 dark:text-slate-800" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeWidth="10"></circle>
              <circle
                className="text-primary"
                cx="96"
                cy="96"
                fill="transparent"
                r="80"
                stroke="currentColor"
                strokeDasharray="502.6"
                strokeDashoffset={502.6 - (502.6 * progressPercent) / 100}
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
            {
              label: 'Protéines',
              current: plan.meals?.filter((m: any) => m.is_completed).reduce((acc: number, m: any) => acc + (m.protein || 0), 0) || 0,
              total: plan.protein_target || 150,
            },
            {
              label: 'Glucides',
              current: plan.meals?.filter((m: any) => m.is_completed).reduce((acc: number, m: any) => acc + (m.carbs || 0), 0) || 0,
              total: plan.carbs_target || 250,
            },
            {
              label: 'Lipides',
              current: plan.meals?.filter((m: any) => m.is_completed).reduce((acc: number, m: any) => acc + (m.fat || 0), 0) || 0,
              total: plan.fat_target || 70,
            },
          ].map((macro) => (
            <div key={macro.label} className="space-y-2">
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                <span>{macro.label}</span>
                <span className="text-slate-900 dark:text-slate-200">
                  {macro.current}/{macro.total}g
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(macro.total ? (macro.current / macro.total) * 100 : 0, 100)}%`,
                    backgroundColor: MACRO_COLORS[macro.label] || '#94a3b8',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-slate-900 dark:text-white font-bold text-lg">Journal Alimentaire</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openEditModal} className="text-primary text-sm font-bold flex items-center gap-1">
              <Pencil size={14} /> Modifier
            </button>
            <button type="button" className="text-slate-400 text-sm font-bold flex items-center gap-1 cursor-default" disabled>
              <History size={14} /> Historique
            </button>
          </div>
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
              <div
                className={`size-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  meal.is_completed
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                {meal.is_completed ? <CheckCircle2 size={24} /> : <Utensils size={24} />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 dark:text-white">{meal.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  P: {meal.protein ?? 0}g • G: {meal.carbs ?? 0}g • L: {meal.fat ?? 0}g
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="block font-bold text-slate-900 dark:text-white">
                  {meal.calories ?? 0} <span className="text-[10px] font-medium text-slate-500">kcal</span>
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">{meal.time || '—'}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={openEditModal}
          className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:border-primary/50 hover:text-primary transition-all group"
        >
          <PlusCircle className="group-hover:scale-110 transition-transform" size={20} />
          <span className="text-sm font-bold">Ajouter ou modifier des repas</span>
        </button>
      </section>

      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div role="presentation" onClick={() => closeEditModal()} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-background-light dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">Modifier mon plan</h3>
              <button type="button" onClick={() => closeEditModal()} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Tu peux ajuster objectifs et repas. Ton coach voit les mises à jour sur ta fiche.
              </p>
              {editError && <p className="text-sm text-red-500">{editError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Titre</label>
                  <input
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    value={editForm.calories_target}
                    onChange={(e) => setEditForm((f) => ({ ...f, calories_target: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Protéines (g)</label>
                  <input
                    type="number"
                    value={editForm.protein_target}
                    onChange={(e) => setEditForm((f) => ({ ...f, protein_target: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Glucides (g)</label>
                  <input
                    type="number"
                    value={editForm.carbs_target}
                    onChange={(e) => setEditForm((f) => ({ ...f, carbs_target: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lipides (g)</label>
                  <input
                    type="number"
                    value={editForm.fat_target}
                    onChange={(e) => setEditForm((f) => ({ ...f, fat_target: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Repas</label>
                  <button type="button" onClick={addEditMeal} className="text-primary text-xs font-bold flex items-center gap-1">
                    <Plus size={14} /> Ajouter
                  </button>
                </div>
                <div className="space-y-3">
                  {editMeals.map((meal, idx) => (
                    <div key={idx} className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl space-y-2">
                      <div className="flex justify-between gap-2">
                        <input
                          value={meal.name}
                          onChange={(e) => updateEditMeal(idx, 'name', e.target.value)}
                          placeholder="Nom du repas"
                          className="flex-1 bg-white dark:bg-slate-700 rounded-lg px-3 py-2 text-sm outline-none"
                        />
                        <input
                          value={meal.time}
                          onChange={(e) => updateEditMeal(idx, 'time', e.target.value)}
                          placeholder="Heure"
                          className="w-20 bg-white dark:bg-slate-700 rounded-lg px-2 py-2 text-sm outline-none"
                        />
                        <button type="button" onClick={() => removeEditMeal(idx)} className="text-red-500 p-1 shrink-0">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <input
                          type="number"
                          value={meal.calories}
                          onChange={(e) => updateEditMeal(idx, 'calories', e.target.value)}
                          placeholder="kcal"
                          className="bg-white dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                        />
                        <input
                          type="number"
                          value={meal.protein}
                          onChange={(e) => updateEditMeal(idx, 'protein', e.target.value)}
                          placeholder="P"
                          className="bg-white dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                        />
                        <input
                          type="number"
                          value={meal.carbs}
                          onChange={(e) => updateEditMeal(idx, 'carbs', e.target.value)}
                          placeholder="G"
                          className="bg-white dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                        />
                        <input
                          type="number"
                          value={meal.fat}
                          onChange={(e) => updateEditMeal(idx, 'fat', e.target.value)}
                          placeholder="L"
                          className="bg-white dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => void handleSaveEdit()}
                disabled={editSaving}
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {editSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

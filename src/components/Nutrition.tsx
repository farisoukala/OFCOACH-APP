import React, { useEffect, useState, useCallback } from 'react';
import { Flame, Pencil, X, Target } from 'lucide-react';
import { fetchNutritionPlan, updateNutritionPlan } from '../services/api';
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
    setEditError(null);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setShowEditModal(false);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!plan?.id || !athleteId) return;
    setEditError(null);
    setEditSaving(true);
    try {
      await updateNutritionPlan(plan.id, {
        title: editForm.title || 'Mon plan',
        date: editForm.date || localTodayIso(),
        calories_target: editForm.calories_target || null,
        protein_target: editForm.protein_target || null,
        carbs_target: editForm.carbs_target || null,
        fat_target: editForm.fat_target || null,
      });
      await loadPlan();
      setShowEditModal(false);
      setEditError(null);
    } catch (e: any) {
      console.error(e);
      setEditError(
        formatErr(e, 'Impossible d’enregistrer. Vérifie que les droits RLS nutrition sont bien configurés sur Supabase.')
      );
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

  const caloriesTarget = plan.calories_target ?? 0;
  const proteinTarget = plan.protein_target ?? 0;
  const carbsTarget = plan.carbs_target ?? 0;
  const fatTarget = plan.fat_target ?? 0;

  const macroRows = [
    { label: 'Protéines' as const, value: proteinTarget, unit: 'g' },
    { label: 'Glucides' as const, value: carbsTarget, unit: 'g' },
    { label: 'Lipides' as const, value: fatTarget, unit: 'g' },
  ];

  return (
    <div className="space-y-6 pb-24">
      <section className="bg-white dark:bg-slate-900/50 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6 gap-2">
          <h3 className="text-slate-900 dark:text-white font-bold text-lg flex items-center gap-2">
            <Target className="text-primary shrink-0" size={22} />
            Objectifs à atteindre
          </h3>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={openEditModal}
              className="text-primary text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/15"
            >
              <Pencil size={14} />
              Modifier
            </button>
            <span className="text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full uppercase tracking-wider">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        {plan.title ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{plan.title}</p>
        ) : null}

        <div className="flex flex-col items-center justify-center py-6 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent border border-primary/10">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Flame size={28} className="shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider">Calories</span>
          </div>
          <p className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">
            {caloriesTarget}
            <span className="text-lg font-bold text-slate-500 dark:text-slate-400 ml-1.5">kcal</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Objectif journalier</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {macroRows.map((macro) => (
            <div
              key={macro.label}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-4 text-center"
            >
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">{macro.label}</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {macro.value}
                <span className="text-sm font-bold text-slate-500 ml-1">{macro.unit}</span>
              </p>
              <div className="h-1 w-full max-w-[120px] mx-auto mt-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full w-full opacity-90"
                  style={{ backgroundColor: MACRO_COLORS[macro.label] || '#94a3b8' }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div role="presentation" onClick={() => closeEditModal()} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-background-light dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">Modifier mes objectifs</h3>
              <button type="button" onClick={() => closeEditModal()} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Ajuste les objectifs journaliers (calories et macros). Ton coach les voit sur ta fiche.
              </p>
              {editError && <p className="text-sm text-red-500">{editError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Titre (optionnel)</label>
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
                    min={0}
                    value={editForm.calories_target}
                    onChange={(e) => setEditForm((f) => ({ ...f, calories_target: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Protéines (g)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.protein_target}
                    onChange={(e) => setEditForm((f) => ({ ...f, protein_target: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Glucides (g)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.carbs_target}
                    onChange={(e) => setEditForm((f) => ({ ...f, carbs_target: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lipides (g)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.fat_target}
                    onChange={(e) => setEditForm((f) => ({ ...f, fat_target: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary"
                  />
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

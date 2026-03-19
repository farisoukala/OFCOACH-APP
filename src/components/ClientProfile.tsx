import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Target, 
  Camera,
  Plus,
  Dumbbell,
  X,
  Trash2,
  Activity,
  HeartPulse,
  MoreVertical,
  MessageSquare,
  Utensils
} from 'lucide-react';
import { createWorkout, fetchClientById, updateUserProfile, fetchNutritionPlan, createNutritionPlan, addMealToPlan, createNotification, fetchBodyMeasurementSnapshots } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { upsertBodyMeasurementSnapshot } from '../services/api';
import { AreaChart, Area, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface ClientProfileProps {
  onBack: () => void;
  selectedClientId: string | null;
  onNavigateToMessages?: () => void;
}

const defaultAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop';

export const ClientProfile: React.FC<ClientProfileProps> = ({ onBack, selectedClientId, onNavigateToMessages }) => {
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutTitle, setWorkoutTitle] = useState('');
  const [workoutDesc, setWorkoutDesc] = useState('');
  const [exercises, setExercises] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [client, setClient] = useState<{
    id: string; name: string; email?: string; avatar?: string | null; status?: string | null;
    weight_kg?: number | null; height_cm?: number | null; age?: number | null; objectives?: string | null; medical_risks?: string | null;
    taille_cm?: number | null; tour_poitrine_cm?: number | null; tour_ventre_cm?: number | null; tour_hanche_cm?: number | null;
    tour_bras_cm?: number | null; tour_epaule_cm?: number | null; tour_mollet_cm?: number | null;
  } | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [editProfile, setEditProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    weight_kg: '',
    height_cm: '',
    age: '',
    objectives: '',
    medical_risks: '',
    taille_cm: '',
    tour_poitrine_cm: '',
    tour_ventre_cm: '',
    tour_hanche_cm: '',
    tour_bras_cm: '',
    tour_epaule_cm: '',
    tour_mollet_cm: '',
  });
  const [nutritionPlan, setNutritionPlan] = useState<any>(null);
  const [showNutritionModal, setShowNutritionModal] = useState(false);
  const [savingNutrition, setSavingNutrition] = useState(false);
  const [nutritionForm, setNutritionForm] = useState({ title: 'Plan du jour', date: '', calories_target: 2000, protein_target: 150, carbs_target: 250, fat_target: 70 });
  const [nutritionMeals, setNutritionMeals] = useState<{ name: string; calories: string; protein: string; carbs: string; fat: string; time: string }[]>([{ name: '', calories: '', protein: '', carbs: '', fat: '', time: '12:00' }]);
  const [workoutFormError, setWorkoutFormError] = useState<string | null>(null);
  const [nutritionFormError, setNutritionFormError] = useState<string | null>(null);
  const [measurementSnapshots, setMeasurementSnapshots] = useState<any[]>([]);
  const [measurementMetric, setMeasurementMetric] = useState<
    'taille_cm' | 'tour_poitrine_cm' | 'tour_ventre_cm' | 'tour_hanche_cm' | 'tour_bras_cm' | 'tour_epaule_cm' | 'tour_mollet_cm'
  >('tour_ventre_cm');
  const { appUser } = useAuth();
  const todayIso = new Date().toISOString().split('T')[0];
  const [measurementDate, setMeasurementDate] = useState<string>(todayIso);

  useEffect(() => {
    if (!selectedClientId) {
      setClient(null);
      setClientLoading(false);
      return;
    }
    setClientLoading(true);
    fetchClientById(selectedClientId)
      .then((data) => {
        setClient(data);
        setProfileForm({
          weight_kg: data.weight_kg != null ? String(data.weight_kg) : '',
          height_cm: data.height_cm != null ? String(data.height_cm) : '',
          age: data.age != null ? String(data.age) : '',
          objectives: data.objectives ?? '',
          medical_risks: data.medical_risks ?? '',
          taille_cm: data.taille_cm != null ? String(data.taille_cm) : '',
          tour_poitrine_cm: data.tour_poitrine_cm != null ? String(data.tour_poitrine_cm) : '',
          tour_ventre_cm: data.tour_ventre_cm != null ? String(data.tour_ventre_cm) : '',
          tour_hanche_cm: data.tour_hanche_cm != null ? String(data.tour_hanche_cm) : '',
          tour_bras_cm: data.tour_bras_cm != null ? String(data.tour_bras_cm) : '',
          tour_epaule_cm: data.tour_epaule_cm != null ? String(data.tour_epaule_cm) : '',
          tour_mollet_cm: data.tour_mollet_cm != null ? String(data.tour_mollet_cm) : '',
        });
      })
      .catch(() => setClient(null))
      .finally(() => setClientLoading(false));
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) {
      setNutritionPlan(null);
      return;
    }
    fetchNutritionPlan(selectedClientId)
      .then(setNutritionPlan)
      .catch(() => setNutritionPlan(null));
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedClientId || appUser?.role !== 'coach') {
      setMeasurementSnapshots([]);
      return;
    }
    fetchBodyMeasurementSnapshots(selectedClientId)
      .then(setMeasurementSnapshots)
      .catch(() => setMeasurementSnapshots([]));
  }, [selectedClientId, appUser?.role]);

  const handleSaveProfile = async () => {
    if (!selectedClientId || !client) return;
    setSavingProfile(true);
    try {
      await updateUserProfile(selectedClientId, {
        weight_kg: profileForm.weight_kg ? parseFloat(profileForm.weight_kg) : null,
        height_cm: profileForm.height_cm ? parseFloat(profileForm.height_cm) : null,
        age: profileForm.age ? parseInt(profileForm.age, 10) : null,
        objectives: profileForm.objectives || null,
        medical_risks: profileForm.medical_risks || null,
        taille_cm: profileForm.taille_cm ? parseFloat(profileForm.taille_cm) : null,
        tour_poitrine_cm: profileForm.tour_poitrine_cm ? parseFloat(profileForm.tour_poitrine_cm) : null,
        tour_ventre_cm: profileForm.tour_ventre_cm ? parseFloat(profileForm.tour_ventre_cm) : null,
        tour_hanche_cm: profileForm.tour_hanche_cm ? parseFloat(profileForm.tour_hanche_cm) : null,
        tour_bras_cm: profileForm.tour_bras_cm ? parseFloat(profileForm.tour_bras_cm) : null,
        tour_epaule_cm: profileForm.tour_epaule_cm ? parseFloat(profileForm.tour_epaule_cm) : null,
        tour_mollet_cm: profileForm.tour_mollet_cm ? parseFloat(profileForm.tour_mollet_cm) : null,
      });

      // Historiser un relevé CM daté (sert aux courbes "Mensurations" côté Progrès)
      // On utilise la date choisie dans l’écran du coach.
      if (!measurementDate) {
        throw new Error('Date du relevé invalide.');
      }
      await upsertBodyMeasurementSnapshot(selectedClientId, {
        snapshot_date: measurementDate,
        taille_cm: profileForm.taille_cm ? parseFloat(profileForm.taille_cm) : null,
        tour_poitrine_cm: profileForm.tour_poitrine_cm ? parseFloat(profileForm.tour_poitrine_cm) : null,
        tour_ventre_cm: profileForm.tour_ventre_cm ? parseFloat(profileForm.tour_ventre_cm) : null,
        tour_hanche_cm: profileForm.tour_hanche_cm ? parseFloat(profileForm.tour_hanche_cm) : null,
        tour_bras_cm: profileForm.tour_bras_cm ? parseFloat(profileForm.tour_bras_cm) : null,
        tour_epaule_cm: profileForm.tour_epaule_cm ? parseFloat(profileForm.tour_epaule_cm) : null,
        tour_mollet_cm: profileForm.tour_mollet_cm ? parseFloat(profileForm.tour_mollet_cm) : null,
      });

      const fresh = await fetchClientById(selectedClientId);
      setClient(fresh);
      setMeasurementSnapshots(await fetchBodyMeasurementSnapshots(selectedClientId));
      setEditProfile(false);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l’enregistrement du profil');
    } finally {
      setSavingProfile(false);
    }
  };

  const metricLabel: Record<string, string> = {
    taille_cm: 'Taille',
    tour_poitrine_cm: 'Poitrine',
    tour_ventre_cm: 'Ventre',
    tour_hanche_cm: 'Hanches',
    tour_bras_cm: 'Bras',
    tour_epaule_cm: 'Épaule',
    tour_mollet_cm: 'Mollets',
  };
  const measurementSeries = measurementSnapshots
    .filter((s) => s?.[measurementMetric] != null)
    .map((s) => ({
      date: s.snapshot_date
        ? new Date(s.snapshot_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        : '',
      value: Number(s[measurementMetric]),
    }));
  const firstM = measurementSeries.length ? measurementSeries[0].value : null;
  const lastM = measurementSeries.length ? measurementSeries[measurementSeries.length - 1].value : null;
  const deltaM = firstM != null && lastM != null ? Number((lastM - firstM).toFixed(1)) : null;

  const addExercise = () => {
    setExercises([...exercises, { id: Date.now().toString(), name: '', sets: 3, reps: '12', weight: 0, rest_time: '60s' }]);
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const updateExercise = (id: string, field: string, value: any) => {
    setExercises(exercises.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const handleCreateWorkout = async () => {
    setWorkoutFormError(null);
    if (!workoutTitle.trim()) {
      setWorkoutFormError('Veuillez donner un titre à la séance.');
      return;
    }
    if (!appUser || appUser.role !== 'coach') return;
    if (!selectedClientId) return;
    setIsSaving(true);
    try {
      await createWorkout({
        id: crypto.randomUUID(),
        athlete_id: selectedClientId,
        coach_id: appUser.id,
        title: workoutTitle,
        description: workoutDesc,
        date: new Date().toISOString().split('T')[0],
        exercises
      });
      try {
        await createNotification(selectedClientId, {
          type: 'workout',
          title: 'Nouvelle séance',
          body: workoutTitle,
        });
      } catch (_) { /* notification optionnelle */ }
      setShowWorkoutModal(false);
      setWorkoutTitle('');
      setWorkoutDesc('');
      setExercises([]);
      setWorkoutFormError(null);
      alert('Séance créée avec succès !');
    } catch (error: any) {
      console.error('Error creating workout:', error);
      const msg =
        error?.message ||
        error?.error_description ||
        error?.error?.message ||
        'Erreur lors de la création de la séance.';
      setWorkoutFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const addNutritionMeal = () => {
    setNutritionMeals((m) => [...m, { name: '', calories: '', protein: '', carbs: '', fat: '', time: '12:00' }]);
  };
  const removeNutritionMeal = (idx: number) => {
    setNutritionMeals((m) => m.filter((_, i) => i !== idx));
  };
  const updateNutritionMeal = (idx: number, field: string, value: string) => {
    setNutritionMeals((m) => m.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const handleCreateNutritionPlan = async () => {
    setNutritionFormError(null);
    if (!appUser || appUser.role !== 'coach' || !selectedClientId) return;
    const mealsToAdd = nutritionMeals.filter((m) => m.name.trim());
    if (mealsToAdd.length === 0) {
      setNutritionFormError('Ajoutez au moins un repas avec un nom.');
      return;
    }
    setSavingNutrition(true);
    try {
      const toIntOrNull = (v: any) => {
        if (v === null || v === undefined) return null;
        const s = String(v).trim();
        if (!s) return null;
        const n = parseInt(s, 10);
        return Number.isNaN(n) ? null : n;
      };

      const plan = await createNutritionPlan(selectedClientId, appUser.id, {
        title: nutritionForm.title || 'Plan du jour',
        date: nutritionForm.date || new Date().toISOString().split('T')[0],
        calories_target: nutritionForm.calories_target || null,
        protein_target: nutritionForm.protein_target || null,
        carbs_target: nutritionForm.carbs_target || null,
        fat_target: nutritionForm.fat_target || null,
      });
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
      try {
        await createNotification(selectedClientId, {
          type: 'nutrition',
          title: 'Nouveau plan nutritionnel',
          body: nutritionForm.title || 'Plan du jour',
        });
      } catch (_) { /* notification optionnelle */ }
      setNutritionPlan(await fetchNutritionPlan(selectedClientId));
      setShowNutritionModal(false);
      setNutritionFormError(null);
      alert('Plan nutritionnel créé.');
    } catch (e) {
      console.error(e);
      const anyErr = e as any;
      const msg =
        anyErr?.message ||
        anyErr?.error_description ||
        anyErr?.error?.message ||
        'Erreur lors de la création du plan.';
      setNutritionFormError(msg);
    } finally {
      setSavingNutrition(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex flex-col font-display">
      <header className="sticky top-0 z-20 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold tracking-tight">Profil Athlète</h1>
          </div>
          <div className="flex items-center gap-2">
            {appUser?.role === 'coach' && onNavigateToMessages && (
              <button
                onClick={onNavigateToMessages}
                className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
              >
                <MessageSquare size={18} />
                Message
              </button>
            )}
            {appUser?.role === 'coach' && (
              <button
                onClick={() => (editProfile ? handleSaveProfile() : setEditProfile(true))}
                disabled={savingProfile}
                className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-50"
              >
                <Save size={18} />
                {editProfile ? (savingProfile ? 'Enregistrement...' : 'Sauvegarder') : 'Modifier le profil'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-8 pb-24">
        {clientLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          </div>
        ) : !client ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <p className="font-medium">Client non trouvé.</p>
            <button onClick={onBack} className="mt-4 text-primary font-semibold hover:underline">Retour à la liste</button>
          </div>
        ) : (
          <>
        <section className="flex flex-col items-center">
          <div className="relative">
            <div className="size-28 rounded-3xl overflow-hidden ring-4 ring-primary/20">
              <img 
                className="w-full h-full object-cover" 
                src={client.avatar || defaultAvatar} 
                alt={client.name}
                referrerPolicy="no-referrer"
              />
            </div>
            <button className="absolute -bottom-2 -right-2 size-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg border-4 border-background-light dark:border-background-dark">
              <Camera size={18} />
            </button>
          </div>
          <h2 className="mt-4 text-2xl font-bold">{client.name}</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Athlète{client.status ? ` • ${client.status}` : ''}</p>
        </section>

        <section
          id="mensurations-athlete"
          className="rounded-2xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Activity className="text-primary shrink-0" size={22} />
            <div>
              <h3 className="text-base font-bold">Mensurations</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {editProfile
                  ? 'Modifiez les valeurs puis appuyez sur « Sauvegarder » en haut'
                  : 'Cliquez sur « Modifier le profil » pour les éditer'}
              </p>
            </div>
          </div>
          {editProfile ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  Date du relevé
                </label>
                <input
                  type="date"
                  value={measurementDate}
                  onChange={(e) => setMeasurementDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 px-2 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {(
                  [
                    ['taille_cm', 'Taille (cm)'],
                    ['tour_poitrine_cm', 'Poitrine (cm)'],
                    ['tour_ventre_cm', 'Ventre (cm)'],
                    ['tour_hanche_cm', 'Hanches (cm)'],
                    ['tour_bras_cm', 'Bras (cm)'],
                    ['tour_epaule_cm', 'Épaule (cm)'],
                    ['tour_mollet_cm', 'Mollets (cm)'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={profileForm[key]}
                      onChange={(e) => setProfileForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 px-2 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              {[
                { label: 'Taille', value: client.taille_cm, unit: 'cm' },
                { label: 'Poitrine', value: client.tour_poitrine_cm, unit: 'cm' },
                { label: 'Ventre', value: client.tour_ventre_cm, unit: 'cm' },
                { label: 'Hanches', value: client.tour_hanche_cm, unit: 'cm' },
                { label: 'Bras', value: client.tour_bras_cm, unit: 'cm' },
                { label: 'Épaule', value: client.tour_epaule_cm, unit: 'cm' },
                { label: 'Mollets', value: client.tour_mollet_cm, unit: 'cm' },
              ].map((m, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-center"
                >
                  <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 block">
                    {m.label}
                  </span>
                  <p className="text-sm font-bold mt-0.5">
                    {m.value != null && m.value !== '' ? m.value : '—'}
                    <span className="text-[10px] font-normal text-slate-500 ml-0.5">{m.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold">Evolution mensurations</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Courbe historique des releves en cm
              </p>
            </div>
            {deltaM != null && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${deltaM <= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {deltaM <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                {deltaM.toFixed(1)} cm
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mesure</label>
            <select
              value={measurementMetric}
              onChange={(e) => setMeasurementMetric(e.target.value as any)}
              className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary text-sm"
            >
              <option value="tour_ventre_cm">Tour de ventre</option>
              <option value="tour_hanche_cm">Tour de hanches</option>
              <option value="tour_poitrine_cm">Tour de poitrine</option>
              <option value="tour_bras_cm">Tour de bras</option>
              <option value="tour_epaule_cm">Tour d'epaule</option>
              <option value="tour_mollet_cm">Tour de mollets</option>
              <option value="taille_cm">Taille</option>
            </select>
          </div>
          <div className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Dernier releve • {metricLabel[measurementMetric]} :{' '}
              <span className="font-extrabold">{lastM != null ? `${lastM} cm` : '--'}</span>
            </p>
            {measurementSeries.length >= 2 ? (
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={measurementSeries}>
                    <defs>
                      <linearGradient id="clientMeasColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1152D4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1152D4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Area type="monotone" dataKey="value" stroke="#1152D4" strokeWidth={3} fill="url(#clientMeasColor)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pas assez de releves pour tracer une courbe.
              </p>
            )}
          </div>
        </section>

        <section className="grid grid-cols-3 gap-4">
          {editProfile ? (
            <>
              <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Poids (kg)</label>
                <input type="number" step="0.1" value={profileForm.weight_kg} onChange={(e) => setProfileForm(f => ({ ...f, weight_kg: e.target.value }))} className="w-full bg-white dark:bg-slate-700 rounded-lg p-2 text-sm outline-none" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Taille (cm)</label>
                <input type="number" value={profileForm.height_cm} onChange={(e) => setProfileForm(f => ({ ...f, height_cm: e.target.value }))} className="w-full bg-white dark:bg-slate-700 rounded-lg p-2 text-sm outline-none" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Âge</label>
                <input type="number" value={profileForm.age} onChange={(e) => setProfileForm(f => ({ ...f, age: e.target.value }))} className="w-full bg-white dark:bg-slate-700 rounded-lg p-2 text-sm outline-none" />
              </div>
            </>
          ) : (
            [
              { label: 'Poids', value: client.weight_kg != null ? String(client.weight_kg) : '—', unit: 'kg', icon: <TrendingUp size={14} /> },
              { label: 'Taille', value: client.height_cm != null ? String(client.height_cm) : '—', unit: 'cm', icon: <Target size={14} /> },
              { label: 'Âge', value: client.age != null ? String(client.age) : '—', unit: 'ans', icon: <HeartPulse size={14} /> },
            ].map((stat, idx) => (
              <div key={idx} className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400 mb-1">
                  {stat.icon}
                  <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                </div>
                <p className="text-lg font-bold">{stat.value}<span className="text-xs font-normal ml-0.5">{stat.unit}</span></p>
              </div>
            ))
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Dumbbell className="text-primary" size={20} />
              Programmation
            </h3>
            <button 
              onClick={() => { setWorkoutFormError(null); setShowWorkoutModal(true); }}
              className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            >
              <Plus size={16} />
              Nouvelle séance
            </button>
          </div>
          
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Dernière séance assignée :</p>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold">Haut du corps - Élite</h4>
                <p className="text-xs text-slate-500">Assignée le 12 Oct. 2024</p>
              </div>
              <button className="text-primary font-bold text-sm">Détails</button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Utensils className="text-primary" size={20} />
              Nutrition
            </h3>
            {appUser?.role === 'coach' && (
              <button
                onClick={() => {
                  setNutritionForm({ title: 'Plan du jour', date: new Date().toISOString().split('T')[0], calories_target: 2000, protein_target: 150, carbs_target: 250, fat_target: 70 });
                  setNutritionMeals([{ name: '', calories: '', protein: '', carbs: '', fat: '', time: '12:00' }]);
                  setNutritionFormError(null);
                  setShowNutritionModal(true);
                }}
                className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
              >
                <Plus size={16} />
                {nutritionPlan ? 'Nouveau plan' : 'Créer un plan'}
              </button>
            )}
          </div>
          {nutritionPlan ? (
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold">{nutritionPlan.title || 'Plan nutritionnel'}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {nutritionPlan.calories_target ?? '—'} kcal • P: {nutritionPlan.protein_target ?? '—'}g • G: {nutritionPlan.carbs_target ?? '—'}g • L: {nutritionPlan.fat_target ?? '—'}g
              </p>
              <p className="text-xs text-slate-400 mt-2">{nutritionPlan.meals?.length ?? 0} repas</p>
            </div>
          ) : (
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-5 border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400 text-sm">
              Aucun plan nutritionnel assigné.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="text-orange-500" size={20} />
            Risques Médicaux
          </h3>
          {editProfile ? (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
              <textarea
                value={profileForm.medical_risks}
                onChange={(e) => setProfileForm(f => ({ ...f, medical_risks: e.target.value }))}
                placeholder="Risques médicaux, contre-indications..."
                className="w-full bg-white/50 dark:bg-slate-800/50 rounded-xl p-3 text-sm text-orange-800 dark:text-orange-300 placeholder:text-orange-400/60 outline-none resize-none min-h-[80px]"
              />
            </div>
          ) : (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
              <p className="text-sm text-orange-700 dark:text-orange-400 font-medium">
                {client.medical_risks?.trim() || 'Aucun risque médical renseigné.'}
              </p>
            </div>
          )}
        </section>
          </>
        )}
      </main>

      {/* Workout Creation Modal */}
      {showWorkoutModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <div role="presentation" onClick={() => setShowWorkoutModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg bg-background-light dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight">Créer une séance</h3>
                <button onClick={() => setShowWorkoutModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Titre de la séance</label>
                  <input
                    value={workoutTitle}
                    onChange={(e) => { setWorkoutTitle(e.target.value); setWorkoutFormError(null); }}
                    placeholder="Ex: Push Day, Cardio HIIT..."
                    className={`w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-4 outline-none focus:ring-2 focus:ring-primary transition-all ${workoutFormError ? 'ring-1 ring-red-500' : 'border-none'}`}
                  />
                  {workoutFormError && <p className="text-sm text-red-500">{workoutFormError}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description (Optionnel)</label>
                  <textarea 
                    value={workoutDesc}
                    onChange={(e) => setWorkoutDesc(e.target.value)}
                    placeholder="Instructions spécifiques..."
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl p-4 outline-none focus:ring-2 focus:ring-primary transition-all h-24 resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exercices</label>
                    <button 
                      onClick={addExercise}
                      className="text-primary text-xs font-bold flex items-center gap-1"
                    >
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>

                  <div className="space-y-3">
                    {exercises.map((ex) => (
                      <div key={ex.id} className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <input 
                            value={ex.name}
                            onChange={(e) => updateExercise(ex.id, 'name', e.target.value)}
                            placeholder="Nom de l'exercice"
                            className="flex-1 bg-transparent border-none p-0 font-bold outline-none placeholder:text-slate-400"
                          />
                          <button onClick={() => removeExercise(ex.id)} className="text-red-500 p-1">
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Séries</p>
                            <input 
                              type="number"
                              value={ex.sets}
                              onChange={(e) => updateExercise(ex.id, 'sets', parseInt(e.target.value))}
                              className="w-full bg-white dark:bg-slate-700 rounded-lg p-2 text-sm outline-none"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Reps</p>
                            <input 
                              value={ex.reps}
                              onChange={(e) => updateExercise(ex.id, 'reps', e.target.value)}
                              className="w-full bg-white dark:bg-slate-700 rounded-lg p-2 text-sm outline-none"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Poids</p>
                            <input 
                              type="number"
                              value={ex.weight}
                              onChange={(e) => updateExercise(ex.id, 'weight', parseFloat(e.target.value))}
                              className="w-full bg-white dark:bg-slate-700 rounded-lg p-2 text-sm outline-none"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Repos</p>
                            <input 
                              value={ex.rest_time}
                              onChange={(e) => updateExercise(ex.id, 'rest_time', e.target.value)}
                              className="w-full bg-white dark:bg-slate-700 rounded-lg p-2 text-sm outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
                <button 
                  onClick={handleCreateWorkout}
                  disabled={isSaving}
                  className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                >
                  {isSaving ? 'Création...' : 'Assigner la séance'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Nutrition Plan Modal */}
      {showNutritionModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <div role="presentation" onClick={() => !savingNutrition && setShowNutritionModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg bg-background-light dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight">Créer un plan nutritionnel</h3>
                <button onClick={() => !savingNutrition && setShowNutritionModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Titre</label>
                    <input value={nutritionForm.title} onChange={(e) => setNutritionForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ex: Plan du jour" className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                    <input type="date" value={nutritionForm.date} onChange={(e) => setNutritionForm((f) => ({ ...f, date: e.target.value }))} className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Calories (kcal)</label>
                    <input type="number" value={nutritionForm.calories_target} onChange={(e) => setNutritionForm((f) => ({ ...f, calories_target: parseInt(e.target.value, 10) || 0 }))} className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Protéines (g)</label>
                    <input type="number" value={nutritionForm.protein_target} onChange={(e) => setNutritionForm((f) => ({ ...f, protein_target: parseInt(e.target.value, 10) || 0 }))} className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Glucides (g)</label>
                    <input type="number" value={nutritionForm.carbs_target} onChange={(e) => setNutritionForm((f) => ({ ...f, carbs_target: parseInt(e.target.value, 10) || 0 }))} className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lipides (g)</label>
                    <input type="number" value={nutritionForm.fat_target} onChange={(e) => setNutritionForm((f) => ({ ...f, fat_target: parseInt(e.target.value, 10) || 0 }))} className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Repas</label>
                    <button type="button" onClick={addNutritionMeal} className="text-primary text-xs font-bold flex items-center gap-1">
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>
                  {nutritionFormError && <p className="text-sm text-red-500 mb-2">{nutritionFormError}</p>}
                  <div className="space-y-3">
                    {nutritionMeals.map((meal, idx) => (
                      <div key={idx} className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl space-y-2">
                        <div className="flex justify-between gap-2">
                          <input value={meal.name} onChange={(e) => updateNutritionMeal(idx, 'name', e.target.value)} placeholder="Nom du repas" className="flex-1 bg-white dark:bg-slate-700 rounded-lg px-3 py-2 text-sm outline-none" />
                          <input value={meal.time} onChange={(e) => updateNutritionMeal(idx, 'time', e.target.value)} placeholder="Heure" className="w-20 bg-white dark:bg-slate-700 rounded-lg px-2 py-2 text-sm outline-none" />
                          <button type="button" onClick={() => removeNutritionMeal(idx)} className="text-red-500 p-1">
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <input type="number" value={meal.calories} onChange={(e) => updateNutritionMeal(idx, 'calories', e.target.value)} placeholder="kcal" className="bg-white dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none" />
                          <input type="number" value={meal.protein} onChange={(e) => updateNutritionMeal(idx, 'protein', e.target.value)} placeholder="P" className="bg-white dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none" />
                          <input type="number" value={meal.carbs} onChange={(e) => updateNutritionMeal(idx, 'carbs', e.target.value)} placeholder="G" className="bg-white dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none" />
                          <input type="number" value={meal.fat} onChange={(e) => updateNutritionMeal(idx, 'fat', e.target.value)} placeholder="L" className="bg-white dark:bg-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
                <button onClick={handleCreateNutritionPlan} disabled={savingNutrition} className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                  {savingNutrition ? 'Création...' : 'Créer le plan'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

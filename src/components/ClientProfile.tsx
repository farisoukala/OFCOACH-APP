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
  Pencil,
  Activity,
  HeartPulse,
  MoreVertical,
  MessageSquare,
  Utensils,
  Calendar,
} from 'lucide-react';
import {
  createWorkout,
  fetchClientById,
  updateUserProfile,
  fetchNutritionPlan,
  createNutritionPlan,
  updateNutritionPlan,
  deleteNutritionPlan,
  createNotification,
  fetchBodyMeasurementSnapshots,
  fetchWorkoutsByAthlete,
  updateWorkout,
  fetchAthleteAppointments,
  createAthleteAppointment,
  updateAthleteAppointment,
  deleteAthleteAppointment,
} from '../services/api';
import { localTodayIso, nextOccurrenceJsWeekday, sortWorkoutsBySchedule, weekdayLabelFrFromIso } from '../lib/workoutPlanning';
import { useAuth } from '../context/AuthContext';
import { upsertBodyMeasurementSnapshot } from '../services/api';
import { AreaChart, Area, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface ClientProfileProps {
  onBack: () => void;
  selectedClientId: string | null;
  onNavigateToMessages?: () => void;
}

const defaultAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop';

/** Combine date YYYY-MM-DD et heure HH:mm (local) → ISO pour Supabase. */
function combineLocalDateTimeToIso(date: string, time: string): string {
  const t = time && time.length === 5 ? `${time}:00` : time || '00:00:00';
  const d = new Date(`${date}T${t}`);
  if (Number.isNaN(d.getTime())) throw new Error('Date ou heure invalide.');
  return d.toISOString();
}

/** ISO Supabase → champs date / heure locaux pour les inputs. */
function splitIsoToLocalDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: localTodayIso(), time: '10:00' };
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return { date: `${y}-${m}-${day}`, time: `${h}:${min}` };
}

const formatSupabaseError = (err: any, fallback: string) => {
  if (!err) return fallback;
  const parts: string[] = [];
  if (err.code) parts.push(`[${err.code}]`);
  if (err.message) parts.push(err.message);
  if (err.details) parts.push(`details: ${err.details}`);
  if (err.hint) parts.push(`hint: ${err.hint}`);
  if (parts.length > 0) return parts.join(' ');

  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
};

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
  const [workoutFormError, setWorkoutFormError] = useState<string | null>(null);
  const [workoutScheduledDate, setWorkoutScheduledDate] = useState(() => localTodayIso());
  const [clientWorkouts, setClientWorkouts] = useState<any[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [clientAppointments, setClientAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentSaving, setAppointmentSaving] = useState(false);
  const [appointmentFormError, setAppointmentFormError] = useState<string | null>(null);
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    date: localTodayIso(),
    time: '10:00',
    duration_minutes: 60,
    notes: '',
  });
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [nutritionFormError, setNutritionFormError] = useState<string | null>(null);
  const [editingNutritionPlanId, setEditingNutritionPlanId] = useState<string | null>(null);
  const [measurementSnapshots, setMeasurementSnapshots] = useState<any[]>([]);
  const [measurementMetric, setMeasurementMetric] = useState<
    'taille_cm' | 'tour_poitrine_cm' | 'tour_ventre_cm' | 'tour_hanche_cm' | 'tour_bras_cm' | 'tour_epaule_cm' | 'tour_mollet_cm'
  >('tour_ventre_cm');
  const { appUser } = useAuth();
  const todayIso = localTodayIso();
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
    if (!selectedClientId) {
      setClientWorkouts([]);
      return;
    }
    setWorkoutsLoading(true);
    fetchWorkoutsByAthlete(selectedClientId)
      .then((list) => setClientWorkouts(sortWorkoutsBySchedule(list)))
      .catch(() => setClientWorkouts([]))
      .finally(() => setWorkoutsLoading(false));
  }, [selectedClientId]);

  useEffect(() => {
    if (!selectedClientId) {
      setClientAppointments([]);
      return;
    }
    setAppointmentsLoading(true);
    fetchAthleteAppointments(selectedClientId)
      .then(setClientAppointments)
      .catch(() => setClientAppointments([]))
      .finally(() => setAppointmentsLoading(false));
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

  const closeAppointmentModal = () => {
    if (appointmentSaving) return;
    setShowAppointmentModal(false);
    setEditingAppointmentId(null);
    setAppointmentFormError(null);
  };

  const openNewAppointmentModal = () => {
    setAppointmentFormError(null);
    setEditingAppointmentId(null);
    setAppointmentForm({
      title: '',
      date: localTodayIso(),
      time: '10:00',
      duration_minutes: 60,
      notes: '',
    });
    setShowAppointmentModal(true);
  };

  const openEditAppointmentModal = (a: { id: string; title?: string; starts_at?: string; duration_minutes?: number | null; notes?: string | null }) => {
    if (!a.starts_at) return;
    const { date, time } = splitIsoToLocalDateTime(a.starts_at);
    setAppointmentFormError(null);
    setEditingAppointmentId(a.id);
    setAppointmentForm({
      title: a.title ?? '',
      date,
      time,
      duration_minutes: a.duration_minutes ?? 60,
      notes: a.notes ?? '',
    });
    setShowAppointmentModal(true);
  };

  const handleSaveAppointment = async () => {
    setAppointmentFormError(null);
    if (!appointmentForm.title.trim()) {
      setAppointmentFormError('Indique un titre pour le rendez-vous.');
      return;
    }
    if (!appointmentForm.date) {
      setAppointmentFormError('Choisis une date.');
      return;
    }
    if (!appUser || appUser.role !== 'coach' || !selectedClientId) return;
    let startsAt: string;
    try {
      startsAt = combineLocalDateTimeToIso(appointmentForm.date, appointmentForm.time || '10:00');
    } catch {
      setAppointmentFormError('Date ou heure invalide.');
      return;
    }
    const duration = Math.max(15, Number(appointmentForm.duration_minutes) || 60);
    setAppointmentSaving(true);
    try {
      if (editingAppointmentId) {
        await updateAthleteAppointment(editingAppointmentId, {
          title: appointmentForm.title.trim(),
          notes: appointmentForm.notes.trim() || null,
          starts_at: startsAt,
          duration_minutes: duration,
        });
        try {
          await createNotification(selectedClientId, {
            type: 'appointment',
            title: 'Rendez-vous modifié',
            body: `${appointmentForm.title.trim()} — ${new Date(startsAt).toLocaleString('fr-FR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}`,
          });
        } catch {
          /* optionnel */
        }
        alert('Rendez-vous mis à jour. L’athlète verra le changement dans son planning.');
      } else {
        await createAthleteAppointment(selectedClientId, appUser.id, {
          title: appointmentForm.title.trim(),
          notes: appointmentForm.notes.trim() || null,
          starts_at: startsAt,
          duration_minutes: duration,
        });
        try {
          await createNotification(selectedClientId, {
            type: 'appointment',
            title: 'Nouveau rendez-vous',
            body: `${appointmentForm.title.trim()} — ${new Date(startsAt).toLocaleString('fr-FR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}`,
          });
        } catch {
          /* optionnel */
        }
        alert('Rendez-vous enregistré. L’athlète le verra dans son Planning.');
      }
      const list = await fetchAthleteAppointments(selectedClientId);
      setClientAppointments(list);
      setShowAppointmentModal(false);
      setEditingAppointmentId(null);
      setAppointmentForm({
        title: '',
        date: localTodayIso(),
        time: '10:00',
        duration_minutes: 60,
        notes: '',
      });
      setAppointmentFormError(null);
    } catch (e: any) {
      console.error(e);
      setAppointmentFormError(
        formatSupabaseError(
          e,
          editingAppointmentId ? 'Erreur lors de la mise à jour du rendez-vous.' : 'Erreur lors de la création du rendez-vous.'
        )
      );
    } finally {
      setAppointmentSaving(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Supprimer ce rendez-vous ?')) return;
    try {
      await deleteAthleteAppointment(id);
      if (selectedClientId) {
        setClientAppointments(await fetchAthleteAppointments(selectedClientId));
      }
    } catch (e) {
      console.error(e);
      alert('Impossible de supprimer le rendez-vous.');
    }
  };

  const handleRescheduleWorkout = async (workoutId: string, newDate: string) => {
    if (!newDate) return;
    setReschedulingId(workoutId);
    try {
      await updateWorkout(workoutId, { date: newDate });
      if (selectedClientId) {
        const list = await fetchWorkoutsByAthlete(selectedClientId);
        setClientWorkouts(sortWorkoutsBySchedule(list));
      }
    } catch (e) {
      console.error(e);
      alert('Impossible de modifier la date de la séance (droits ou réseau).');
    } finally {
      setReschedulingId(null);
    }
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
        date: workoutScheduledDate || localTodayIso(),
        exercises
      });
      try {
        await createNotification(selectedClientId, {
          type: 'workout',
          title: 'Nouvelle séance',
          body: workoutTitle,
        });
      } catch (_) { /* notification optionnelle */ }
      const list = await fetchWorkoutsByAthlete(selectedClientId);
      setClientWorkouts(sortWorkoutsBySchedule(list));
      setShowWorkoutModal(false);
      setWorkoutTitle('');
      setWorkoutDesc('');
      setExercises([]);
      setWorkoutScheduledDate(localTodayIso());
      setWorkoutFormError(null);
      alert('Séance créée avec succès !');
    } catch (error: any) {
      console.error('Error creating workout:', error);
      const msg = formatSupabaseError(error, 'Erreur lors de la création de la séance.');
      setWorkoutFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const openNewNutritionModal = () => {
    setEditingNutritionPlanId(null);
    setNutritionForm({
      title: 'Plan du jour',
      date: new Date().toISOString().split('T')[0],
      calories_target: 2000,
      protein_target: 150,
      carbs_target: 250,
      fat_target: 70,
    });
    setNutritionFormError(null);
    setShowNutritionModal(true);
  };

  const openEditNutritionModal = () => {
    if (!nutritionPlan) return;
    setEditingNutritionPlanId(nutritionPlan.id);
    const d = nutritionPlan.date ? String(nutritionPlan.date).slice(0, 10) : localTodayIso();
    setNutritionForm({
      title: nutritionPlan.title || 'Plan du jour',
      date: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : localTodayIso(),
      calories_target: nutritionPlan.calories_target ?? 2000,
      protein_target: nutritionPlan.protein_target ?? 150,
      carbs_target: nutritionPlan.carbs_target ?? 250,
      fat_target: nutritionPlan.fat_target ?? 70,
    });
    setNutritionFormError(null);
    setShowNutritionModal(true);
  };

  const closeNutritionModal = () => {
    if (savingNutrition) return;
    setShowNutritionModal(false);
    setEditingNutritionPlanId(null);
    setNutritionFormError(null);
  };

  const handleDeleteNutritionPlan = async () => {
    if (!nutritionPlan?.id || !appUser || appUser.role !== 'coach' || !selectedClientId) return;
    if (!confirm('Supprimer ce plan nutritionnel ?')) return;
    try {
      await deleteNutritionPlan(nutritionPlan.id);
      setNutritionPlan(await fetchNutritionPlan(selectedClientId));
      alert('Plan supprimé.');
    } catch (e: any) {
      console.error(e);
      alert(formatSupabaseError(e, 'Impossible de supprimer le plan.'));
    }
  };

  const handleSaveNutritionPlan = async () => {
    setNutritionFormError(null);
    if (!appUser || appUser.role !== 'coach' || !selectedClientId) return;
    setSavingNutrition(true);
    const isEditMode = !!editingNutritionPlanId;
    try {
      const planPayload = {
        title: nutritionForm.title || 'Plan du jour',
        date: nutritionForm.date || new Date().toISOString().split('T')[0],
        calories_target: nutritionForm.calories_target || null,
        protein_target: nutritionForm.protein_target || null,
        carbs_target: nutritionForm.carbs_target || null,
        fat_target: nutritionForm.fat_target || null,
      };

      if (editingNutritionPlanId) {
        await updateNutritionPlan(editingNutritionPlanId, planPayload);
        try {
          await createNotification(selectedClientId, {
            type: 'nutrition',
            title: 'Plan nutritionnel mis à jour',
            body: planPayload.title,
          });
        } catch (_) {
          /* optionnel */
        }
      } else {
        await createNutritionPlan(selectedClientId, appUser.id, planPayload);
        try {
          await createNotification(selectedClientId, {
            type: 'nutrition',
            title: 'Nouveau plan nutritionnel',
            body: planPayload.title,
          });
        } catch (_) {
          /* optionnel */
        }
      }

      setNutritionPlan(await fetchNutritionPlan(selectedClientId));
      setShowNutritionModal(false);
      setEditingNutritionPlanId(null);
      setNutritionFormError(null);
      alert(isEditMode ? 'Plan nutritionnel mis à jour.' : 'Plan nutritionnel créé.');
    } catch (e: any) {
      console.error(e);
      const msg = formatSupabaseError(
        e,
        isEditMode ? 'Erreur lors de la mise à jour du plan.' : 'Erreur lors de la création du plan.'
      );
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
          {appUser?.role === 'coach' && (
            <button
              type="button"
              onClick={openNewAppointmentModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/15 text-sky-800 dark:text-sky-200 font-bold text-sm border border-sky-500/35 hover:bg-sky-500/25 transition-colors shadow-sm"
            >
              <Calendar size={18} />
              Rendez-vous (jour + heure)
            </button>
          )}
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

        {appUser?.role === 'coach' && (
          <section id="rendez-vous-coach-client" className="space-y-4 scroll-mt-24 rounded-2xl border-2 border-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="text-sky-600 dark:text-sky-400" size={22} />
                Rendez-vous
              </h3>
              <button
                type="button"
                onClick={openNewAppointmentModal}
                className="text-sky-700 dark:text-sky-300 text-sm font-bold flex items-center gap-1 hover:underline shrink-0"
              >
                <Plus size={16} />
                Planifier
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 -mt-1">
              Créneaux visibles par l’athlète dans <strong>Accueil</strong> et <strong>Planning</strong>.
            </p>
            <div className="space-y-3">
              {appointmentsLoading ? (
                <div className="bg-white/60 dark:bg-slate-800/50 rounded-2xl p-8 text-center text-slate-500 text-sm border border-sky-500/20">
                  Chargement des rendez-vous…
                </div>
              ) : clientAppointments.length === 0 ? (
                <div className="bg-white/60 dark:bg-slate-800/50 rounded-2xl p-8 text-center text-slate-500 text-sm border border-dashed border-sky-500/25">
                  Aucun rendez-vous. Utilise « Planifier » pour fixer jour et heure.
                </div>
              ) : (
                clientAppointments.map((a) => {
                  const when = a.starts_at ? new Date(a.starts_at) : null;
                  return (
                    <div
                      key={a.id}
                      className="bg-white/80 dark:bg-slate-800/60 rounded-2xl p-4 border border-sky-500/15 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold">{a.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {when
                            ? when.toLocaleString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                          {a.duration_minutes != null ? ` · ${a.duration_minutes} min` : ''}
                        </p>
                        {a.notes?.trim() ? (
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{a.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-start gap-1">
                        <button
                          type="button"
                          onClick={() => openEditAppointmentModal(a)}
                          className="p-2 rounded-xl text-sky-600 dark:text-sky-400 hover:bg-sky-500/15"
                          title="Modifier"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAppointment(a.id)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-500/10"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Dumbbell className="text-primary" size={20} />
              Programmation
            </h3>
            <button 
              onClick={() => {
                setWorkoutFormError(null);
                setWorkoutScheduledDate(localTodayIso());
                setShowWorkoutModal(true);
              }}
              className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            >
              <Plus size={16} />
              Nouvelle séance
            </button>
          </div>

          <div className="space-y-3">
            {workoutsLoading ? (
              <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-8 text-center text-slate-500 text-sm border border-slate-200 dark:border-slate-800">
                Chargement du planning…
              </div>
            ) : clientWorkouts.length === 0 ? (
              <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-8 text-center text-slate-500 text-sm border border-dashed border-slate-300 dark:border-slate-700">
                Aucune séance planifiée. Ajoute-en une avec la date du jour souhaité.
              </div>
            ) : (
              clientWorkouts.map((w) => (
                <div
                  key={w.id}
                  className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold truncate">{w.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {w.date
                          ? `${weekdayLabelFrFromIso(w.date)} · ${new Date(w.date + 'T12:00:00').toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}`
                          : 'Date non définie'}
                        {w.status === 'completed' ? ' · Terminée' : ''}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                        w.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {w.status === 'completed' ? 'Fait' : 'À faire'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Reporter au</label>
                    <input
                      type="date"
                      value={w.date && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date)) ? String(w.date) : ''}
                      disabled={reschedulingId === w.id}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v) void handleRescheduleWorkout(w.id, v);
                      }}
                      className="bg-white dark:bg-slate-700 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                    />
                    {reschedulingId === w.id && <span className="text-xs text-slate-500">…</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Utensils className="text-primary" size={20} />
              Nutrition
            </h3>
            {appUser?.role === 'coach' && (
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {nutritionPlan && (
                  <>
                    <button
                      type="button"
                      onClick={openEditNutritionModal}
                      className="text-sky-700 dark:text-sky-300 text-sm font-bold flex items-center gap-1 hover:underline"
                    >
                      <Pencil size={14} />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteNutritionPlan()}
                      className="text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-1 hover:underline"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={openNewNutritionModal}
                  className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                >
                  <Plus size={16} />
                  {nutritionPlan ? 'Nouveau plan' : 'Créer un plan'}
                </button>
              </div>
            )}
          </div>
          {nutritionPlan ? (
            <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold">{nutritionPlan.title || 'Plan nutritionnel'}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {nutritionPlan.calories_target ?? '—'} kcal • P: {nutritionPlan.protein_target ?? '—'}g • G: {nutritionPlan.carbs_target ?? '—'}g • L: {nutritionPlan.fat_target ?? '—'}g
              </p>
              {appUser?.role === 'coach' && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">
                  Utilise <strong>Modifier</strong> pour ajuster les objectifs (kcal et macros), ou <strong>Supprimer</strong> pour retirer ce plan.
                </p>
              )}
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

      {/* Rendez-vous athlète (coach) */}
      {showAppointmentModal && appUser?.role === 'coach' && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <div
            role="presentation"
            onClick={() => !appointmentSaving && closeAppointmentModal()}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-lg bg-background-light dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Calendar className="text-primary" size={22} />
                {editingAppointmentId ? 'Modifier le rendez-vous' : 'Planifier un rendez-vous'}
              </h3>
              <button
                type="button"
                onClick={() => !appointmentSaving && closeAppointmentModal()}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {appointmentFormError && <p className="text-sm text-red-500">{appointmentFormError}</p>}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Titre</label>
                <input
                  value={appointmentForm.title}
                  onChange={(e) => setAppointmentForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex : Bilan mensuel, Séance studio, Appel visio…"
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-4 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    value={appointmentForm.date}
                    onChange={(e) => setAppointmentForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Heure</label>
                  <input
                    type="time"
                    value={appointmentForm.time}
                    onChange={(e) => setAppointmentForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Durée (minutes)</label>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={appointmentForm.duration_minutes}
                  onChange={(e) =>
                    setAppointmentForm((f) => ({ ...f, duration_minutes: parseInt(e.target.value, 10) || 60 }))
                  }
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-4 outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notes (optionnel)</label>
                <textarea
                  value={appointmentForm.notes}
                  onChange={(e) => setAppointmentForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Lieu, lien visio, consignes…"
                  className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-4 outline-none focus:ring-2 focus:ring-primary h-24 resize-none"
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => void handleSaveAppointment()}
                disabled={appointmentSaving}
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {appointmentSaving
                  ? 'Enregistrement…'
                  : editingAppointmentId
                    ? 'Enregistrer les modifications'
                    : 'Enregistrer le rendez-vous'}
              </button>
            </div>
          </div>
        </div>
      )}

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

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jour de la séance</label>
                  <input
                    type="date"
                    value={workoutScheduledDate}
                    onChange={(e) => setWorkoutScheduledDate(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl p-4 outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Ou choisir le prochain jour de la semaine :</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Lun', js: 1 },
                      { label: 'Mar', js: 2 },
                      { label: 'Mer', js: 3 },
                      { label: 'Jeu', js: 4 },
                      { label: 'Ven', js: 5 },
                      { label: 'Sam', js: 6 },
                      { label: 'Dim', js: 0 },
                    ].map(({ label, js }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setWorkoutScheduledDate(nextOccurrenceJsWeekday(js))}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-primary/20 hover:text-primary transition-colors"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
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
            <div role="presentation" onClick={() => closeNutritionModal()} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg bg-background-light dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight">
                  {editingNutritionPlanId ? 'Modifier les objectifs nutrition' : 'Définir les objectifs nutrition'}
                </h3>
                <button type="button" onClick={() => closeNutritionModal()} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
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
                {nutritionFormError && <p className="text-sm text-red-500">{nutritionFormError}</p>}
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => void handleSaveNutritionPlan()}
                  disabled={savingNutrition}
                  className="w-full bg-primary text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                >
                  {savingNutrition
                    ? 'Enregistrement...'
                    : editingNutritionPlanId
                      ? 'Enregistrer les modifications'
                      : 'Créer le plan'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

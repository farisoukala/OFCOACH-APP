import { supabase } from '../lib/supabase';
import { prepareAvatarFileForUpload } from '../lib/avatarUpload';
import type { WorkoutSchedulePick } from '../lib/workoutPlanning';
import type { MessageRow, PublicUserRow } from '../types/rows';

const AVATAR_BUCKET = 'avatars';

/**
 * Envoie une image de photothèque vers Supabase Storage (bucket public `avatars`) et retourne l’URL publique.
 * Prérequis SQL : `supabase_migration_storage_avatars.sql` exécuté sur le projet.
 * Seul l’utilisateur connecté peut écrire dans le dossier `{son user id}/`.
 * iPhone : conversion HEIC → JPEG et compression si besoin (`prepareAvatarFileForUpload`).
 */
export async function uploadUserAvatarFile(userId: string, file: File): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id || session.user.id !== userId) {
    throw new Error('Tu dois être connecté pour changer ta photo.');
  }
  const { file: ready } = await prepareAvatarFileForUpload(file);
  const path = `${userId}/avatar.jpg`;
  const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, ready, {
    upsert: true,
    cacheControl: '3600',
    contentType: 'image/jpeg',
  });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error('URL publique indisponible.');
  // Évite l’affichage d’une ancienne image mise en cache après remplacement du fichier
  const sep = pub.publicUrl.includes('?') ? '&' : '?';
  return `${pub.publicUrl}${sep}v=${Date.now()}`;
}

/** Liste des athlètes. Si coachId est fourni, ne retourne que les athlètes liés à ce coach. */
export async function fetchClients(coachId?: string | null): Promise<PublicUserRow[] | null> {
  let q = supabase.from('users').select('*').eq('role', 'athlete');
  if (coachId) {
    q = q.eq('coach_id', coachId);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data as PublicUserRow[] | null;
}

export async function fetchClientById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/** Lie un athlète au coach par email (athlète sans coach). Retourne l'utilisateur mis à jour ou null. */
export async function linkAthleteByEmail(athleteEmail: string, coachId: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ coach_id: coachId })
    .eq('email', athleteEmail.trim().toLowerCase())
    .eq('role', 'athlete')
    .is('coach_id', null)
    .select('id, name, email')
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Mise à jour du profil d’un utilisateur (poids, taille, âge, objectifs, risques médicaux). */
export async function updateUserProfile(
  userId: string,
  profile: {
    name?: string | null;
    avatar?: string | null;
    weight_kg?: number | null;
    height_cm?: number | null;
    age?: number | null;
    objectives?: string | null;
    medical_risks?: string | null;
    taille_cm?: number | null;
    tour_poitrine_cm?: number | null;
    tour_ventre_cm?: number | null;
    tour_hanche_cm?: number | null;
    tour_bras_cm?: number | null;
    tour_epaule_cm?: number | null;
    tour_mollet_cm?: number | null;
  }
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const isSelf =
    session?.user?.id != null && session.user.id === userId;

  // Mise à jour de son propre profil : RPC pour éviter 42P17 (RLS récursif sur UPDATE users)
  if (isSelf) {
    const { error } = await supabase.rpc('patch_my_user_profile', {
      p_data: profile as Record<string, unknown>,
    });
    if (error) throw error;
    return profile as Record<string, unknown>;
  }

  // Coach met à jour un athlète : RPC pour éviter 42P17 (pas de PATCH direct sur users)
  const { error } = await supabase.rpc('patch_athlete_profile_as_coach', {
    p_athlete_id: userId,
    p_data: profile as Record<string, unknown>,
  });
  if (error) throw error;
  return profile as Record<string, unknown>;
}

export async function fetchMessages(): Promise<MessageRow[]> {
  const { data, error } = await supabase.from('messages').select('*');

  if (error) throw error;
  const list = Array.isArray(data) ? data : [];
  list.sort((a, b) => {
    const ta = (a.created_at || a.timestamp || '').toString();
    const tb = (b.created_at || b.timestamp || '').toString();
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
  return list as MessageRow[];
}

/** Envoyer un message. Sans .select() après insert : évite erreurs 409 / PGRST si le RETURNING est filtré par la RLS. */
export async function sendMessage(senderId: string, receiverId: string, content: string) {
  const { error } = await supabase.from('messages').insert([
    {
      id: crypto.randomUUID(),
      sender_id: senderId,
      receiver_id: receiverId,
      content: content.trim(),
      is_read: false,
    },
  ]);
  if (error) throw error;
  return { ok: true as const };
}

/** Récupérer des utilisateurs par liste d'ids (pour noms/avatars des conversations). RLS doit autoriser la lecture des correspondants. */
export async function fetchUsersByIds(ids: string[]): Promise<PublicUserRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('users').select('id, name, avatar, role').in('id', ids);
  if (error) throw error;
  return (data || []) as PublicUserRow[];
}

/** Marquer des messages comme lus (pour le destinataire). Par lots : évite URL trop longue et erreurs PostgREST. */
export async function markMessagesAsRead(messageIds: string[]) {
  const ids = [...new Set(messageIds.filter(Boolean))];
  if (ids.length === 0) return;
  const CHUNK = 60;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const { error } = await supabase.from('messages').update({ is_read: true }).in('id', chunk);
    // Doublon / conflit rare : ignorer le bruit console
    if (error && error.code !== '23505' && !String(error.message || '').includes('409')) {
      console.warn('markMessagesAsRead', error);
    }
  }
}

export async function fetchWorkoutsByAthlete(athleteId: string): Promise<WorkoutSchedulePick[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, exercises(*)')
    .eq('athlete_id', athleteId)
    .order('date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as WorkoutSchedulePick[];
}

export async function updateWorkout(
  workoutId: string,
  updates: {
    status?: string;
    date?: string | null;
    title?: string;
    description?: string | null;
  }
) {
  // Cas principal côté athlète: terminer sa séance.
  // On passe par RPC pour éviter les blocages RLS UPDATE selon les environnements.
  if (updates.status === 'completed') {
    const { error } = await supabase.rpc('mark_workout_completed', {
      p_workout_id: workoutId,
    });
    if (!error) {
      return { id: workoutId, status: 'completed' as const };
    }
    // fallback: on tente la route classique si la RPC n'existe pas encore
    if (error.code !== '42883') throw error; // undefined_function
  }

  const { data, error } = await supabase
    .from('workouts')
    .update(updates)
    .eq('id', workoutId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWorkout(workoutId: string) {
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
  if (error) throw error;
}

export type CreateWorkoutExerciseInput = {
  id?: string;
  name?: string;
  sets?: string | number | null;
  reps?: string | number | null;
  weight?: string | number | null;
  rest_time?: string | number | null;
};

export type CreateWorkoutInput = {
  id: string;
  athlete_id: string;
  coach_id: string;
  title?: string;
  description?: string | null;
  date?: string | null;
  status?: string | null;
  exercises?: CreateWorkoutExerciseInput[];
};

export async function createWorkout(workoutData: CreateWorkoutInput) {
  const { exercises, ...workout } = workoutData;

  const { data: workoutResult, error: workoutError } = await supabase
    .from('workouts')
    .insert([workout])
    .select()
    .single();

  if (workoutError) throw workoutError;

  if (exercises && exercises.length > 0) {
    const exercisesWithWorkoutId = exercises.map((ex) => ({
      // La table exercises.id attend un UUID.
      // On ne réutilise pas l'id UI local (souvent Date.now()).
      id: crypto.randomUUID(),
      name: ex.name ?? '',
      sets: ex.sets ?? null,
      reps: ex.reps ?? null,
      weight: ex.weight ?? null,
      rest_time: ex.rest_time ?? null,
      workout_id: workoutResult.id,
    }));
    const { error: exercisesError } = await supabase
      .from('exercises')
      .insert(exercisesWithWorkoutId);

    if (exercisesError) throw exercisesError;
  }

  return workoutResult;
}

/** Mise à jour d’un exercice (carnet athlète : séries, charge, reps, repos). Nécessite RLS athlète sur exercises (voir supabase_migration_exercises_athlete_update.sql). */
export async function updateExercise(
  exerciseId: string,
  patch: {
    name?: string;
    sets?: number | null;
    reps?: string | null;
    weight?: number | null;
    rest_time?: string | null;
  }
) {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.sets !== undefined) payload.sets = patch.sets;
  if (patch.reps !== undefined) payload.reps = patch.reps;
  if (patch.weight !== undefined) payload.weight = patch.weight;
  if (patch.rest_time !== undefined) payload.rest_time = patch.rest_time;

  const { error } = await supabase.from('exercises').update(payload).eq('id', exerciseId);
  if (error) throw error;
}

/** Supprime un exercice (carnet accueil). Nécessite RLS DELETE athlète (voir supabase_migration_exercises_athlete_update.sql). */
export async function deleteExercise(exerciseId: string) {
  const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
  if (error) throw error;
}

/** Ajoute un exercice à une séance (accueil athlète). Nécessite RLS INSERT athlète (voir supabase_migration_exercises_athlete_update.sql). */
export async function insertExerciseForWorkout(
  workoutId: string,
  row?: {
    name?: string;
    sets?: number | null;
    reps?: string | null;
    weight?: number | null;
    rest_time?: string | null;
  }
) {
  const { error } = await supabase.from('exercises').insert([
    {
      id: crypto.randomUUID(),
      workout_id: workoutId,
      name: (row?.name && String(row.name).trim()) || 'Nouvel exercice',
      sets: row?.sets ?? null,
      reps: row?.reps ?? null,
      weight: row?.weight ?? null,
      rest_time: row?.rest_time ?? null,
    },
  ]);
  if (error) throw error;
}

export type NutritionPlanRow = {
  id: string;
  athlete_id?: string;
  coach_id?: string;
  title?: string | null;
  date?: string | null;
  calories_target?: number | null;
  protein_target?: number | null;
  carbs_target?: number | null;
  fat_target?: number | null;
  created_at?: string | null;
};

export async function fetchNutritionPlan(athleteId: string): Promise<NutritionPlanRow | null> {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .select('*')
    .eq('athlete_id', athleteId);

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  const list = Array.isArray(data) ? data : [];
  if (list.length === 0) return null;
  list.sort((a, b) => {
    const ta = (a.created_at || a.date || '').toString();
    const tb = (b.created_at || b.date || '').toString();
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
  return (list[0] || null) as NutritionPlanRow | null;
}

export interface NutritionPlanInput {
  title: string;
  date?: string | null;
  calories_target?: number | null;
  protein_target?: number | null;
  carbs_target?: number | null;
  fat_target?: number | null;
}

export async function createNutritionPlan(athleteId: string, coachId: string, plan: NutritionPlanInput) {
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from('nutrition_plans')
    .insert([{ id, athlete_id: athleteId, coach_id: coachId, ...plan }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateNutritionPlan(planId: string, plan: Partial<NutritionPlanInput>) {
  const payload: Record<string, unknown> = {};
  if (plan.title !== undefined) payload.title = plan.title;
  if (plan.date !== undefined) payload.date = plan.date;
  if (plan.calories_target !== undefined) payload.calories_target = plan.calories_target;
  if (plan.protein_target !== undefined) payload.protein_target = plan.protein_target;
  if (plan.carbs_target !== undefined) payload.carbs_target = plan.carbs_target;
  if (plan.fat_target !== undefined) payload.fat_target = plan.fat_target;

  const { data, error } = await supabase
    .from('nutrition_plans')
    .update(payload)
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNutritionPlan(planId: string) {
  const { error } = await supabase.from('nutrition_plans').delete().eq('id', planId);
  if (error) throw error;
}

export type ProgressLogRow = {
  id: string;
  athlete_id?: string;
  date?: string | null;
  weight?: number | null;
  body_fat?: number | null;
  notes?: string | null;
  created_at?: string | null;
};

export async function fetchProgressLogs(athleteId: string): Promise<ProgressLogRow[]> {
  const { data, error } = await supabase
    .from('progress_logs')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as ProgressLogRow[];
}

export interface ProgressLogInput {
  date: string;
  weight?: number | null;
  body_fat?: number | null;
  notes?: string | null;
}

export async function createProgressLog(athleteId: string, log: ProgressLogInput) {
  const row = {
    id: crypto.randomUUID(),
    athlete_id: athleteId,
    date: log.date || null,
    weight: log.weight != null ? Number(log.weight) : null,
    body_fat: log.body_fat != null ? Number(log.body_fat) : null,
    notes: log.notes ?? null,
  };
  const { data, error } = await supabase
    .from('progress_logs')
    .insert([row])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProgressLog(logId: string, updates: Partial<ProgressLogInput>) {
  const { data, error } = await supabase
    .from('progress_logs')
    .update(updates)
    .eq('id', logId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProgressLog(logId: string) {
  const { error } = await supabase.from('progress_logs').delete().eq('id', logId);
  if (error) throw error;
}

export type BodyMeasurementSnapshot = {
  id: string;
  athlete_id: string;
  snapshot_date: string; // YYYY-MM-DD
  taille_cm?: number | null;
  tour_poitrine_cm?: number | null;
  tour_ventre_cm?: number | null;
  tour_hanche_cm?: number | null;
  tour_bras_cm?: number | null;
  tour_epaule_cm?: number | null;
  tour_mollet_cm?: number | null;
  created_at?: string;
};

export type BodyMeasurementSnapshotInput = {
  snapshot_date: string; // YYYY-MM-DD
  taille_cm?: number | null;
  tour_poitrine_cm?: number | null;
  tour_ventre_cm?: number | null;
  tour_hanche_cm?: number | null;
  tour_bras_cm?: number | null;
  tour_epaule_cm?: number | null;
  tour_mollet_cm?: number | null;
};

export async function fetchBodyMeasurementSnapshots(athleteId: string) {
  const { data, error } = await supabase
    .from('body_measurement_snapshots')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('snapshot_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as BodyMeasurementSnapshot[];
}

/**
 * Upsert du relevé du jour (ou d’une date) pour construire un historique.
 * Si la table n’existe pas encore en base, on échoue silencieusement (pour éviter de bloquer l’UI).
 */
export async function upsertBodyMeasurementSnapshot(
  athleteId: string,
  input: BodyMeasurementSnapshotInput
) {
  const row = {
    athlete_id: athleteId,
    snapshot_date: input.snapshot_date,
    taille_cm: input.taille_cm ?? null,
    tour_poitrine_cm: input.tour_poitrine_cm ?? null,
    tour_ventre_cm: input.tour_ventre_cm ?? null,
    tour_hanche_cm: input.tour_hanche_cm ?? null,
    tour_bras_cm: input.tour_bras_cm ?? null,
    tour_epaule_cm: input.tour_epaule_cm ?? null,
    tour_mollet_cm: input.tour_mollet_cm ?? null,
  };

  const { error } = await supabase
    .from('body_measurement_snapshots')
    .upsert([row], { onConflict: 'athlete_id,snapshot_date' });

  // Table non créée / schéma pas à jour : on ne bloque pas la sauvegarde des mensurations actuelles.
  if (error && error.code === '42P01') return;
  if (error) throw error;
}

export async function fetchCalendarEvents(userId: string) {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export interface CalendarEventInput {
  title: string;
  date: string;
  time?: string | null;
  duration?: string | null;
  type?: string | null;
  color?: string | null;
}

export async function createCalendarEvent(userId: string, event: CalendarEventInput) {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert([{ id: crypto.randomUUID(), user_id: userId, ...event }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCalendarEvent(eventId: string) {
  const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
  if (error) throw error;
}

export type AthleteAppointmentRow = {
  id: string;
  athlete_id?: string;
  coach_id?: string;
  title?: string;
  starts_at?: string;
  duration_minutes?: number | null;
  notes?: string | null;
};

/** Rendez-vous coach → athlète (table athlete_appointments). */
export async function fetchAthleteAppointments(athleteId: string): Promise<AthleteAppointmentRow[]> {
  const { data, error } = await supabase
    .from('athlete_appointments')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('starts_at', { ascending: true });

  if (error) throw error;
  return (data || []) as AthleteAppointmentRow[];
}

export interface AthleteAppointmentInput {
  title: string;
  notes?: string | null;
  starts_at: string;
  duration_minutes?: number;
}

export async function createAthleteAppointment(
  athleteId: string,
  coachId: string,
  input: AthleteAppointmentInput
) {
  const { data, error } = await supabase
    .from('athlete_appointments')
    .insert([
      {
        id: crypto.randomUUID(),
        athlete_id: athleteId,
        coach_id: coachId,
        title: input.title.trim(),
        notes: input.notes?.trim() || null,
        starts_at: input.starts_at,
        duration_minutes: input.duration_minutes ?? 60,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAthleteAppointment(appointmentId: string) {
  const { error } = await supabase.from('athlete_appointments').delete().eq('id', appointmentId);
  if (error) throw error;
}

export type AthleteAppointmentUpdate = {
  title?: string;
  notes?: string | null;
  starts_at?: string;
  duration_minutes?: number;
};

export async function updateAthleteAppointment(appointmentId: string, updates: AthleteAppointmentUpdate) {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.notes !== undefined) payload.notes = updates.notes?.trim() ? updates.notes.trim() : null;
  if (updates.starts_at !== undefined) payload.starts_at = updates.starts_at;
  if (updates.duration_minutes !== undefined) payload.duration_minutes = updates.duration_minutes;

  const { data, error } = await supabase
    .from('athlete_appointments')
    .update(payload)
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export type NotificationRow = {
  id: string;
  user_id?: string;
  type?: string;
  title?: string | null;
  body?: string | null;
  is_read?: boolean | null;
  created_at?: string | null;
};

export async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as NotificationRow[];
}

/** Compte les notifications non lues (is_read faux ou absent), aligné sur l’écran Notifications. */
export async function countUnreadNotifications(userId: string): Promise<number> {
  const { data, error } = await supabase.from('notifications').select('is_read').eq('user_id', userId);
  if (error) throw error;
  return (data || []).filter((row: { is_read?: boolean | null }) => !row.is_read).length;
}

/** Messages reçus non lus (is_read faux ou absent), comme dans l’écran Messages. */
export async function countUnreadMessagesForUser(userId: string): Promise<number> {
  const { data, error } = await supabase.from('messages').select('is_read').eq('receiver_id', userId);
  if (error) throw error;
  return (data || []).filter((row: { is_read?: boolean | null }) => !row.is_read).length;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
  if (error) throw error;
}

export async function createNotification(userId: string, notif: { type: string; title: string; body?: string | null }) {
  const { data, error } = await supabase
    .from('notifications')
    .insert([{ id: crypto.randomUUID(), user_id: userId, ...notif }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

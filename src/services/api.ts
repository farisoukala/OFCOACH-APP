import { supabase } from '../lib/supabase';

/** Liste des athlètes. Si coachId est fourni, ne retourne que les athlètes liés à ce coach. */
export async function fetchClients(coachId?: string | null) {
  let q = supabase.from('users').select('*').eq('role', 'athlete');
  if (coachId) {
    q = q.eq('coach_id', coachId);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data;
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

export async function fetchMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('*');

  if (error) throw error;
  const list = Array.isArray(data) ? data : [];
  list.sort((a, b) => {
    const ta = (a.created_at || a.timestamp || '').toString();
    const tb = (b.created_at || b.timestamp || '').toString();
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
  return list;
}

/** Envoyer un message. */
export async function sendMessage(senderId: string, receiverId: string, content: string) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ id: crypto.randomUUID(), sender_id: senderId, receiver_id: receiverId, content: content.trim(), is_read: false }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Récupérer des utilisateurs par liste d'ids (pour noms/avatars des conversations). RLS doit autoriser la lecture des correspondants. */
export async function fetchUsersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('users').select('id, name, avatar, role').in('id', ids);
  if (error) throw error;
  return data || [];
}

/** Marquer des messages comme lus (pour le destinataire). */
export async function markMessagesAsRead(messageIds: string[]) {
  if (messageIds.length === 0) return;
  await supabase.from('messages').update({ is_read: true }).in('id', messageIds);
}

export async function fetchWorkoutsByAthlete(athleteId: string) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, exercises(*)')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateWorkout(workoutId: string, updates: { status?: string }) {
  const { data, error } = await supabase
    .from('workouts')
    .update(updates)
    .eq('id', workoutId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createWorkout(workoutData: any) {
  const { exercises, ...workout } = workoutData;

  const { data: workoutResult, error: workoutError } = await supabase
    .from('workouts')
    .insert([workout])
    .select()
    .single();

  if (workoutError) throw workoutError;

  if (exercises && exercises.length > 0) {
    const exercisesWithWorkoutId = exercises.map((ex: any) => ({
      ...ex,
      workout_id: workoutResult.id,
    }));
    const { error: exercisesError } = await supabase
      .from('exercises')
      .insert(exercisesWithWorkoutId);

    if (exercisesError) throw exercisesError;
  }

  return workoutResult;
}

export async function fetchNutritionPlan(athleteId: string) {
  const { data, error } = await supabase
    .from('nutrition_plans')
    .select('*, meals(*)')
    .eq('athlete_id', athleteId);

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  const list = Array.isArray(data) ? data : [];
  if (list.length === 0) return null;
  list.sort((a, b) => {
    const ta = (a.created_at || a.date || '').toString();
    const tb = (b.created_at || b.date || '').toString();
    return new Date(tb).getTime() - new Date(ta).getTime();
  });
  return list[0] || null;
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

export interface MealInput {
  name: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  time?: string | null;
}

export async function addMealToPlan(planId: string, meal: MealInput) {
  const { data, error } = await supabase
    .from('meals')
    .insert([{ id: crypto.randomUUID(), plan_id: planId, ...meal, is_completed: false }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMeal(mealId: string, updates: { is_completed?: boolean; name?: string; calories?: number; protein?: number; carbs?: number; fat?: number; time?: string }) {
  const { data, error } = await supabase
    .from('meals')
    .update(updates)
    .eq('id', mealId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchProgressLogs(athleteId: string) {
  const { data, error } = await supabase
    .from('progress_logs')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
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

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
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

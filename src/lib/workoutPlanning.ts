/** Date locale YYYY-MM-DD (évite le décalage UTC de toISOString). */
export function localTodayIso(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function localDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** getDay() JS : 0 = dimanche … 6 = samedi. Prochaine occurrence (aujourd’hui si c’est ce jour). */
export function nextOccurrenceJsWeekday(targetJsWeekday: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const current = d.getDay();
  const add = (targetJsWeekday - current + 7) % 7;
  d.setDate(d.getDate() + add);
  return localDateIso(d);
}

export function startOfWeekMonday(ref: Date = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDaysLocal(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/** Exercice embarqué dans une séance (liste renvoyée par Supabase). */
export type WorkoutExerciseRow = {
  id?: string;
  name?: string;
  sets?: string | number;
  reps?: string | number;
  weight?: string | number | null;
  rest_time?: string | number | null;
};

/** Ligne minimale pour le tri / mise en avant (champs optionnels selon les requêtes Supabase). */
export type WorkoutSchedulePick = {
  id?: string;
  date?: string | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  created_at?: string | null;
  exercises?: WorkoutExerciseRow[] | null;
};

/** Séance mise en avant : priorité aux non terminées — aujourd’hui, puis prochaine date, puis la plus récente en retard. */
export function pickFeaturedWorkout(workouts: WorkoutSchedulePick[]): WorkoutSchedulePick | null {
  if (!workouts?.length) return null;
  const today = localTodayIso();
  const pending = workouts.filter((w) => w.status !== 'completed');
  const pool = pending.length > 0 ? pending : workouts;

  const withDate = pool.filter((w) => w.date && /^\d{4}-\d{2}-\d{2}$/.test(String(w.date)));
  const noDate = pool.filter((w) => !w.date || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.date)));

  const todayMatch = withDate.find((w) => String(w.date) === today);
  if (todayMatch) return todayMatch;

  const future = withDate
    .filter((w) => String(w.date) >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (future[0]) return future[0];

  const overdue = withDate
    .filter((w) => String(w.date) < today)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (overdue[0]) return overdue[0];

  if (noDate[0]) return noDate[0];
  return pool[0];
}

export function sortWorkoutsBySchedule(workouts: WorkoutSchedulePick[]): WorkoutSchedulePick[] {
  const copy = [...workouts];
  copy.sort((a, b) => {
    const da = a?.date && /^\d{4}-\d{2}-\d{2}$/.test(String(a.date)) ? String(a.date) : '';
    const db = b?.date && /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? String(b.date) : '';
    if (da && db) return da.localeCompare(db);
    if (da && !db) return -1;
    if (!da && db) return 1;
    const ta = (a?.created_at || '').toString();
    const tb = (b?.created_at || '').toString();
    return tb.localeCompare(ta);
  });
  return copy;
}

export function weekdayLabelFrFromIso(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('fr-FR', { weekday: 'long' });
}

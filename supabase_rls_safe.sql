-- ============================================================
-- OfCoach – RLS (version sûre : uniquement sur les tables existantes)
-- Copier-coller tout ce fichier dans Supabase → SQL Editor → Run
-- ============================================================

-- ---------- USERS ----------
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON public.users;
CREATE POLICY "Authenticated can read users"
  ON public.users FOR SELECT TO authenticated USING (true);

-- ---------- WORKOUTS (si la table existe) ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workouts') THEN
    DROP POLICY IF EXISTS "Workouts are viewable by involved parties" ON public.workouts;
    ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Workouts select own or assigned" ON public.workouts;
    CREATE POLICY "Workouts select own or assigned" ON public.workouts FOR SELECT TO authenticated
      USING ((athlete_id::uuid) = auth.uid() OR (coach_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Workouts insert as coach" ON public.workouts;
    CREATE POLICY "Workouts insert as coach" ON public.workouts FOR INSERT TO authenticated
      WITH CHECK ((coach_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Workouts update as coach" ON public.workouts;
    CREATE POLICY "Workouts update as coach" ON public.workouts FOR UPDATE TO authenticated
      USING ((coach_id::uuid) = auth.uid()) WITH CHECK ((coach_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Workouts delete as coach" ON public.workouts;
    CREATE POLICY "Workouts delete as coach" ON public.workouts FOR DELETE TO authenticated
      USING ((coach_id::uuid) = auth.uid());
  END IF;
END $$;

-- ---------- EXERCISES ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exercises') THEN
    ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Exercises select via workout" ON public.exercises;
    CREATE POLICY "Exercises select via workout" ON public.exercises FOR SELECT TO authenticated
      USING (workout_id IN (SELECT id FROM public.workouts WHERE (athlete_id::uuid) = auth.uid() OR (coach_id::uuid) = auth.uid()));
    DROP POLICY IF EXISTS "Exercises insert via workout" ON public.exercises;
    CREATE POLICY "Exercises insert via workout" ON public.exercises FOR INSERT TO authenticated
      WITH CHECK (workout_id IN (SELECT id FROM public.workouts WHERE (coach_id::uuid) = auth.uid()));
    DROP POLICY IF EXISTS "Exercises update via workout" ON public.exercises;
    CREATE POLICY "Exercises update via workout" ON public.exercises FOR UPDATE TO authenticated
      USING (workout_id IN (SELECT id FROM public.workouts WHERE (coach_id::uuid) = auth.uid()))
      WITH CHECK (workout_id IN (SELECT id FROM public.workouts WHERE (coach_id::uuid) = auth.uid()));
    DROP POLICY IF EXISTS "Exercises delete via workout" ON public.exercises;
    CREATE POLICY "Exercises delete via workout" ON public.exercises FOR DELETE TO authenticated
      USING (workout_id IN (SELECT id FROM public.workouts WHERE (coach_id::uuid) = auth.uid()));
  END IF;
END $$;

-- ---------- NUTRITION_PLANS ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'nutrition_plans') THEN
    ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Nutrition plans select" ON public.nutrition_plans;
    CREATE POLICY "Nutrition plans select" ON public.nutrition_plans FOR SELECT TO authenticated
      USING ((athlete_id::uuid) = auth.uid() OR (coach_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Nutrition plans insert as coach" ON public.nutrition_plans;
    CREATE POLICY "Nutrition plans insert as coach" ON public.nutrition_plans FOR INSERT TO authenticated
      WITH CHECK ((coach_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Nutrition plans update as coach" ON public.nutrition_plans;
    CREATE POLICY "Nutrition plans update as coach" ON public.nutrition_plans FOR UPDATE TO authenticated
      USING ((coach_id::uuid) = auth.uid()) WITH CHECK ((coach_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Nutrition plans delete as coach" ON public.nutrition_plans;
    CREATE POLICY "Nutrition plans delete as coach" ON public.nutrition_plans FOR DELETE TO authenticated
      USING ((coach_id::uuid) = auth.uid());
  END IF;
END $$;

-- ---------- MEALS ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meals') THEN
    ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Meals select via plan" ON public.meals;
    CREATE POLICY "Meals select via plan" ON public.meals FOR SELECT TO authenticated
      USING (plan_id IN (SELECT id FROM public.nutrition_plans WHERE (athlete_id::uuid) = auth.uid() OR (coach_id::uuid) = auth.uid()));
    DROP POLICY IF EXISTS "Meals insert via plan" ON public.meals;
    CREATE POLICY "Meals insert via plan" ON public.meals FOR INSERT TO authenticated
      WITH CHECK (plan_id IN (SELECT id FROM public.nutrition_plans WHERE (coach_id::uuid) = auth.uid()));
    DROP POLICY IF EXISTS "Meals update via plan" ON public.meals;
    CREATE POLICY "Meals update via plan" ON public.meals FOR UPDATE TO authenticated
      USING (plan_id IN (SELECT id FROM public.nutrition_plans WHERE (athlete_id::uuid) = auth.uid() OR (coach_id::uuid) = auth.uid()))
      WITH CHECK (plan_id IN (SELECT id FROM public.nutrition_plans WHERE (athlete_id::uuid) = auth.uid() OR (coach_id::uuid) = auth.uid()));
    DROP POLICY IF EXISTS "Meals delete via plan" ON public.meals;
    CREATE POLICY "Meals delete via plan" ON public.meals FOR DELETE TO authenticated
      USING (plan_id IN (SELECT id FROM public.nutrition_plans WHERE (coach_id::uuid) = auth.uid()));
  END IF;
END $$;

-- ---------- PROGRESS_LOGS ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'progress_logs') THEN
    ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Progress logs select own" ON public.progress_logs;
    CREATE POLICY "Progress logs select own" ON public.progress_logs FOR SELECT TO authenticated USING ((athlete_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Progress logs insert own" ON public.progress_logs;
    CREATE POLICY "Progress logs insert own" ON public.progress_logs FOR INSERT TO authenticated WITH CHECK ((athlete_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Progress logs update own" ON public.progress_logs;
    CREATE POLICY "Progress logs update own" ON public.progress_logs FOR UPDATE TO authenticated
      USING ((athlete_id::uuid) = auth.uid()) WITH CHECK ((athlete_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Progress logs delete own" ON public.progress_logs;
    CREATE POLICY "Progress logs delete own" ON public.progress_logs FOR DELETE TO authenticated USING ((athlete_id::uuid) = auth.uid());
  END IF;
END $$;

-- ---------- CALENDAR_EVENTS ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_events') THEN
    ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Calendar events select own" ON public.calendar_events;
    CREATE POLICY "Calendar events select own" ON public.calendar_events FOR SELECT TO authenticated USING ((user_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Calendar events insert own" ON public.calendar_events;
    CREATE POLICY "Calendar events insert own" ON public.calendar_events FOR INSERT TO authenticated WITH CHECK ((user_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Calendar events update own" ON public.calendar_events;
    CREATE POLICY "Calendar events update own" ON public.calendar_events FOR UPDATE TO authenticated
      USING ((user_id::uuid) = auth.uid()) WITH CHECK ((user_id::uuid) = auth.uid());
    DROP POLICY IF EXISTS "Calendar events delete own" ON public.calendar_events;
    CREATE POLICY "Calendar events delete own" ON public.calendar_events FOR DELETE TO authenticated USING ((user_id::uuid) = auth.uid());
  END IF;
END $$;

-- ---------- MESSAGES ----------
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT REFERENCES public.users(id),
  receiver_id TEXT REFERENCES public.users(id),
  content TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Messages select own" ON public.messages;
CREATE POLICY "Messages select own" ON public.messages FOR SELECT TO authenticated
  USING ((sender_id::uuid) = auth.uid() OR (receiver_id::uuid) = auth.uid());
DROP POLICY IF EXISTS "Messages insert as sender" ON public.messages;
CREATE POLICY "Messages insert as sender" ON public.messages FOR INSERT TO authenticated WITH CHECK ((sender_id::uuid) = auth.uid());
DROP POLICY IF EXISTS "Messages update own" ON public.messages;
CREATE POLICY "Messages update own" ON public.messages FOR UPDATE TO authenticated
  USING ((sender_id::uuid) = auth.uid() OR (receiver_id::uuid) = auth.uid())
  WITH CHECK ((sender_id::uuid) = auth.uid() OR (receiver_id::uuid) = auth.uid());

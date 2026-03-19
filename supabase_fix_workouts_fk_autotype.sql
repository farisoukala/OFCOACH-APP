-- ============================================================
-- OfCoach – Fix FK/RLS workouts + exercises (auto type)
-- Gère les environnements où users.id / workouts.id peuvent être uuid ou text.
-- Exécuter dans Supabase -> SQL Editor
-- ============================================================

DO $$
DECLARE
  users_id_type text;
  workouts_id_type text;
  p record;
BEGIN
  SELECT data_type INTO users_id_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='users' AND column_name='id'
  LIMIT 1;

  SELECT data_type INTO workouts_id_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='workouts' AND column_name='id'
  LIMIT 1;

  IF users_id_type IS NULL THEN
    RAISE EXCEPTION 'public.users.id introuvable';
  END IF;
  IF workouts_id_type IS NULL THEN
    RAISE EXCEPTION 'public.workouts.id introuvable';
  END IF;

  -- 1) Drop TOUTES les policies dépendantes (sinon ALTER TYPE peut échouer)
  EXECUTE 'ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY';

  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'workouts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.workouts', p.policyname);
  END LOOP;

  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exercises'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.exercises', p.policyname);
  END LOOP;

  -- 2) Drop FK existantes
  EXECUTE 'ALTER TABLE public.workouts DROP CONSTRAINT IF EXISTS workouts_athlete_id_fkey';
  EXECUTE 'ALTER TABLE public.workouts DROP CONSTRAINT IF EXISTS workouts_coach_id_fkey';
  EXECUTE 'ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_workout_id_fkey';

  -- 3) Aligner workouts.athlete_id/coach_id sur users.id
  IF users_id_type = 'uuid' THEN
    EXECUTE 'ALTER TABLE public.workouts
             ALTER COLUMN athlete_id TYPE uuid USING NULLIF(athlete_id::text, '''')::uuid,
             ALTER COLUMN coach_id TYPE uuid USING NULLIF(coach_id::text, '''')::uuid';
  ELSE
    EXECUTE 'ALTER TABLE public.workouts
             ALTER COLUMN athlete_id TYPE text USING athlete_id::text,
             ALTER COLUMN coach_id TYPE text USING coach_id::text';
  END IF;

  -- 4) Aligner exercises.workout_id sur workouts.id
  IF workouts_id_type = 'uuid' THEN
    EXECUTE 'ALTER TABLE public.exercises
             ALTER COLUMN workout_id TYPE uuid USING NULLIF(workout_id::text, '''')::uuid';
  ELSE
    EXECUTE 'ALTER TABLE public.exercises
             ALTER COLUMN workout_id TYPE text USING workout_id::text';
  END IF;

  -- 5) Recréer FK
  EXECUTE 'ALTER TABLE public.workouts
           ADD CONSTRAINT workouts_athlete_id_fkey
             FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE,
           ADD CONSTRAINT workouts_coach_id_fkey
             FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE CASCADE';

  EXECUTE 'ALTER TABLE public.exercises
           ADD CONSTRAINT exercises_workout_id_fkey
             FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE CASCADE';

  -- 6) Recréer RLS policies selon le type users.id
  IF users_id_type = 'uuid' THEN
    EXECUTE 'CREATE POLICY "Workouts select own or assigned"
             ON public.workouts FOR SELECT TO authenticated
             USING (athlete_id = auth.uid() OR coach_id = auth.uid())';

    EXECUTE 'CREATE POLICY "Workouts insert as coach"
             ON public.workouts FOR INSERT TO authenticated
             WITH CHECK (coach_id = auth.uid())';

    EXECUTE 'CREATE POLICY "Workouts update as coach"
             ON public.workouts FOR UPDATE TO authenticated
             USING (coach_id = auth.uid())
             WITH CHECK (coach_id = auth.uid())';

    EXECUTE 'CREATE POLICY "Workouts delete as coach"
             ON public.workouts FOR DELETE TO authenticated
             USING (coach_id = auth.uid())';

    EXECUTE 'CREATE POLICY "Exercises select via workout"
             ON public.exercises FOR SELECT TO authenticated
             USING (workout_id IN (
               SELECT id FROM public.workouts
               WHERE athlete_id = auth.uid() OR coach_id = auth.uid()
             ))';

    EXECUTE 'CREATE POLICY "Exercises insert via workout"
             ON public.exercises FOR INSERT TO authenticated
             WITH CHECK (workout_id IN (
               SELECT id FROM public.workouts
               WHERE coach_id = auth.uid()
             ))';

    EXECUTE 'CREATE POLICY "Exercises update via workout"
             ON public.exercises FOR UPDATE TO authenticated
             USING (workout_id IN (
               SELECT id FROM public.workouts
               WHERE coach_id = auth.uid()
             ))
             WITH CHECK (workout_id IN (
               SELECT id FROM public.workouts
               WHERE coach_id = auth.uid()
             ))';

    EXECUTE 'CREATE POLICY "Exercises delete via workout"
             ON public.exercises FOR DELETE TO authenticated
             USING (workout_id IN (
               SELECT id FROM public.workouts
               WHERE coach_id = auth.uid()
             ))';
  ELSE
    EXECUTE 'CREATE POLICY "Workouts select own or assigned"
             ON public.workouts FOR SELECT TO authenticated
             USING (athlete_id = auth.uid()::text OR coach_id = auth.uid()::text)';

    EXECUTE 'CREATE POLICY "Workouts insert as coach"
             ON public.workouts FOR INSERT TO authenticated
             WITH CHECK (coach_id = auth.uid()::text)';

    EXECUTE 'CREATE POLICY "Workouts update as coach"
             ON public.workouts FOR UPDATE TO authenticated
             USING (coach_id = auth.uid()::text)
             WITH CHECK (coach_id = auth.uid()::text)';

    EXECUTE 'CREATE POLICY "Workouts delete as coach"
             ON public.workouts FOR DELETE TO authenticated
             USING (coach_id = auth.uid()::text)';

    EXECUTE 'CREATE POLICY "Exercises select via workout"
             ON public.exercises FOR SELECT TO authenticated
             USING (workout_id IN (
               SELECT id FROM public.workouts
               WHERE athlete_id = auth.uid()::text OR coach_id = auth.uid()::text
             ))';

    EXECUTE 'CREATE POLICY "Exercises insert via workout"
             ON public.exercises FOR INSERT TO authenticated
             WITH CHECK (workout_id IN (
               SELECT id FROM public.workouts
               WHERE coach_id = auth.uid()::text
             ))';

    EXECUTE 'CREATE POLICY "Exercises update via workout"
             ON public.exercises FOR UPDATE TO authenticated
             USING (workout_id IN (
               SELECT id FROM public.workouts
               WHERE coach_id = auth.uid()::text
             ))
             WITH CHECK (workout_id IN (
               SELECT id FROM public.workouts
               WHERE coach_id = auth.uid()::text
             ))';

    EXECUTE 'CREATE POLICY "Exercises delete via workout"
             ON public.exercises FOR DELETE TO authenticated
             USING (workout_id IN (
               SELECT id FROM public.workouts
               WHERE coach_id = auth.uid()::text
             ))';
  END IF;
END $$;

-- Vérification FK
SELECT c.conname, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='public'
  AND t.relname IN ('workouts','exercises')
  AND c.contype='f'
ORDER BY t.relname, c.conname;


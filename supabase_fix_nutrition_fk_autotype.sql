-- ============================================================
-- OfCoach – Fix FK nutrition_plans avec détection auto du type users.id
-- Gère les 2 cas:
--  - public.users.id = UUID
--  - public.users.id = TEXT
-- Exécuter dans Supabase -> SQL Editor
-- ============================================================

DO $$
DECLARE
  users_id_type text;
BEGIN
  SELECT c.data_type
  INTO users_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'users'
    AND c.column_name = 'id'
  LIMIT 1;

  IF users_id_type IS NULL THEN
    RAISE EXCEPTION 'Table/colonne introuvable: public.users.id';
  END IF;

  -- 1) Drop policies dépendantes (sinon ALTER TYPE bloque)
  EXECUTE 'ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS "Nutrition plans select" ON public.nutrition_plans';
  EXECUTE 'DROP POLICY IF EXISTS "Nutrition plans insert as coach" ON public.nutrition_plans';
  EXECUTE 'DROP POLICY IF EXISTS "Nutrition plans update as coach" ON public.nutrition_plans';
  EXECUTE 'DROP POLICY IF EXISTS "Nutrition plans delete as coach" ON public.nutrition_plans';

  EXECUTE 'ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS "Meals select via plan" ON public.meals';
  EXECUTE 'DROP POLICY IF EXISTS "Meals insert via plan" ON public.meals';
  EXECUTE 'DROP POLICY IF EXISTS "Meals update via plan" ON public.meals';
  EXECUTE 'DROP POLICY IF EXISTS "Meals delete via plan" ON public.meals';

  -- 2) Drop FK existantes
  EXECUTE 'ALTER TABLE public.nutrition_plans DROP CONSTRAINT IF EXISTS nutrition_plans_athlete_id_fkey';
  EXECUTE 'ALTER TABLE public.nutrition_plans DROP CONSTRAINT IF EXISTS nutrition_plans_coach_id_fkey';

  -- 3) Aligner le type de nutrition_plans.athlete_id / coach_id sur users.id
  IF users_id_type = 'uuid' THEN
    EXECUTE 'ALTER TABLE public.nutrition_plans
               ALTER COLUMN athlete_id TYPE uuid USING NULLIF(athlete_id::text, '''')::uuid,
               ALTER COLUMN coach_id TYPE uuid USING NULLIF(coach_id::text, '''')::uuid';
  ELSE
    EXECUTE 'ALTER TABLE public.nutrition_plans
               ALTER COLUMN athlete_id TYPE text USING athlete_id::text,
               ALTER COLUMN coach_id TYPE text USING coach_id::text';
  END IF;

  -- 4) Recréer FK vers public.users(id)
  EXECUTE 'ALTER TABLE public.nutrition_plans
             ADD CONSTRAINT nutrition_plans_athlete_id_fkey
               FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE,
             ADD CONSTRAINT nutrition_plans_coach_id_fkey
               FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE CASCADE';

  -- 5) Recréer policies selon le type
  IF users_id_type = 'uuid' THEN
    EXECUTE 'CREATE POLICY "Nutrition plans select"
             ON public.nutrition_plans FOR SELECT TO authenticated
             USING (athlete_id = auth.uid() OR coach_id = auth.uid())';

    EXECUTE 'CREATE POLICY "Nutrition plans insert as coach"
             ON public.nutrition_plans FOR INSERT TO authenticated
             WITH CHECK (coach_id = auth.uid())';

    EXECUTE 'CREATE POLICY "Nutrition plans update as coach"
             ON public.nutrition_plans FOR UPDATE TO authenticated
             USING (coach_id = auth.uid())
             WITH CHECK (coach_id = auth.uid())';

    EXECUTE 'CREATE POLICY "Nutrition plans delete as coach"
             ON public.nutrition_plans FOR DELETE TO authenticated
             USING (coach_id = auth.uid())';

    EXECUTE 'CREATE POLICY "Meals select via plan"
             ON public.meals FOR SELECT TO authenticated
             USING (plan_id IN (
               SELECT id FROM public.nutrition_plans
               WHERE athlete_id = auth.uid() OR coach_id = auth.uid()
             ))';

    EXECUTE 'CREATE POLICY "Meals insert via plan"
             ON public.meals FOR INSERT TO authenticated
             WITH CHECK (plan_id IN (
               SELECT id FROM public.nutrition_plans
               WHERE coach_id = auth.uid()
             ))';

    EXECUTE 'CREATE POLICY "Meals update via plan"
             ON public.meals FOR UPDATE TO authenticated
             USING (plan_id IN (
               SELECT id FROM public.nutrition_plans
               WHERE athlete_id = auth.uid() OR coach_id = auth.uid()
             ))
             WITH CHECK (plan_id IN (
               SELECT id FROM public.nutrition_plans
               WHERE athlete_id = auth.uid() OR coach_id = auth.uid()
             ))';

    EXECUTE 'CREATE POLICY "Meals delete via plan"
             ON public.meals FOR DELETE TO authenticated
             USING (plan_id IN (
               SELECT id FROM public.nutrition_plans
               WHERE coach_id = auth.uid()
             ))';
  ELSE
    EXECUTE 'CREATE POLICY "Nutrition plans select"
             ON public.nutrition_plans FOR SELECT TO authenticated
             USING (athlete_id = auth.uid()::text OR coach_id = auth.uid()::text)';

    EXECUTE 'CREATE POLICY "Nutrition plans insert as coach"
             ON public.nutrition_plans FOR INSERT TO authenticated
             WITH CHECK (coach_id = auth.uid()::text)';

    EXECUTE 'CREATE POLICY "Nutrition plans update as coach"
             ON public.nutrition_plans FOR UPDATE TO authenticated
             USING (coach_id = auth.uid()::text)
             WITH CHECK (coach_id = auth.uid()::text)';

    EXECUTE 'CREATE POLICY "Nutrition plans delete as coach"
             ON public.nutrition_plans FOR DELETE TO authenticated
             USING (coach_id = auth.uid()::text)';

    EXECUTE 'CREATE POLICY "Meals select via plan"
             ON public.meals FOR SELECT TO authenticated
             USING (plan_id IN (
               SELECT id FROM public.nutrition_plans
               WHERE athlete_id = auth.uid()::text OR coach_id = auth.uid()::text
             ))';

    EXECUTE 'CREATE POLICY "Meals insert via plan"
             ON public.meals FOR INSERT TO authenticated
             WITH CHECK (plan_id IN (
               SELECT id FROM public.nutrition_plans
               WHERE coach_id = auth.uid()::text
             ))';

    EXECUTE 'CREATE POLICY "Meals update via plan"
             ON public.meals FOR UPDATE TO authenticated
             USING (plan_id IN (
               SELECT id FROM public.nutrition_plans
               WHERE athlete_id = auth.uid()::text OR coach_id = auth.uid()::text
             ))
             WITH CHECK (plan_id IN (
               SELECT id FROM public.nutrition_plans
               WHERE athlete_id = auth.uid()::text OR coach_id = auth.uid()::text
             ))';

    EXECUTE 'CREATE POLICY "Meals delete via plan"
             ON public.meals FOR DELETE TO authenticated
             USING (plan_id IN (
               SELECT id FROM public.nutrition_plans
               WHERE coach_id = auth.uid()::text
             ))';
  END IF;
END $$;

-- Vérification
SELECT
  c.conname,
  pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'nutrition_plans'
  AND c.contype = 'f';


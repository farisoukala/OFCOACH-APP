-- ============================================================
-- OfCoach – Fix FK nutrition_plans : profiles -> public.users
-- Contexte:
-- - L'app utilise public.users.id (TEXT)
-- - En prod, nutrition_plans_athlete_id_fkey pointe vers profiles(id) (UUID)
-- => erreurs FK + mismatch text/uuid
-- Exécuter dans Supabase -> SQL Editor
-- ============================================================

-- 0) Supprimer les policies qui dépendent de athlete_id/coach_id
-- (sinon ALTER COLUMN TYPE échoue)
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Nutrition plans select" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Nutrition plans insert as coach" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Nutrition plans update as coach" ON public.nutrition_plans;
DROP POLICY IF EXISTS "Nutrition plans delete as coach" ON public.nutrition_plans;

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Meals select via plan" ON public.meals;
DROP POLICY IF EXISTS "Meals insert via plan" ON public.meals;
DROP POLICY IF EXISTS "Meals update via plan" ON public.meals;
DROP POLICY IF EXISTS "Meals delete via plan" ON public.meals;

-- 1) Sécuriser les types pour correspondre à public.users.id (TEXT)
ALTER TABLE public.nutrition_plans
  ALTER COLUMN athlete_id TYPE TEXT USING athlete_id::text,
  ALTER COLUMN coach_id TYPE TEXT USING coach_id::text;

-- 2) Supprimer les FK existantes (nom connu + fallback dynamiques)
ALTER TABLE public.nutrition_plans DROP CONSTRAINT IF EXISTS nutrition_plans_athlete_id_fkey;
ALTER TABLE public.nutrition_plans DROP CONSTRAINT IF EXISTS nutrition_plans_coach_id_fkey;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'nutrition_plans'
      AND c.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.nutrition_plans DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- 3) Recréer les FK vers public.users(id)
ALTER TABLE public.nutrition_plans
  ADD CONSTRAINT nutrition_plans_athlete_id_fkey
    FOREIGN KEY (athlete_id) REFERENCES public.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT nutrition_plans_coach_id_fkey
    FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4) Recréer policies RLS (comparaison text vs auth.uid()::text)
CREATE POLICY "Nutrition plans select"
  ON public.nutrition_plans FOR SELECT TO authenticated
  USING (athlete_id = auth.uid()::text OR coach_id = auth.uid()::text);

CREATE POLICY "Nutrition plans insert as coach"
  ON public.nutrition_plans FOR INSERT TO authenticated
  WITH CHECK (coach_id = auth.uid()::text);

CREATE POLICY "Nutrition plans update as coach"
  ON public.nutrition_plans FOR UPDATE TO authenticated
  USING (coach_id = auth.uid()::text)
  WITH CHECK (coach_id = auth.uid()::text);

CREATE POLICY "Nutrition plans delete as coach"
  ON public.nutrition_plans FOR DELETE TO authenticated
  USING (coach_id = auth.uid()::text);

CREATE POLICY "Meals select via plan"
  ON public.meals FOR SELECT TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM public.nutrition_plans
      WHERE athlete_id = auth.uid()::text OR coach_id = auth.uid()::text
    )
  );

CREATE POLICY "Meals insert via plan"
  ON public.meals FOR INSERT TO authenticated
  WITH CHECK (
    plan_id IN (
      SELECT id FROM public.nutrition_plans
      WHERE coach_id = auth.uid()::text
    )
  );

CREATE POLICY "Meals update via plan"
  ON public.meals FOR UPDATE TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM public.nutrition_plans
      WHERE athlete_id = auth.uid()::text OR coach_id = auth.uid()::text
    )
  )
  WITH CHECK (
    plan_id IN (
      SELECT id FROM public.nutrition_plans
      WHERE athlete_id = auth.uid()::text OR coach_id = auth.uid()::text
    )
  );

CREATE POLICY "Meals delete via plan"
  ON public.meals FOR DELETE TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM public.nutrition_plans
      WHERE coach_id = auth.uid()::text
    )
  );

-- 5) Vérification rapide
SELECT conname, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'nutrition_plans'
  AND c.contype = 'f';


-- ============================================================
-- OfCoach – Normaliser le schéma nutrition_plans
-- Objectif: aligner la table avec le frontend actuel
-- Colonnes attendues:
-- id, athlete_id, coach_id, title, date,
-- calories_target, protein_target, carbs_target, fat_target, created_at
-- Exécuter dans Supabase -> SQL Editor
-- ============================================================

ALTER TABLE public.nutrition_plans
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS date TEXT,
  ADD COLUMN IF NOT EXISTS calories_target INTEGER,
  ADD COLUMN IF NOT EXISTS protein_target INTEGER,
  ADD COLUMN IF NOT EXISTS carbs_target INTEGER,
  ADD COLUMN IF NOT EXISTS fat_target INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill "title" depuis d'anciennes colonnes possibles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nutrition_plans' AND column_name='name'
  ) THEN
    UPDATE public.nutrition_plans
    SET title = COALESCE(title, name)
    WHERE title IS NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nutrition_plans' AND column_name='plan_name'
  ) THEN
    UPDATE public.nutrition_plans
    SET title = COALESCE(title, plan_name)
    WHERE title IS NULL;
  END IF;
END $$;

UPDATE public.nutrition_plans
SET title = COALESCE(NULLIF(title, ''), 'Plan du jour')
WHERE title IS NULL OR title = '';

-- Backfill targets depuis anciennes colonnes possibles
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nutrition_plans' AND column_name='calories'
  ) THEN
    UPDATE public.nutrition_plans
    SET calories_target = COALESCE(calories_target, calories)
    WHERE calories_target IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nutrition_plans' AND column_name='protein'
  ) THEN
    UPDATE public.nutrition_plans
    SET protein_target = COALESCE(protein_target, protein)
    WHERE protein_target IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nutrition_plans' AND column_name='carbs'
  ) THEN
    UPDATE public.nutrition_plans
    SET carbs_target = COALESCE(carbs_target, carbs)
    WHERE carbs_target IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nutrition_plans' AND column_name='fats'
  ) THEN
    UPDATE public.nutrition_plans
    SET fat_target = COALESCE(fat_target, fats)
    WHERE fat_target IS NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nutrition_plans' AND column_name='fat'
  ) THEN
    UPDATE public.nutrition_plans
    SET fat_target = COALESCE(fat_target, fat)
    WHERE fat_target IS NULL;
  END IF;
END $$;


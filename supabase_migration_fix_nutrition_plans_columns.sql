-- ============================================================
-- OfCoach – Fix colonnes nutrition (pour éviter erreurs supabase-js)
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

-- nutrition_plans (cible nutrition)
ALTER TABLE public.nutrition_plans
  ADD COLUMN IF NOT EXISTS calories_target INTEGER,
  ADD COLUMN IF NOT EXISTS protein_target INTEGER,
  ADD COLUMN IF NOT EXISTS carbs_target INTEGER,
  ADD COLUMN IF NOT EXISTS fat_target INTEGER;

-- meals (macro par repas)
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS calories INTEGER,
  ADD COLUMN IF NOT EXISTS protein INTEGER,
  ADD COLUMN IF NOT EXISTS carbs INTEGER,
  ADD COLUMN IF NOT EXISTS fat INTEGER;

-- created_at (sécurité)
ALTER TABLE public.nutrition_plans
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();


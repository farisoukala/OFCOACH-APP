-- ============================================================
-- OfCoach – Fix nutrition_plans colonnes attendues (*_target)
-- But: le frontend utilise calories_target/protein_target/carbs_target/fat_target
-- alors que ta table contient parfois calories/protein/carbs/fats.
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

ALTER TABLE public.nutrition_plans
  ADD COLUMN IF NOT EXISTS calories_target INTEGER,
  ADD COLUMN IF NOT EXISTS protein_target INTEGER,
  ADD COLUMN IF NOT EXISTS carbs_target INTEGER,
  ADD COLUMN IF NOT EXISTS fat_target INTEGER;

-- Backfill des valeurs existantes (si les anciennes colonnes sont là)
UPDATE public.nutrition_plans
SET
  calories_target = COALESCE(calories_target, calories),
  protein_target = COALESCE(protein_target, protein),
  carbs_target = COALESCE(carbs_target, carbs)
WHERE
  (calories_target IS NULL AND calories IS NOT NULL)
  OR (protein_target IS NULL AND protein IS NOT NULL)
  OR (carbs_target IS NULL AND carbs IS NOT NULL);

-- fat_target provient de fats (ou fat si jamais la colonne s'appelle autrement)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nutrition_plans' AND column_name='fats'
  ) THEN
    UPDATE public.nutrition_plans
    SET fat_target = COALESCE(fat_target, fats)
    WHERE fat_target IS NULL AND fats IS NOT NULL;
  ELSIF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='nutrition_plans' AND column_name='fat'
  ) THEN
    UPDATE public.nutrition_plans
    SET fat_target = COALESCE(fat_target, fat)
    WHERE fat_target IS NULL AND fat IS NOT NULL;
  END IF;
END $$;


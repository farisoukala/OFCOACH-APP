-- ============================================================
-- OfCoach – Corriger / créer la table exercises (workout_id en UUID)
-- À exécuter si tu as l'erreur "incompatible types: text and uuid"
-- entre exercises.workout_id et workouts.id
-- ============================================================

-- 1) Si exercises existe avec workout_id en TEXT, le convertir en UUID
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'workout_id') THEN
    ALTER TABLE public.exercises
      ALTER COLUMN workout_id TYPE UUID USING workout_id::uuid;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2) Si la table exercises n'existe pas, la créer avec workout_id UUID
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER,
  reps TEXT,
  weight REAL,
  rest_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

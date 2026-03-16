-- ============================================================
-- OfCoach – Ajouter les colonnes manquantes pour éviter les 400
-- Exécuter dans Supabase → SQL Editor (une seule fois)
-- ============================================================

-- Messages : ajouter created_at si absent (certains schémas ont timestamp, d'autres created_at)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Si la table messages n'a pas timestamp mais que l'ancien code l'utilise, ajouter timestamp aussi
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

-- Remplir timestamp à partir de created_at pour les lignes existantes (si timestamp vient d'être créé)
UPDATE public.messages SET timestamp = created_at WHERE timestamp IS NULL AND created_at IS NOT NULL;

-- Nutrition_plans : ajouter date si absent
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS date TEXT;

-- Nutrition_plans : ajouter created_at si absent
ALTER TABLE public.nutrition_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Workouts : created_at si absent
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Progress_logs : created_at si absent
ALTER TABLE public.progress_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Calendar_events : created_at si absent
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

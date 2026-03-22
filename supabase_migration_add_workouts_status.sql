-- ============================================================
-- OfCoach – Ajouter la colonne status à workouts
-- Corrige: [42703] column "status" of relation "workouts" does not exist
-- Exécuter dans Supabase -> SQL Editor
-- ============================================================

ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Harmoniser les anciennes lignes
UPDATE public.workouts
SET status = 'pending'
WHERE status IS NULL OR trim(status) = '';


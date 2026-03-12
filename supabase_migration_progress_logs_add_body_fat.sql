-- ============================================================
-- OfCoach – Ajouter les colonnes manquantes à progress_logs
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

ALTER TABLE public.progress_logs
  ADD COLUMN IF NOT EXISTS body_fat REAL,
  ADD COLUMN IF NOT EXISTS notes TEXT;

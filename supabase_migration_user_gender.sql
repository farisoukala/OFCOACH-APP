-- ============================================================
-- OfCoach – Champ genre (inscription)
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS gender TEXT;

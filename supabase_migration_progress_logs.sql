-- ============================================================
-- OfCoach – Créer la table progress_logs si elle n'existe pas
-- Exécuter dans Supabase → SQL Editor si vous avez l'erreur "relation progress_logs does not exist"
-- ============================================================

CREATE TABLE IF NOT EXISTS public.progress_logs (
  id TEXT PRIMARY KEY,
  athlete_id TEXT REFERENCES public.users(id),
  date TEXT,
  weight REAL,
  body_fat REAL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Progress logs select own" ON public.progress_logs;
CREATE POLICY "Progress logs select own" ON public.progress_logs FOR SELECT TO authenticated
  USING ((athlete_id::uuid) = auth.uid());

DROP POLICY IF EXISTS "Progress logs insert own" ON public.progress_logs;
CREATE POLICY "Progress logs insert own" ON public.progress_logs FOR INSERT TO authenticated
  WITH CHECK ((athlete_id::uuid) = auth.uid());

DROP POLICY IF EXISTS "Progress logs update own" ON public.progress_logs;
CREATE POLICY "Progress logs update own" ON public.progress_logs FOR UPDATE TO authenticated
  USING ((athlete_id::uuid) = auth.uid()) WITH CHECK ((athlete_id::uuid) = auth.uid());

DROP POLICY IF EXISTS "Progress logs delete own" ON public.progress_logs;
CREATE POLICY "Progress logs delete own" ON public.progress_logs FOR DELETE TO authenticated
  USING ((athlete_id::uuid) = auth.uid());

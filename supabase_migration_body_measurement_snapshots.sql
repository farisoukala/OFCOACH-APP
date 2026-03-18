-- ============================================================
-- Historique des mensurations (suivi gain / perte de cm)
-- Une ligne = relevé à une date donnée (ex. chaque pesée mensuelle).
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.body_measurement_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  athlete_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  taille_cm NUMERIC,
  tour_poitrine_cm NUMERIC,
  tour_ventre_cm NUMERIC,
  tour_hanche_cm NUMERIC,
  tour_bras_cm NUMERIC,
  tour_epaule_cm NUMERIC,
  tour_mollet_cm NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (athlete_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_body_meas_athlete_date
  ON public.body_measurement_snapshots (athlete_id, snapshot_date DESC);

ALTER TABLE public.body_measurement_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Body meas select own" ON public.body_measurement_snapshots;
CREATE POLICY "Body meas select own"
  ON public.body_measurement_snapshots FOR SELECT TO authenticated
  USING ((athlete_id::uuid) = auth.uid());

DROP POLICY IF EXISTS "Body meas insert own" ON public.body_measurement_snapshots;
CREATE POLICY "Body meas insert own"
  ON public.body_measurement_snapshots FOR INSERT TO authenticated
  WITH CHECK ((athlete_id::uuid) = auth.uid());

DROP POLICY IF EXISTS "Body meas update own" ON public.body_measurement_snapshots;
CREATE POLICY "Body meas update own"
  ON public.body_measurement_snapshots FOR UPDATE TO authenticated
  USING ((athlete_id::uuid) = auth.uid())
  WITH CHECK ((athlete_id::uuid) = auth.uid());

DROP POLICY IF EXISTS "Body meas delete own" ON public.body_measurement_snapshots;
CREATE POLICY "Body meas delete own"
  ON public.body_measurement_snapshots FOR DELETE TO authenticated
  USING ((athlete_id::uuid) = auth.uid());

-- Le coach pourra lire l’historique via une RPC ou politique dédiée plus tard
-- (éviter sous-requêtes récursives sur users en RLS).

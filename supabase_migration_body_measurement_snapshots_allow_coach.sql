-- ============================================================
-- OfCoach – Autoriser le coach à lire/écrire l’historique CM
-- (pour l’onglet Progrès / courbes en cm)
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

-- Fonction SECURITY DEFINER pour tester si l’utilisateur connecté
-- est bien le coach de l’athlète passé en paramètre.
CREATE OR REPLACE FUNCTION public.is_my_athlete(p_athlete_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_athlete_id
      AND u.role = 'athlete'
      AND u.coach_id IS NOT NULL
      AND u.coach_id::uuid = auth.uid()
    LIMIT 1
  );
$$;

-- On autorise :
-- - l’athlète à gérer ses propres snapshots
-- - le coach à gérer les snapshots des athlètes qu’il coache

DROP POLICY IF EXISTS "Body meas select own" ON public.body_measurement_snapshots;
CREATE POLICY "Body meas select own"
  ON public.body_measurement_snapshots FOR SELECT TO authenticated
  USING (
    (athlete_id::uuid = auth.uid())
    OR public.is_my_athlete(athlete_id)
  );

DROP POLICY IF EXISTS "Body meas insert own" ON public.body_measurement_snapshots;
CREATE POLICY "Body meas insert own"
  ON public.body_measurement_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    (athlete_id::uuid = auth.uid())
    OR public.is_my_athlete(athlete_id)
  );

DROP POLICY IF EXISTS "Body meas update own" ON public.body_measurement_snapshots;
CREATE POLICY "Body meas update own"
  ON public.body_measurement_snapshots FOR UPDATE TO authenticated
  USING (
    (athlete_id::uuid = auth.uid())
    OR public.is_my_athlete(athlete_id)
  )
  WITH CHECK (
    (athlete_id::uuid = auth.uid())
    OR public.is_my_athlete(athlete_id)
  );

DROP POLICY IF EXISTS "Body meas delete own" ON public.body_measurement_snapshots;
CREATE POLICY "Body meas delete own"
  ON public.body_measurement_snapshots FOR DELETE TO authenticated
  USING (
    (athlete_id::uuid = auth.uid())
    OR public.is_my_athlete(athlete_id)
  );


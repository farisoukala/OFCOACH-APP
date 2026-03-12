-- ============================================================
-- OfCoach – Permettre à l'athlète de marquer sa séance comme terminée
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

DROP POLICY IF EXISTS "Workouts update by athlete" ON public.workouts;
CREATE POLICY "Workouts update by athlete"
  ON public.workouts FOR UPDATE TO authenticated
  USING ((athlete_id::uuid) = auth.uid())
  WITH CHECK ((athlete_id::uuid) = auth.uid());

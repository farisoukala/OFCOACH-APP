-- ============================================================
-- OfCoach – Autoriser l'athlète à marquer sa séance terminée
-- Corrige le bouton "Marquer comme terminée" côté athlète.
-- Exécuter dans Supabase -> SQL Editor
-- ============================================================

-- On garde la policy coach pour update, et on ajoute une policy athlète.
-- Pour être robuste aux schémas (uuid/text), on supprime les anciennes versions
-- puis on recrée avec cast TEXT.

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workouts update as coach" ON public.workouts;
CREATE POLICY "Workouts update as coach"
  ON public.workouts FOR UPDATE TO authenticated
  USING (coach_id::text = auth.uid()::text)
  WITH CHECK (coach_id::text = auth.uid()::text);

DROP POLICY IF EXISTS "Workouts update by athlete" ON public.workouts;
DROP POLICY IF EXISTS "Workouts update own as athlete" ON public.workouts;
CREATE POLICY "Workouts update own as athlete"
  ON public.workouts FOR UPDATE TO authenticated
  USING (athlete_id::text = auth.uid()::text)
  WITH CHECK (athlete_id::text = auth.uid()::text);


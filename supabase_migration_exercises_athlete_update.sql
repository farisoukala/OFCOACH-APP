-- ============================================================
-- OfCoach – L’athlète peut modifier / ajouter des exercices (carnet d’entraînement)
-- Exécuter dans Supabase → SQL Editor si la policy actuelle est « coach only ».
-- ============================================================

DROP POLICY IF EXISTS "Exercises insert via workout" ON public.exercises;
CREATE POLICY "Exercises insert via workout"
  ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (
    workout_id IN (
      SELECT id FROM public.workouts
      WHERE (coach_id::uuid) = auth.uid() OR (athlete_id::uuid) = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Exercises update via workout" ON public.exercises;
CREATE POLICY "Exercises update via workout"
  ON public.exercises FOR UPDATE TO authenticated
  USING (
    workout_id IN (
      SELECT id FROM public.workouts
      WHERE (athlete_id::uuid) = auth.uid() OR (coach_id::uuid) = auth.uid()
    )
  )
  WITH CHECK (
    workout_id IN (
      SELECT id FROM public.workouts
      WHERE (athlete_id::uuid) = auth.uid() OR (coach_id::uuid) = auth.uid()
    )
  );

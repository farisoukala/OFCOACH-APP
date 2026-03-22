-- OfCoach – Permettre à l’athlète de modifier son plan nutritionnel (objectifs)
-- À exécuter dans Supabase → SQL Editor (une fois)
-- Note : la table meals n’existe plus ; voir supabase_migration_drop_meals.sql sur les bases anciennes.

DROP POLICY IF EXISTS "Nutrition plans update as athlete" ON public.nutrition_plans;
CREATE POLICY "Nutrition plans update as athlete"
  ON public.nutrition_plans FOR UPDATE TO authenticated
  USING ((athlete_id::uuid) = auth.uid())
  WITH CHECK ((athlete_id::uuid) = auth.uid());

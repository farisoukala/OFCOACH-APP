-- OfCoach – Permettre à l’athlète de modifier son plan nutritionnel et ses repas
-- À exécuter dans Supabase → SQL Editor (une fois)

-- Mise à jour du plan (objectifs, titre, date) par l’athlète concerné
DROP POLICY IF EXISTS "Nutrition plans update as athlete" ON public.nutrition_plans;
CREATE POLICY "Nutrition plans update as athlete"
  ON public.nutrition_plans FOR UPDATE TO authenticated
  USING ((athlete_id::uuid) = auth.uid())
  WITH CHECK ((athlete_id::uuid) = auth.uid());

-- Ajouter un repas sur son propre plan
DROP POLICY IF EXISTS "Meals insert as athlete own plan" ON public.meals;
CREATE POLICY "Meals insert as athlete own plan"
  ON public.meals FOR INSERT TO authenticated
  WITH CHECK (
    plan_id IN (
      SELECT id FROM public.nutrition_plans WHERE (athlete_id::uuid) = auth.uid()
    )
  );

-- Supprimer un repas de son propre plan (réorganisation / édition)
DROP POLICY IF EXISTS "Meals delete as athlete own plan" ON public.meals;
CREATE POLICY "Meals delete as athlete own plan"
  ON public.meals FOR DELETE TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM public.nutrition_plans WHERE (athlete_id::uuid) = auth.uid()
    )
  );

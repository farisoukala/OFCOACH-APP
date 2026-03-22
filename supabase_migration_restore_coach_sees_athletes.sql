-- ============================================================
-- OfCoach – Rétablir la visibilité des athlètes pour le coach (liste clients)
-- À exécuter dans Supabase → SQL Editor si la liste des clients est vide
-- alors que les athlètes ont bien coach_id renseigné.
--
-- Recrée la policy "Users read self or athletes of coach" (fichier coach_and_profile).
-- Sans elle, seule la policy "conversation partners" peut s’appliquer et le coach
-- ne voit pas ses athlètes tant qu’il n’y a pas de messages.
-- ============================================================

DROP POLICY IF EXISTS "Users read self or athletes of coach" ON public.users;
CREATE POLICY "Users read self or athletes of coach"
  ON public.users FOR SELECT TO authenticated
  USING (
    (id::uuid) = auth.uid()
    OR (
      role = 'athlete'
      AND coach_id IS NOT NULL
      AND (coach_id::uuid) = auth.uid()
    )
  );

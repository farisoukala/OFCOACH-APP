-- ============================================================
-- OfCoach – Permettre au coach de lier un athlète depuis l'app (par email)
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

-- Un coach peut mettre à jour coach_id sur un athlète qui n'a pas encore de coach (coach_id IS NULL)
DROP POLICY IF EXISTS "Coach can link unlinked athlete" ON public.users;
CREATE POLICY "Coach can link unlinked athlete"
  ON public.users FOR UPDATE TO authenticated
  USING (
    role = 'athlete'
    AND coach_id IS NULL
    AND EXISTS (SELECT 1 FROM public.users WHERE (id::uuid) = auth.uid() AND role = 'coach')
  )
  WITH CHECK (role = 'athlete' AND (coach_id::uuid) = auth.uid());

-- ============================================================
-- OfCoach – Permettre à un athlète de lire le profil de son coach
-- (nécessaire pour afficher "Mon coach" dans Messages et envoyer un message au coach)
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

DROP POLICY IF EXISTS "Users read own coach (athletes)" ON public.users;
CREATE POLICY "Users read own coach (athletes)"
  ON public.users FOR SELECT TO authenticated
  USING (
    (id::uuid) IN (
      SELECT (u.coach_id::uuid) FROM public.users u
      WHERE (u.id::uuid) = auth.uid() AND u.role = 'athlete' AND u.coach_id IS NOT NULL
    )
  );

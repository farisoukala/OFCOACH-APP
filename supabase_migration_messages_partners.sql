-- ============================================================
-- OfCoach – Lire les profils utiles à la messagerie (nom / avatar)
-- À exécuter dans Supabase → SQL Editor (une fois, ou à ré-exécuter après mise à jour)
-- ============================================================
--
-- Inclut :
-- - soi-même
-- - interlocuteurs déjà présents dans public.messages
-- - l’athlète peut lire la ligne de SON COACH (coach_id) même avant le 1er message
--
-- IMPORTANT : on n’utilise PAS "EXISTS (SELECT … FROM public.users)" dans la policy,
-- car cela provoque souvent une récursion RLS sur la table users et fait disparaître
-- la liste des clients côté coach. On passe par une fonction SECURITY DEFINER.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ofcoach_my_coach_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.coach_id
  FROM public.users u
  WHERE u.id::uuid = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.ofcoach_my_coach_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ofcoach_my_coach_id() TO authenticated;

DROP POLICY IF EXISTS "Users read conversation partners" ON public.users;
CREATE POLICY "Users read conversation partners"
  ON public.users FOR SELECT TO authenticated
  USING (
    (id::uuid) = auth.uid()
    OR (id IN (SELECT (sender_id::text) FROM public.messages WHERE (receiver_id::uuid) = auth.uid()))
    OR (id IN (SELECT (receiver_id::text) FROM public.messages WHERE (sender_id::uuid) = auth.uid()))
    OR (
      public.ofcoach_my_coach_id() IS NOT NULL
      AND users.id = public.ofcoach_my_coach_id()
    )
  );

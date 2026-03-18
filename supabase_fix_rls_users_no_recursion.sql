-- ============================================================
-- OfCoach – Supprimer la récursion 42P17 sur la table users
-- À exécuter dans Supabase → SQL Editor (une fois)
-- Corrige : "infinite recursion detected in policy for relation users"
-- (sauvegarde profil, mensurations, upsert, etc.)
-- ============================================================

-- 1) Fonction : l'utilisateur connecté est-il coach ?
CREATE OR REPLACE FUNCTION public.is_current_user_coach()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE (id::uuid) = auth.uid() AND role = 'coach'
  );
$$;

-- 2) Fonction : renvoyer le coach_id de l'athlète connecté
CREATE OR REPLACE FUNCTION public.get_my_coach_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (coach_id::uuid) FROM public.users
  WHERE (id::uuid) = auth.uid() AND role = 'athlete' AND coach_id IS NOT NULL
  LIMIT 1;
$$;

-- 3) Remplacer les politiques SELECT qui peuvent provoquer une récursion

DROP POLICY IF EXISTS "Users read own coach (athletes)" ON public.users;
CREATE POLICY "Users read own coach (athletes)"
  ON public.users FOR SELECT TO authenticated
  USING ((id::uuid) = public.get_my_coach_id());

DROP POLICY IF EXISTS "Users read self or athletes of coach" ON public.users;
CREATE POLICY "Users read self or athletes of coach"
  ON public.users FOR SELECT TO authenticated
  USING (
    (id::uuid) = auth.uid()
    OR (
      role = 'athlete'
      AND public.is_current_user_coach()
      AND (coach_id::uuid) = auth.uid()
    )
  );

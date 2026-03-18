-- ============================================================
-- Corriger définitivement l'erreur 42P17 sur POST users?on_conflict=id
-- (récursion dans une politique RLS sur public.users)
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

-- 1) S'assurer que la fonction existe (évite récursion dans la politique "read own coach")
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

-- 2) Supprimer l'ancienne politique récursive et recréer la bonne
DROP POLICY IF EXISTS "Users read own coach (athletes)" ON public.users;
CREATE POLICY "Users read own coach (athletes)"
  ON public.users FOR SELECT TO authenticated
  USING ((id::uuid) = public.get_my_coach_id());

-- 3) Vérifier que la politique INSERT ne lit pas la table users (elle ne doit pas)
--    "Users can insert own row" : WITH CHECK ((id)::uuid = auth.uid()) → OK, pas de lecture

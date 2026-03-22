-- ============================================================
-- OfCoach – RPC : garantir une ligne public.users pour le compte connecté
-- À exécuter dans Supabase → SQL Editor (une fois)
--
-- Contourne la RLS : l’app appelle cette fonction au lieu d’un INSERT client
-- quand « profil non synchronisé » / ensureCurrentUserInDb échoue encore.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_current_user_in_users()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_role text;
  v_avatar text;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = uid::text) THEN
    RETURN true;
  END IF;

  SELECT
    au.email,
    COALESCE(
      au.raw_user_meta_data->>'name',
      au.raw_user_meta_data->>'full_name',
      split_part(COALESCE(au.email, ''), '@', 1),
      'Utilisateur'
    ),
    COALESCE(au.raw_user_meta_data->>'role', 'athlete'),
    au.raw_user_meta_data->>'avatar'
  INTO v_email, v_name, v_role, v_avatar
  FROM auth.users au
  WHERE au.id = uid;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_email := trim(COALESCE(v_email, ''));
  IF v_email = '' THEN
    v_email := uid::text || '@auth.local';
  END IF;

  BEGIN
    INSERT INTO public.users (id, name, email, role, avatar, status)
    VALUES (uid::text, v_name, v_email, v_role, v_avatar, NULL);
  EXCEPTION
    WHEN unique_violation THEN
      INSERT INTO public.users (id, name, email, role, avatar, status)
      VALUES (uid::text, v_name, uid::text || '@auth.local', v_role, v_avatar, NULL)
      ON CONFLICT (id) DO NOTHING;
  END;

  RETURN EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = uid::text);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_current_user_in_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_current_user_in_users() TO authenticated;

COMMENT ON FUNCTION public.ensure_current_user_in_users() IS 'OfCoach: crée public.users pour auth.uid() si absent (messagerie, FK).';

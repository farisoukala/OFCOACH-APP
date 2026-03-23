-- ============================================================
-- OfCoach – RPC : garantir que le destinataire existe dans public.users
-- (clé étrangère messages.receiver_id → users.id)
-- À exécuter dans Supabase → SQL Editor après ensure_current_user_in_users
-- ============================================================
--
-- Autorisé seulement si le partenaire est « légitime » :
-- - c’est ton coach (athlète avec coach_id = partenaire)
-- - c’est un de tes athlètes (coach avec coach_id pointant vers toi)
-- - ou un échange de messages existe déjà
-- Puis insertion depuis auth.users (SECURITY DEFINER).
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_messaging_partner_in_users(p_partner_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  v_email text;
  v_name text;
  v_role text;
  v_avatar text;
BEGIN
  IF me IS NULL OR p_partner_id IS NULL OR trim(p_partner_id) = '' THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = p_partner_id) THEN
    RETURN true;
  END IF;

  IF p_partner_id = me::text THEN
    RETURN public.ensure_current_user_in_users();
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id::uuid = me
        AND u.role = 'athlete'
        AND u.coach_id IS NOT NULL
        AND u.coach_id = p_partner_id
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id::uuid = me
        AND u.role = 'coach'
        AND EXISTS (
          SELECT 1 FROM public.users a
          WHERE a.id = p_partner_id
            AND a.role = 'athlete'
            AND a.coach_id = u.id
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (
        m.sender_id::uuid = me AND m.receiver_id = p_partner_id
      ) OR (
        m.receiver_id::uuid = me AND m.sender_id = p_partner_id
      )
    )
  ) THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id::text = p_partner_id) THEN
    RETURN false;
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
  WHERE au.id::text = p_partner_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_email := trim(COALESCE(v_email, ''));
  IF v_email = '' THEN
    v_email := p_partner_id || '@auth.local';
  END IF;

  BEGIN
    INSERT INTO public.users (id, name, email, role, avatar, status)
    VALUES (p_partner_id, v_name, v_email, v_role, v_avatar, NULL);
  EXCEPTION
    WHEN unique_violation THEN
      INSERT INTO public.users (id, name, email, role, avatar, status)
      VALUES (p_partner_id, v_name, p_partner_id || '@auth.local', v_role, v_avatar, NULL)
      ON CONFLICT (id) DO NOTHING;
  END;

  RETURN EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = p_partner_id);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_messaging_partner_in_users(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_messaging_partner_in_users(text) TO authenticated;

COMMENT ON FUNCTION public.ensure_messaging_partner_in_users(text) IS 'OfCoach: crée public.users pour le destinataire si coach/athlète ou déjà en conversation.';

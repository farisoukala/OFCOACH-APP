-- ============================================================
-- OfCoach – Synchroniser auth.users vers public.users
-- À exécuter dans Supabase → SQL Editor (une fois)
-- Corrige l'erreur "messages_sender_id_fkey" : chaque utilisateur
-- Auth doit avoir une ligne dans public.users pour pouvoir envoyer des messages.
-- ============================================================

-- 0) Donner le droit d'insertion sur public.users au rôle authenticated (obligatoire pour que l'app puisse créer la ligne)
GRANT INSERT ON public.users TO authenticated;
GRANT SELECT ON public.users TO authenticated;

-- 1) Insérer dans public.users tous les utilisateurs Auth qui n'y sont pas encore
--    (email rendu unique : si déjà pris par un autre user, on met id@auth.local)
INSERT INTO public.users (id, name, email, role, avatar, status)
SELECT
  au.id::text,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', split_part(COALESCE(au.email, ''), '@', 1), 'Utilisateur'),
  CASE
    WHEN trim(COALESCE(au.email, '')) = '' THEN au.id::text || '@auth.local'
    WHEN EXISTS (SELECT 1 FROM public.users u WHERE u.email = trim(au.email) AND u.id <> au.id::text) THEN au.id::text || '@auth.local'
    ELSE trim(au.email)
  END,
  COALESCE(au.raw_user_meta_data->>'role', 'athlete'),
  au.raw_user_meta_data->>'avatar',
  NULL
FROM auth.users au
WHERE au.id::text NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- 2) Permettre à un utilisateur connecté de s'ajouter dans public.users s'il n'existe pas encore
DROP POLICY IF EXISTS "Users can insert own row" ON public.users;
CREATE POLICY "Users can insert own row"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK ((id)::uuid = auth.uid());

-- 3) Trigger : à chaque nouvel utilisateur Auth, créer automatiquement la ligne dans public.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, avatar, status)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email, ''), '@', 1), 'Utilisateur'),
    COALESCE(NULLIF(trim(NEW.email), ''), NEW.id::text || '@auth.local'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'athlete'),
    NEW.raw_user_meta_data->>'avatar',
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_sync_public_users ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_public_users
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

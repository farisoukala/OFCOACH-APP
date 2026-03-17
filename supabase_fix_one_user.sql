-- ============================================================
-- SECOURS : ajouter UN utilisateur Auth manquant dans public.users
-- 1) Va dans Supabase → Authentication → Users
-- 2) Clique sur l'utilisateur concerné et copie son UUID (colonne "User UID")
-- 3) Remplace YOUR_AUTH_USER_ID_ICI par cet UUID (garder les guillemets)
-- 4) Exécute ce script dans SQL Editor
-- ============================================================
INSERT INTO public.users (id, name, email, role, avatar, status)
SELECT
  au.id::text,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', split_part(COALESCE(au.email, ''), '@', 1), 'Utilisateur'),
  COALESCE(NULLIF(trim(au.email), ''), au.id::text || '@auth.local'),
  COALESCE(au.raw_user_meta_data->>'role', 'athlete'),
  au.raw_user_meta_data->>'avatar',
  NULL
FROM auth.users au
WHERE au.id = 'YOUR_AUTH_USER_ID_ICI'::uuid
  AND au.id::text NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

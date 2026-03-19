-- ============================================================
-- OfCoach – Fix FK nutrition_plans_athlete_id_fkey
-- Cause: certains utilisateurs existent dans auth.users
-- mais pas dans public.users.
-- Exécuter dans Supabase -> SQL Editor
-- ============================================================

-- 1) Diagnostic: utilisateurs auth sans ligne public.users
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'name' AS name,
  au.raw_user_meta_data->>'role' AS role
FROM auth.users au
LEFT JOIN public.users pu
  ON pu.id = au.id::text
WHERE pu.id IS NULL;

-- 2) Sync: créer les lignes manquantes dans public.users
INSERT INTO public.users (id, name, email, role, avatar, status)
SELECT
  au.id::text AS id,
  COALESCE(NULLIF(trim(au.raw_user_meta_data->>'name'), ''), split_part(COALESCE(au.email, ''), '@', 1), 'Utilisateur') AS name,
  COALESCE(NULLIF(trim(au.email), ''), au.id::text || '@auth.local') AS email,
  COALESCE(NULLIF(trim(au.raw_user_meta_data->>'role'), ''), 'athlete') AS role,
  NULL::text AS avatar,
  'Nouveau'::text AS status
FROM auth.users au
LEFT JOIN public.users pu
  ON pu.id = au.id::text
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3) Vérification finale
SELECT COUNT(*) AS remaining_missing
FROM auth.users au
LEFT JOIN public.users pu
  ON pu.id = au.id::text
WHERE pu.id IS NULL;


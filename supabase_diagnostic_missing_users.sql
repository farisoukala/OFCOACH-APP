-- ============================================================
-- DIAGNOSTIC : utilisateurs dans auth.users qui n'ont PAS de ligne dans public.users
-- Exécuter dans Supabase → SQL Editor pour voir qui manque (cause de messages_sender_id_fkey).
-- ============================================================
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'name' AS name,
  au.raw_user_meta_data->>'role' AS role
FROM auth.users au
WHERE au.id::text NOT IN (SELECT id FROM public.users);

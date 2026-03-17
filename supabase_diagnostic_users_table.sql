-- ============================================================
-- DIAGNOSTIC : structure et triggers sur public.users (pour erreur 500 / 42P17)
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

-- Colonnes de la table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Triggers sur public.users (peuvent causer 42P17 si récursion)
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'users';

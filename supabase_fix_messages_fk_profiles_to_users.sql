-- ============================================================
-- OfCoach – Fix FK messages : profiles → public.users
--
-- Symptôme côté app (console) :
--   "insert or update on table messages violates foreign key constraint messages_sender_id_fkey"
--   details: "Key is not present in table \"profiles\"."
--
-- Cause : ancien schéma Supabase où messages.sender_id / receiver_id
--         pointent vers public.profiles(id) au lieu de public.users(id).
-- L’app OfCoach utilise uniquement public.users (id TEXT = auth user id).
--
-- À exécuter UNE FOIS dans Supabase → SQL Editor (PRODUCTION).
-- Ensuite : s’assurer que sync + RPC ensure_current_user sont en place.
--
-- Si erreur "cannot alter type ... policy ... depends on column sender_id" :
-- ce script retire d’abord les policies qui lisent messages.sender_id, puis les recrée.
-- ============================================================

-- 0) Policies : à retirer avant ALTER COLUMN sur messages
--    (sinon : ERROR cannot alter type of a column used in a policy definition)
--    Les templates Supabase utilisent des noms variables, ex. « Users can view their messages »,
--    pas seulement « Messages select own » → on supprime TOUTES les policies sur public.messages.

DROP POLICY IF EXISTS "Users read conversation partners" ON public.users;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT pol.polname
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', r.polname);
  END LOOP;
END $$;

-- 1) Supprimer toutes les FK existantes sur public.messages
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'messages'
      AND c.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

-- 2) Aligner les types sur public.users.id (TEXT)
ALTER TABLE public.messages
  ALTER COLUMN sender_id TYPE TEXT USING (sender_id::text),
  ALTER COLUMN receiver_id TYPE TEXT USING (receiver_id::text);

-- 3) Recréer les FK vers public.users
--    Si cette étape échoue : des lignes messages référencent des ids absents de public.users
--    → exécuter supabase_migration_sync_auth_users.sql + RPC ensure_current_user,
--    ou supprimer les messages orphelins (voir requête commentée ci-dessous).
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.users(id),
  ADD CONSTRAINT messages_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES public.users(id);

-- 4) Recréer les policies RLS sur messages (identique à supabase_rls_safe.sql)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages select own" ON public.messages FOR SELECT TO authenticated
  USING ((sender_id::uuid) = auth.uid() OR (receiver_id::uuid) = auth.uid());
CREATE POLICY "Messages insert as sender" ON public.messages FOR INSERT TO authenticated
  WITH CHECK ((sender_id::uuid) = auth.uid());
CREATE POLICY "Messages update own" ON public.messages FOR UPDATE TO authenticated
  USING ((sender_id::uuid) = auth.uid() OR (receiver_id::uuid) = auth.uid())
  WITH CHECK ((sender_id::uuid) = auth.uid() OR (receiver_id::uuid) = auth.uid());

-- 5) Fonction + policy « partenaires de conversation » sur users (supabase_migration_messages_partners.sql)
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

-- Optionnel — diagnostic messages dont les ids ne sont pas dans users :
-- SELECT m.id, m.sender_id, m.receiver_id
-- FROM public.messages m
-- WHERE m.sender_id NOT IN (SELECT id FROM public.users)
--    OR m.receiver_id NOT IN (SELECT id FROM public.users);

-- 6) Vérification FK
SELECT conname, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'messages'
  AND c.contype = 'f';

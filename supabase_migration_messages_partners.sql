-- ============================================================
-- OfCoach – Permettre de lire le profil des utilisateurs avec qui on a une conversation (pour afficher nom/avatar dans Messages)
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

-- Permettre à un utilisateur de lire id, name, avatar (et role) des users qui lui ont envoyé un message ou à qui il en a envoyé
-- Casts explicites pour éviter text = uuid (users.id en TEXT, auth.uid() en UUID)
DROP POLICY IF EXISTS "Users read conversation partners" ON public.users;
CREATE POLICY "Users read conversation partners"
  ON public.users FOR SELECT TO authenticated
  USING (
    (id::uuid) = auth.uid()
    OR (id IN (SELECT (sender_id::text) FROM public.messages WHERE (receiver_id::uuid) = auth.uid()))
    OR (id IN (SELECT (receiver_id::text) FROM public.messages WHERE (sender_id::uuid) = auth.uid()))
  );

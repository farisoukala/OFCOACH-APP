-- ============================================================
-- OfCoach – Table notifications (in-app)
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications select own" ON public.notifications;
CREATE POLICY "Notifications select own" ON public.notifications FOR SELECT TO authenticated
  USING ((user_id::uuid) = auth.uid());

DROP POLICY IF EXISTS "Notifications insert own" ON public.notifications;
CREATE POLICY "Notifications insert own" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    (user_id::uuid) = auth.uid()
    OR (EXISTS (SELECT 1 FROM public.users WHERE (id::text) = user_id AND (coach_id::uuid) = auth.uid()))
  );

DROP POLICY IF EXISTS "Notifications update own" ON public.notifications;
CREATE POLICY "Notifications update own" ON public.notifications FOR UPDATE TO authenticated
  USING ((user_id::uuid) = auth.uid())
  WITH CHECK ((user_id::uuid) = auth.uid());

DROP POLICY IF EXISTS "Notifications delete own" ON public.notifications;
CREATE POLICY "Notifications delete own" ON public.notifications FOR DELETE TO authenticated
  USING ((user_id::uuid) = auth.uid());

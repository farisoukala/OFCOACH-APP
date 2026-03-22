-- OfCoach – Rendez-vous coach → athlète (jour + heure)
-- À exécuter dans Supabase → SQL Editor
-- Prérequis : public.users avec id compatible ::uuid (comme workouts)

CREATE TABLE IF NOT EXISTS public.athlete_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_athlete_appointments_athlete_starts
  ON public.athlete_appointments (athlete_id, starts_at ASC);

ALTER TABLE public.athlete_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athlete appointments select" ON public.athlete_appointments;
CREATE POLICY "Athlete appointments select"
  ON public.athlete_appointments FOR SELECT TO authenticated
  USING (
    (athlete_id::uuid) = auth.uid() OR (coach_id::uuid) = auth.uid()
  );

DROP POLICY IF EXISTS "Athlete appointments insert coach" ON public.athlete_appointments;
CREATE POLICY "Athlete appointments insert coach"
  ON public.athlete_appointments FOR INSERT TO authenticated
  WITH CHECK ((coach_id::uuid) = auth.uid());

DROP POLICY IF EXISTS "Athlete appointments update coach" ON public.athlete_appointments;
CREATE POLICY "Athlete appointments update coach"
  ON public.athlete_appointments FOR UPDATE TO authenticated
  USING ((coach_id::uuid) = auth.uid())
  WITH CHECK ((coach_id::uuid) = auth.uid());

DROP POLICY IF EXISTS "Athlete appointments delete coach" ON public.athlete_appointments;
CREATE POLICY "Athlete appointments delete coach"
  ON public.athlete_appointments FOR DELETE TO authenticated
  USING ((coach_id::uuid) = auth.uid());

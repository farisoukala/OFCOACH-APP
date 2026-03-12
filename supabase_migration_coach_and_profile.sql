-- ============================================================
-- OfCoach – Liaison athlète/coach + champs profil (poids, taille, etc.)
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

-- 1) Ajouter coach_id aux utilisateurs (athlètes liés à un coach)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS coach_id TEXT REFERENCES public.users(id);

-- 2) Champs profil athlète (affichés sur le profil client)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS objectives TEXT,
  ADD COLUMN IF NOT EXISTS medical_risks TEXT;

-- 3) RLS users : un coach ne voit que lui-même + les athlètes dont il est le coach
DROP POLICY IF EXISTS "Authenticated can read users" ON public.users;
DROP POLICY IF EXISTS "Users read self or athletes of coach" ON public.users;
CREATE POLICY "Users read self or athletes of coach"
  ON public.users FOR SELECT TO authenticated
  USING (
    (id::uuid) = auth.uid()
    OR (role = 'athlete' AND (coach_id::uuid) = auth.uid())
  );

-- 4) Autoriser un coach à mettre à jour le profil des athlètes qu’il coache (profil uniquement)
-- Les utilisateurs peuvent déjà UPDATE leur propre ligne via la policy existante si vous en avez une.
-- Sinon, policy pour que le coach puisse mettre à jour les champs profil de ses athlètes :
DROP POLICY IF EXISTS "Users update own row" ON public.users;
CREATE POLICY "Users update own row"
  ON public.users FOR UPDATE TO authenticated
  USING ((id::uuid) = auth.uid())
  WITH CHECK ((id::uuid) = auth.uid());

DROP POLICY IF EXISTS "Coach can update athlete profile" ON public.users;
CREATE POLICY "Coach can update athlete profile"
  ON public.users FOR UPDATE TO authenticated
  USING (role = 'athlete' AND (coach_id::uuid) = auth.uid())
  WITH CHECK (role = 'athlete' AND (coach_id::uuid) = auth.uid());

-- Pour les tests : lier un athlète à un coach (remplacer les UUID par les vrais IDs)
-- UPDATE public.users SET coach_id = '<UUID_DU_COACH>' WHERE id = '<UUID_ATHLETE>' AND role = 'athlete';

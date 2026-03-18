-- ============================================================
-- Coach : mise à jour du profil d’un athlète sans 42P17 (RLS récursif)
-- Le coach ne fait pas de PATCH direct sur users, il appelle cette RPC.
-- Exécuter dans Supabase → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.patch_athlete_profile_as_coach(p_athlete_id text, p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  IF p_athlete_id IS NULL OR trim(p_athlete_id) = '' THEN
    RAISE EXCEPTION 'ID athlète requis';
  END IF;

  -- Mise à jour uniquement si la ligne est un athlète dont le coach est l’utilisateur connecté
  UPDATE public.users u SET
    name = CASE WHEN p_data ? 'name' THEN NULLIF(TRIM(p_data->>'name'), '') ELSE u.name END,
    avatar = CASE WHEN p_data ? 'avatar' THEN NULLIF(p_data->>'avatar', '') ELSE u.avatar END,
    weight_kg = CASE
      WHEN NOT (p_data ? 'weight_kg') THEN u.weight_kg
      WHEN p_data->'weight_kg' IS NULL OR p_data->>'weight_kg' = '' THEN NULL
      ELSE (p_data->>'weight_kg')::numeric
    END,
    height_cm = CASE
      WHEN NOT (p_data ? 'height_cm') THEN u.height_cm
      WHEN p_data->'height_cm' IS NULL OR p_data->>'height_cm' = '' THEN NULL
      ELSE (p_data->>'height_cm')::numeric
    END,
    age = CASE
      WHEN NOT (p_data ? 'age') THEN u.age
      WHEN p_data->'age' IS NULL OR p_data->>'age' = '' THEN NULL
      ELSE (p_data->>'age')::integer
    END,
    objectives = CASE WHEN p_data ? 'objectives' THEN NULLIF(p_data->>'objectives', '') ELSE u.objectives END,
    medical_risks = CASE WHEN p_data ? 'medical_risks' THEN NULLIF(p_data->>'medical_risks', '') ELSE u.medical_risks END,
    taille_cm = CASE
      WHEN NOT (p_data ? 'taille_cm') THEN u.taille_cm
      WHEN p_data->'taille_cm' IS NULL OR p_data->>'taille_cm' = '' THEN NULL
      ELSE (p_data->>'taille_cm')::numeric
    END,
    tour_poitrine_cm = CASE
      WHEN NOT (p_data ? 'tour_poitrine_cm') THEN u.tour_poitrine_cm
      WHEN p_data->'tour_poitrine_cm' IS NULL OR p_data->>'tour_poitrine_cm' = '' THEN NULL
      ELSE (p_data->>'tour_poitrine_cm')::numeric
    END,
    tour_ventre_cm = CASE
      WHEN NOT (p_data ? 'tour_ventre_cm') THEN u.tour_ventre_cm
      WHEN p_data->'tour_ventre_cm' IS NULL OR p_data->>'tour_ventre_cm' = '' THEN NULL
      ELSE (p_data->>'tour_ventre_cm')::numeric
    END,
    tour_hanche_cm = CASE
      WHEN NOT (p_data ? 'tour_hanche_cm') THEN u.tour_hanche_cm
      WHEN p_data->'tour_hanche_cm' IS NULL OR p_data->>'tour_hanche_cm' = '' THEN NULL
      ELSE (p_data->>'tour_hanche_cm')::numeric
    END,
    tour_bras_cm = CASE
      WHEN NOT (p_data ? 'tour_bras_cm') THEN u.tour_bras_cm
      WHEN p_data->'tour_bras_cm' IS NULL OR p_data->>'tour_bras_cm' = '' THEN NULL
      ELSE (p_data->>'tour_bras_cm')::numeric
    END,
    tour_epaule_cm = CASE
      WHEN NOT (p_data ? 'tour_epaule_cm') THEN u.tour_epaule_cm
      WHEN p_data->'tour_epaule_cm' IS NULL OR p_data->>'tour_epaule_cm' = '' THEN NULL
      ELSE (p_data->>'tour_epaule_cm')::numeric
    END,
    tour_mollet_cm = CASE
      WHEN NOT (p_data ? 'tour_mollet_cm') THEN u.tour_mollet_cm
      WHEN p_data->'tour_mollet_cm' IS NULL OR p_data->>'tour_mollet_cm' = '' THEN NULL
      ELSE (p_data->>'tour_mollet_cm')::numeric
    END
  WHERE u.id = p_athlete_id
    AND u.role = 'athlete'
    AND (u.coach_id::uuid) = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.patch_athlete_profile_as_coach(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.patch_athlete_profile_as_coach(text, jsonb) TO authenticated;

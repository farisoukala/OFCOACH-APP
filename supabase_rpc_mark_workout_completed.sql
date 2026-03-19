-- ============================================================
-- OfCoach – RPC: marquer une séance comme terminée (athlète)
-- Permet de contourner les conflits RLS UPDATE sur workouts.
-- Exécuter dans Supabase -> SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.mark_workout_completed(p_workout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Un athlète ne peut terminer que ses propres séances.
  UPDATE public.workouts
  SET status = 'completed'
  WHERE id = p_workout_id
    AND athlete_id::text = auth.uid()::text;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_workout_completed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_workout_completed(uuid) TO authenticated;


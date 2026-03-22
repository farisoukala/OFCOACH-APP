-- ============================================================
-- OfCoach – Suppression de la table public.meals (objectifs macros uniquement)
-- À exécuter UNE FOIS dans Supabase → SQL Editor (Run)
--
-- Effet : supprime toutes les lignes repas et la table. Les politiques RLS
-- sur meals sont supprimées automatiquement avec la table.
-- Prérequis : l’app n’utilise plus les repas (Nutrition = kcal + P/G/L).
-- ============================================================

DROP TABLE IF EXISTS public.meals CASCADE;

-- Si tu avais ajouté meals au Realtime : décommente la ligne suivante (sinon erreur ignorée).
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.meals;

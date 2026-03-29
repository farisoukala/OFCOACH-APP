# Migrations SQL — convention OfCoach

Ce dossier sert à **versionner** les changements de schéma / RLS **à partir de maintenant**, et à tenir un **journal** de ce qui a été appliqué sur chaque projet Supabase.

## Convention de nommage (nouvelles migrations)

Utiliser le format **CLI Supabase** (timestamp UTC + description) :

```text
YYYYMMDDHHMMSS_description_courte.sql
```

Exemples :

- `20260329143000_add_coach_notes_to_users.sql`
- `20260401090000_fix_messages_rls.sql`

- Un fichier = une intention logique (une requête ou un lot cohérent).
- Éviter de mélanger plusieurs sujets non liés dans le même fichier.

## Fichiers historiques à la racine du repo

Les scripts `supabase_*.sql` à la **racine** du dépôt restent la référence pour les **bases déjà documentées** dans `SUPABASE-SETUP.md` (ordre d’exécution, dépannage).

Pour toute **nouvelle** évolution :

1. Créer un fichier **daté dans ce dossier** `supabase/migrations/`.
2. (Optionnel) Copier le contenu final dans le SQL Editor Supabase ou utiliser [Supabase CLI](https://supabase.com/docs/guides/cli) `db push` si tu branches le projet sur CLI.

## Journal des migrations appliquées

Pour tracer ce qui a été exécuté sur **quel** projet (ref Supabase, staging, prod) :

1. Dupliquer `apply_journal.template.csv` en `apply_journal.local.csv` (ou équivalent).
2. Ajouter une ligne **à chaque** exécution réussie dans le SQL Editor (ou via CLI).
3. **Ne pas commiter** de journal contenant des données sensibles ; le template peut rester versionné.

Colonnes du CSV :

- `applied_at_utc` : date/heure ISO (ex. `2026-03-29T14:30:00Z`)
- `migration_id` : préfixe du fichier (ex. `20260329143000`) ou identifiant unique
- `filename` : nom du fichier
- `supabase_project_ref` : identifiant court du projet (dashboard URL `https://app.supabase.com/project/<ref>`)
- `environment` : `local` | `staging` | `production`
- `operator` : qui a appliqué
- `notes` : libre (ex. « ré-exécuté après correction typo »)

## Sauvegardes Supabase (hors Git)

Les **données** et **backups automatiques** se configurent dans le dashboard Supabase (Plans / Database backups). Le Git ne remplace pas une sauvegarde base : il versionne surtout le **code SQL** et le journal d’application.

## Voir aussi

- `SUPABASE-SETUP.md` — ordre recommandé des scripts racine et dépannage.

# Configuration Supabase — OfCoach

> **Attention :** ce fichier est un **guide** (documentation). Ne pas le coller dans le SQL Editor de Supabase. Il faut exécuter les **fichiers .sql** listés dans la section 2 (supabase_schema.sql, supabase_rls_safe.sql, etc.).

---

## 1. URLs de redirection (Auth)

Supabase utilise ces URLs pour renvoyer l’utilisateur après connexion, inscription ou réinitialisation de mot de passe.

### Où configurer

1. Ouvre ton projet sur [app.supabase.com](https://app.supabase.com).
2. **Authentication** (menu gauche) → **URL Configuration**.

### Champs à remplir

| Champ | Valeur | Exemple |
|-------|--------|--------|
| **Site URL** | URL principale de ton app (prod ou local) | `https://ton-app.vercel.app` ou `http://localhost:5173` |
| **Redirect URLs** | Liste d’URLs autorisées pour les redirections Auth | Une ligne par URL (voir ci‑dessous) |

### URLs à ajouter dans « Redirect URLs »

- **En local**  
  `http://localhost:5173`  
  (ou le port utilisé par `npm run dev`, ex. `http://localhost:3000`)

- **En production**  
  L’URL exacte de ton app, **sans** slash final, ex. :  
  `https://ton-domaine.vercel.app`  
  `https://ofcoach.netlify.app`

Tu peux ajouter plusieurs lignes (localhost + prod, ou plusieurs domaines).  
**Mot de passe oublié** : le lien envoyé par email redirige aussi vers une de ces URLs ; l’app affiche alors l’écran « Nouveau mot de passe ».

### Optionnel : confirmation email

- **Authentication** → **Providers** → **Email**  
- Si tu actives **Confirm email** : l’utilisateur doit cliquer sur le lien reçu par email avant de pouvoir se connecter.
- L’email de confirmation redirige vers ton **Site URL** (avec des paramètres dans l’URL). Inutile d’ajouter une URL spécifique pour ça si ta SPA gère déjà la route d’accueil.

---

## 2. Migrations SQL — ordre d’exécution

Exécuter les scripts dans l’ordre suivant via **SQL Editor** (Nouvelle requête → coller le contenu du fichier → Run).

### Étape 1 : Schéma de base

**Fichier : `supabase_schema.sql`**

- Crée les tables : `users`, `workouts`, `exercises`, `nutrition_plans`, `meals`, `progress_logs`, `calendar_events`, `athlete_appointments` (rendez-vous coach → athlète).
- La ligne Realtime pour `messages` est commentée dans le fichier (la table `messages` est créée à l’étape 2).

### Étape 2 : RLS et table messages

**Fichier : `supabase_rls_safe.sql`**

- Crée la table **messages** et active les politiques RLS sur toutes les tables (users, workouts, exercises, nutrition_plans, meals, progress_logs, calendar_events, messages).

### Étape 3 : Migrations métier (dans l’ordre)

| Ordre | Fichier | Rôle |
|-------|---------|------|
| 1 | `supabase_migration_coach_and_profile.sql` | Colonnes `coach_id`, profil (poids, taille, âge, objectifs, risques), RLS users coach/athlète |
| 2 | `supabase_migration_link_athlete.sql` | RLS : coach peut lier un athlète (par email) |
| 3 | `supabase_migration_messages_partners.sql` | RLS : lecture des correspondants (nom/avatar dans Messages) |
| 4 | `supabase_migration_progress_logs.sql` | Table `progress_logs` si absente + RLS (optionnel si déjà dans le schéma) |
| 5 | `supabase_migration_progress_logs_add_body_fat.sql` | Colonnes `body_fat` et `notes` sur `progress_logs` |
| 6 | `supabase_migration_workout_athlete_update.sql` | RLS : athlète peut mettre à jour sa séance (ex. marquer terminée) |
| 7 | `supabase_migration_notifications.sql` | Table **notifications** + RLS (pour l’écran Notifications) |
| 8 | `supabase_migration_user_gender.sql` | Colonne **gender** sur `users` (inscription Homme/Femme + biométrie) |
| 9 | `supabase_migration_athlete_appointments.sql` | Table **athlete_appointments** (jour + heure des RDV coach) + RLS ; puis ré-exécuter les blocs RLS de `supabase_rls_safe.sql` pour cette table **ou** n’exécuter que le bloc `ATHLETE_APPOINTMENTS` ajouté en fin de `supabase_rls_safe.sql` |
| 10 | `supabase_migration_nutrition_athlete_edit.sql` | RLS : l’**athlète** peut **modifier** son plan nutritionnel et **ajouter/supprimer** des repas (écran Nutrition) |

### Après la dernière migration (optionnel)

Si tu veux le temps réel sur les messages, exécuter une seule fois :

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

(Uniquement si la table `messages` existe déjà.)

---

## 3. Vérification rapide

- **Authentication** : un utilisateur peut s’inscrire et se connecter.
- **Tables** : dans **Table Editor**, tu vois au moins `users`, `workouts`, `exercises`, `nutrition_plans`, `meals`, `progress_logs`, `calendar_events`, `messages`, `notifications`.
- **RLS** : chaque table a des politiques (voir **Authentication** → **Policies** ou la vue SQL des policies).

Si une migration échoue (colonne déjà existante, policy déjà existante), tu peux ignorer l’erreur pour cette ligne ou utiliser les variantes `IF NOT EXISTS` / `DROP POLICY IF EXISTS` déjà présentes dans les scripts.

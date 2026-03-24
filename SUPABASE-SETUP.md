# Configuration Supabase — OfCoach

> **Attention :** ce fichier est un **guide** (documentation). Ne pas le coller dans le SQL Editor de Supabase. Il faut exécuter les **fichiers .sql** listés dans la section 2 (supabase_schema.sql, supabase_rls_safe.sql, etc.).

### Variables d’environnement (Vercel / build)

L’erreur **`No API key found in request`** vient presque toujours d’ici : le front Vite embarque les clés **au moment du build**.

1. **Vercel** → ton projet → **Settings** → **Environment Variables**.
2. Ajoute (pour **Production** au minimum) :
   - **`VITE_SUPABASE_URL`** = URL du projet (ex. `https://xxxx.supabase.co`) — *Supabase → Settings → API → Project URL*
   - **`VITE_SUPABASE_ANON_KEY`** = clé **anon** / **public** (longue chaîne `eyJ...`) — *même page, anon public*
3. **Redéploie** (nouveau déploiement sans cache si besoin) : sans ça, l’ancien build peut encore partir sans clé.

En local : copie `.env.example` vers `.env` et remplis les deux variables.

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

- Crée les tables : `users`, `workouts`, `exercises`, `nutrition_plans`, `progress_logs`, `calendar_events`, `athlete_appointments` (rendez-vous coach → athlète). *(La table `meals` a été retirée : objectifs macros sur `nutrition_plans` uniquement.)*
- La ligne Realtime pour `messages` est commentée dans le fichier (la table `messages` est créée à l’étape 2).

### Étape 2 : RLS et table messages

**Fichier : `supabase_rls_safe.sql`**

- Crée la table **messages** et active les politiques RLS sur les tables concernées (sans `meals`).
- Ajoute le droit d’**INSERT** (et `GRANT`) sur **sa propre ligne `users`** pour la messagerie.

### Étape 3 : Migrations métier (dans l’ordre)

| Ordre | Fichier | Rôle |
|-------|---------|------|
| 1 | `supabase_migration_coach_and_profile.sql` | Colonnes `coach_id`, profil (poids, taille, âge, objectifs, risques), RLS users coach/athlète |
| 2 | `supabase_migration_link_athlete.sql` | RLS : coach peut lier un athlète (par email) |
| 3 | `supabase_migration_messages_partners.sql` | RLS messagerie + athlète → coach (via fonction `ofcoach_my_coach_id`, sans récursion sur `users`) |
| — | `supabase_migration_restore_coach_sees_athletes.sql` | **Dépannage** : si la liste clients est vide, rétablit la policy coach → athlètes (`coach_id`) |
| — | **`supabase_migration_sync_auth_users.sql`** | **Messagerie** : copie `auth.users` → `public.users`, policy INSERT, trigger |
| — | **`supabase_rpc_ensure_current_user_in_users.sql`** | **Messagerie** : fonction RPC appelée par l’app pour créer la ligne `users` même si l’INSERT client est bloqué (à exécuter après le script sync) |
| — | **`supabase_rpc_ensure_messaging_partner_in_users.sql`** | **Messagerie** : crée la ligne `public.users` du **destinataire** si le lien coach/athlète ou une conversation existe (à exécuter après `ensure_current_user_in_users`) |
| 4 | `supabase_migration_progress_logs.sql` | Table `progress_logs` si absente + RLS (optionnel si déjà dans le schéma) |
| 5 | `supabase_migration_progress_logs_add_body_fat.sql` | Colonnes `body_fat` et `notes` sur `progress_logs` |
| 6 | `supabase_migration_workout_athlete_update.sql` | RLS : athlète peut mettre à jour sa séance (ex. marquer terminée) |
| 7 | `supabase_migration_notifications.sql` | Table **notifications** + RLS (pour l’écran Notifications) |
| 8 | `supabase_migration_user_gender.sql` | Colonne **gender** sur `users` (inscription Homme/Femme + biométrie) |
| 9 | `supabase_migration_athlete_appointments.sql` | Table **athlete_appointments** (jour + heure des RDV coach) + RLS ; puis ré-exécuter les blocs RLS de `supabase_rls_safe.sql` pour cette table **ou** n’exécuter que le bloc `ATHLETE_APPOINTMENTS` ajouté en fin de `supabase_rls_safe.sql` |
| 10 | `supabase_migration_nutrition_athlete_edit.sql` | RLS : l’**athlète** peut **modifier** les objectifs de son plan (`nutrition_plans`) |
| 11 | `supabase_migration_drop_meals.sql` | **Bases déjà en prod** : supprime la table **`meals`** et les données repas (à lancer une fois si l’ancien schéma avait `meals`) |

**Nouveau déploiement from scratch** : `supabase_schema.sql` + `supabase_rls_safe.sql` n’incluent plus `meals` → l’étape 11 est **inutile**.

> Les anciens fichiers `supabase_fix_nutrition_*.sql` / `supabase_rls.sql` historiques peuvent encore mentionner `meals` : **ne pas** les ré-exécuter après `supabase_migration_drop_meals.sql` (erreur « relation meals does not exist »). Utilise plutôt `supabase_rls_safe.sql` à jour.

### Après la dernière migration (optionnel)

Si tu veux le temps réel sur les messages, exécuter une seule fois :

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

(Uniquement si la table `messages` existe déjà.)

### Liste des clients vide (coach)

1. Dans **SQL Editor**, exécuter **`supabase_migration_restore_coach_sees_athletes.sql`** (rétablit la lecture des athlètes liés par `coach_id`).
2. Ré-exécuter **`supabase_migration_messages_partners.sql`** (version à jour : plus de récursion RLS sur `users`).
3. Dans **Table Editor → users**, vérifier que tes athlètes ont **`coach_id`** = l’**id** (UUID) du coach (colonne `id` de la ligne du coach).

### Messagerie — si l’alerte « profil non synchronisé » apparaît

1. Exécuter **`supabase_migration_sync_auth_users.sql`** (projet Supabase = URL dans Vercel).
2. Exécuter **`supabase_rpc_ensure_current_user_in_users.sql`** — **sans ce fichier, l’alerte « profil non synchronisé » peut revenir** malgré l’étape 1.
3. Exécuter **`supabase_rpc_ensure_messaging_partner_in_users.sql`** — permet de créer la ligne du destinataire côté serveur (évite erreurs FK / envoi bloqué).
4. Ré-exécuter **`supabase_migration_messages_partners.sql`** (version à jour).
5. Vérifier **`supabase_migration_coach_and_profile.sql`** (`coach_id`).
6. Rafraîchir l’app, réessayer d’envoyer un message.

Si le trigger sur `auth.users` échoue au `CREATE TRIGGER` (rare selon la version Postgres), ouvre `supabase_migration_sync_auth_users.sql` et remplace la dernière ligne `EXECUTE PROCEDURE` par `EXECUTE FUNCTION` puis relance uniquement ce bloc.

### Erreur `23503` / « Key is not present in table "profiles" » (messages)

Certaines bases créées avec un template Supabase ont encore **`messages`** qui référence **`profiles`** au lieu de **`public.users`**. L’app OfCoach n’utilise pas `profiles` pour la messagerie.

**À exécuter une fois :** **`supabase_fix_messages_fk_profiles_to_users.sql`** (réaligne les FK `sender_id` / `receiver_id` sur `public.users`).

Ensuite relancer les étapes sync + RPC ci-dessus si besoin.

---

## 3. Vérification rapide

- **Authentication** : un utilisateur peut s’inscrire et se connecter.
- **Tables** : dans **Table Editor**, tu vois au moins `users`, `workouts`, `exercises`, `nutrition_plans`, `progress_logs`, `calendar_events`, `messages`, `notifications` (plus de `meals` après la migration 11 si tu l’as exécutée).
- **RLS** : chaque table a des politiques (voir **Authentication** → **Policies** ou la vue SQL des policies).

Si une migration échoue (colonne déjà existante, policy déjà existante), tu peux ignorer l’erreur pour cette ligne ou utiliser les variantes `IF NOT EXISTS` / `DROP POLICY IF EXISTS` déjà présentes dans les scripts.

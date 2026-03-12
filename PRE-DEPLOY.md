# Avant déploiement — OfCoach

## Déjà fait dans le projet

- **Métadonnées** : `index.html` avec titre « OfCoach », `lang="fr"`, meta description.
- **Navigation** : bouton Paramètres dans l’écran Messages renvoie vers Paramètres.
- **ErrorBoundary** : en cas d’erreur React non gérée, affichage d’un écran « Une erreur est survenue » + bouton Recharger.
- **Package** : `package.json` nommé `ofcoach`, version `1.0.0`.
- **Supabase** : message clair en prod si `VITE_SUPABASE_*` manquent.

---

## À faire / à vérifier avant de déployer

### 1. Variables d’environnement

- En production, définir **VITE_SUPABASE_URL** et **VITE_SUPABASE_ANON_KEY** (voir `.env.example`).
- Ne jamais commiter un fichier `.env` contenant de vraies clés.

### 2. Supabase (dashboard)

- **Auth → URL de redirection** : ajouter l’URL de ton app en production (ex. `https://ton-app.vercel.app`).
- **Auth → Email** : vérifier « Confirm email » si tu utilises la confirmation par email.
- Vérifier que toutes les migrations SQL ont été exécutées (messages, notifications, RLS, etc.).

### 3. Build

- Lancer `npm run build` et corriger les erreurs TypeScript éventuelles.
- Tester `npm run preview` pour un aperçu du build.

### 4. UX / feedback (optionnel)

- Les `alert()` pour erreurs peuvent être remplacés plus tard par des toasts ou messages inline pour une meilleure UX.

### 5. Images

- Les images Unsplash (avatars par défaut, fonds) sont utilisées en dur. En production longue durée, envisager de les héberger (CDN / assets du projet) pour éviter tout changement ou limite de tiers.

### 6. Sécurité

- RLS Supabase : déjà en place ; ne pas désactiver en prod.
- L’anon key est exposée côté client ; c’est normal pour Supabase, les règles RLS protègent les données.

### 7. Accessibilité (optionnel)

- Vérifier les contrastes et les zones cliquables sur mobile.
- Ajouter des `aria-label` sur les boutons sans texte (icônes seules).

### 8. Performance (optionnel)

- Lazy-load des écrans lourds avec `React.lazy` + `Suspense` si le bundle devient gros.
- Vérifier que les listes longues (conversations, notifications) restent fluides.

---

## Checklist rapide

- [ ] `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` configurés en prod
- [ ] URLs de redirection Supabase configurées
- [ ] `npm run build` OK
- [ ] Migrations Supabase exécutées
- [ ] Test manuel des parcours principaux (connexion, coach/athlète, messages, notifications)

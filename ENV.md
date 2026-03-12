# Variables d'environnement — OfCoach

## Variables utilisées par l'app

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` | Oui | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Oui | Clé anonyme (publique) Supabase |

Le préfixe **VITE_** est requis pour que Vite expose la variable au code client.

---

## Où trouver les valeurs (Supabase)

1. Ouvre ton projet sur [supabase.com](https://supabase.com) → **Dashboard**.
2. **Settings** (⚙️) → **API**.
3. **Project URL** → à copier dans `VITE_SUPABASE_URL`.
4. **Project API keys** → **anon public** → à copier dans `VITE_SUPABASE_ANON_KEY`.

---

## En local

1. Copie le fichier d’exemple :
   ```bash
   cp .env.example .env
   ```
2. Édite `.env` et remplace les valeurs par celles de ton projet Supabase.
3. Vérifie que `.env` est bien dans `.gitignore` (ne pas le commiter).

---

## En production (déploiement)

Définir les mêmes variables dans la plateforme utilisée :

- **Vercel** : Project → Settings → Environment Variables.
- **Netlify** : Site → Site settings → Environment variables.
- **Autres** : Chercher "Environment variables" ou "Secrets" dans la doc.

Ajouter au minimum :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Puis **redéployer** : les variables `VITE_*` sont injectées au **build**, pas au runtime.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

if (!supabaseUrl || !supabaseAnonKey) {
  const msg =
    'Variables manquantes : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY. ' +
    'En prod (Vercel) : les ajouter dans Settings → Environment Variables puis redéployer le build. ' +
    'En local : copier .env.example vers .env et remplir les valeurs (Dashboard Supabase → Settings → API).';
  if (import.meta.env.PROD) {
    console.error(msg);
    throw new Error(msg);
  }
  console.warn(msg);
}

/** Sans clé valide, PostgREST répond : "No API key found in request". */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

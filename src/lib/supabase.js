import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('⚠️ Clés Supabase manquantes : copiez .env.example en .env et remplissez-le.');
}

export const supabase = createClient(url ?? 'http://localhost', key ?? 'public-anon-key');

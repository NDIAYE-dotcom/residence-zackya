import { supabase } from '../lib/supabase.js';

// Paramètres de la résidence (clé → valeur), gardés en mémoire après la 1re lecture
let cache = null;

export async function lireParametres() {
  if (cache) return cache;
  const { data, error } = await supabase.from('parametres').select('cle, valeur');
  if (error) throw error;
  cache = Object.fromEntries(data.map((p) => [p.cle, p.valeur]));
  return cache;
}

// À appeler après une modification dans le module Paramètres
export const viderCacheParametres = () => { cache = null; };

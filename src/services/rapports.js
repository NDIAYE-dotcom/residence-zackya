import { supabase } from '../lib/supabase.js';

// Tous les chiffres d'une période (« AAAA-MM-JJ ») calculés par la base (fonction rapport_periode)
export async function rapportPeriode(du, au) {
  const { data, error } = await supabase.rpc('rapport_periode', { p_du: du, p_au: au });
  if (error) throw error;
  return data;
}

import { supabase } from '../lib/supabase.js';

// Trace une action importante dans journal_activite (un échec ne bloque jamais l'interface)
export async function journaliser(action, cibleTable, cibleId, details = null) {
  const { data } = await supabase.auth.getSession();
  const { error } = await supabase.from('journal_activite').insert({
    user_id: data.session?.user.id ?? null,
    action,
    cible_table: cibleTable,
    cible_id: cibleId,
    details,
  });
  if (error) console.warn('Journal non enregistré :', error.message);
}

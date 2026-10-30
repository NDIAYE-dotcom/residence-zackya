import { supabase } from '../lib/supabase.js';
import { journaliser } from './journal.js';

// Toutes les requêtes du module « Ménage »

// Tâches à faire / en cours + celles terminées aujourd'hui
export async function listerTaches() {
  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('v_taches_menage')
    .select('*')
    .or(`statut.neq.terminee,terminee_le.gte.${debutJour.toISOString()}`)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function personnelMenage() {
  const { data, error } = await supabase.rpc('personnel_menage');
  if (error) throw error;
  return data;
}

async function maj(tache, valeurs, action) {
  const { error } = await supabase.from('taches_menage').update(valeurs).eq('id', tache.id);
  if (error) throw error;
  await journaliser(action, 'taches_menage', tache.id, { studio: tache.studio_code, ...valeurs });
}

// Commencer : la tâche est prise par la personne si elle n'était assignée à personne
export const commencerTache = (tache, moi) =>
  maj(tache, { statut: 'en_cours', assigne_a: tache.assigne_a ?? moi }, 'menage.commencee');

// Terminer : le studio repasse « Disponible » (trigger en base)
export const terminerTache = (tache) => maj(tache, { statut: 'terminee' }, 'menage.terminee');

export const assignerTache = (tache, personneId) =>
  maj(tache, { assigne_a: personneId || null }, 'menage.assignee');

export async function creerTache({ studioId, notes, assigneA, prevueLe }) {
  const { data, error } = await supabase
    .from('taches_menage')
    .insert({ studio_id: studioId, notes: notes || null, assigne_a: assigneA || null, prevue_le: new Date(prevueLe).toISOString() })
    .select()
    .single();
  if (error) throw error;
  await journaliser('menage.creee', 'taches_menage', data.id, { notes });
  return data;
}

export async function supprimerTache(tache) {
  const { error } = await supabase.from('taches_menage').delete().eq('id', tache.id);
  if (error) throw error;
  await journaliser('menage.supprimee', 'taches_menage', tache.id, { studio: tache.studio_code });
}

// Temps réel : tâches, studios et réservations (prochaine arrivée)
export function abonnerMenage(rappel, surStatut) {
  const canal = supabase
    .channel(`menage-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'taches_menage' }, rappel)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'studios' }, rappel)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, rappel)
    .subscribe((statut) => surStatut?.(statut));
  return () => { supabase.removeChannel(canal); };
}

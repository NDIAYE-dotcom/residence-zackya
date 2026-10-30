import { supabase } from '../lib/supabase.js';
import { signeCA } from '../lib/format.js';

// Toutes les requêtes du tableau de bord
export async function chargerTableauDeBord() {
  const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0);
  const finJour = new Date(); finJour.setHours(23, 59, 59, 999);

  const [s, a, d, att, p] = await Promise.all([
    supabase.from('studios').select('id, code, nom, statut').order('code'),
    supabase.from('v_reservations').select('*').in('statut', ['confirmee', 'en_attente'])
      .gte('date_debut', debutJour.toISOString()).lte('date_debut', finJour.toISOString()).order('date_debut'),
    supabase.from('v_reservations').select('*').eq('statut', 'en_cours')
      .lte('date_fin', finJour.toISOString()).order('date_fin'),
    supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente'),
    supabase.from('paiements').select('montant, type').gte('created_at', debutJour.toISOString()),
  ]);
  const erreur = [s, a, d, att, p].find((r) => r.error)?.error;
  if (erreur) throw erreur;

  return {
    studios: s.data,
    arrivees: a.data,
    departs: d.data,
    enAttente: att.count ?? 0,
    encaisseJour: p.data.reduce((t, x) => t + signeCA(x.type) * x.montant, 0), // hors cautions
  };
}

import { supabase } from '../lib/supabase.js';

// Requêtes du planning (lecture + temps réel)

export async function studiosPlanning() {
  const { data, error } = await supabase.from('studios').select('id, code, nom, statut').order('code');
  if (error) throw error;
  return data;
}

// Réservations qui chevauchent [debut, fin[ (annulées / no-show exclues)
// Le nom du client est vide pour les rôles qui n'ont pas accès aux clients (ménage).
export async function reservationsPeriode(debut, fin) {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, reference, studio_id, formule, date_debut, date_fin, checkout_at, statut, client:clients(full_name)')
    .in('statut', ['en_attente', 'confirmee', 'en_cours', 'terminee'])
    .lt('date_debut', fin.toISOString())
    .gt('date_fin', debut.toISOString())
    .order('date_debut');
  if (error) throw error;
  return data;
}

// Appelle « rappel » à chaque création / modification de réservation ou de studio,
// et « surStatut » avec l'état de la connexion (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT, CLOSED).
// Renvoie la fonction de désabonnement.
export function abonnerPlanning(rappel, surStatut) {
  const canal = supabase
    .channel(`planning-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, rappel)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'studios' }, rappel)
    .subscribe((statut) => surStatut?.(statut));
  return () => { supabase.removeChannel(canal); };
}

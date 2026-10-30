import { supabase } from '../lib/supabase.js';
import { journaliser } from './journal.js';

// Toutes les requêtes des paiements (fiche réservation, puis module Caisse)

export async function paiementsReservation(reservationId) {
  const { data, error } = await supabase
    .from('paiements')
    .select('id, numero_recu, montant, mode, type, reference_transaction, created_at, recu:profiles(full_name)')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// { reservationId, montant, mode, type, referenceTransaction }
export async function enregistrerPaiement(p) {
  const { data: session } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from('paiements')
    .insert({
      reservation_id: p.reservationId,
      montant: p.montant,
      mode: p.mode,
      type: p.type,
      reference_transaction: p.referenceTransaction?.trim() || null,
      recu_par: session.session?.user.id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  // Rattaché à la réservation pour apparaître dans son historique
  await journaliser('paiement.ajoute', 'reservations', p.reservationId, { montant: p.montant, mode: p.mode, type: p.type });
  return data;
}

// ---------- Caisse ----------

const debutJour = (jour) => new Date(`${jour}T00:00:00`);
const finJour = (jour) => new Date(`${jour}T23:59:59.999`);

// Tous les mouvements d'une journée (« AAAA-MM-JJ »)
export async function paiementsDuJour(jour) {
  const { data, error } = await supabase
    .from('paiements')
    .select('id, numero_recu, montant, mode, type, reference_transaction, created_at, recu:profiles(full_name), ' +
      'reservation:reservations(id, reference, client:clients(full_name), studio:studios(code))')
    .gte('created_at', debutJour(jour).toISOString())
    .lte('created_at', finJour(jour).toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function lireCloture(jour) {
  const { data, error } = await supabase
    .from('clotures_caisse')
    .select('*, par:profiles(full_name)')
    .eq('jour', jour)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function cloturerCaisse(jour, especesComptees, notes) {
  const { data, error } = await supabase.rpc('cloturer_caisse', {
    p_jour: jour, p_especes_comptees: especesComptees, p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

// Réouverture (admin) : supprime la clôture du jour
export async function rouvrirCaisse(cloture) {
  const { error } = await supabase.from('clotures_caisse').delete().eq('id', cloture.id);
  if (error) throw error;
  await journaliser('caisse.rouverte', 'clotures_caisse', cloture.id, { jour: cloture.jour });
}

// Données d'un reçu : le paiement, sa réservation, et tous les paiements de la réservation (avance / reste)
export async function lirePaiementPourRecu(id) {
  const { data: paiement, error } = await supabase
    .from('paiements')
    .select('*, recu:profiles(full_name), reservation:reservations(id, reference, formule, date_debut, date_fin, ' +
      'montant_total, remise, client:clients(full_name), studio:studios(code, nom))')
    .eq('id', id)
    .single();
  if (error) throw error;
  const { data: paiements, error: e2 } = await supabase
    .from('paiements')
    .select('montant, type, numero_recu')
    .eq('reservation_id', paiement.reservation_id);
  if (e2) throw e2;
  return { paiement, paiements };
}

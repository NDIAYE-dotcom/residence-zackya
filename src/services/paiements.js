import { supabase } from '../lib/supabase.js';
import { journaliser } from './journal.js';

// Toutes les requêtes des paiements (fiche réservation, puis module Caisse)

export async function paiementsReservation(reservationId) {
  const { data, error } = await supabase
    .from('paiements')
    .select('id, montant, mode, type, reference_transaction, created_at, recu:profiles(full_name)')
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

import { supabase } from '../lib/supabase.js';

// Alertes de l'administration : réservations en ligne à confirmer

export async function compterEnAttente() {
  const { count, error } = await supabase
    .from('reservations').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente');
  if (error) throw error;
  return count ?? 0;
}

export async function resumeReservation(id) {
  const { data, error } = await supabase
    .from('v_reservations')
    .select('id, reference, client_nom, studio_code, studio_nom, formule, date_debut, date_fin, montant_total, remise')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// surNouvelle(reservation) : réservation créée depuis le site ; surChangement() : tout autre changement
export function abonnerReservations({ surNouvelle, surChangement }) {
  const canal = supabase
    .channel(`alertes-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (evt) => {
      if (evt.eventType === 'INSERT' && evt.new?.source === 'site') surNouvelle?.(evt.new);
      surChangement?.();
    })
    .subscribe();
  return () => { supabase.removeChannel(canal); };
}

// Email (et plus tard WhatsApp) au client : fonction serveur « notifier »
// Renvoie { email: 'envoye' | 'sans_email' | 'non_configure' | 'erreur', whatsapp: … }
export async function notifierClient(reservationId, evenement) {
  const { data, error } = await supabase.functions.invoke('notifier', { body: { reservation_id: reservationId, evenement } });
  if (error) {
    let message = '';
    try { message = (await error.context.json()).erreur; } catch { /* réponse non JSON */ }
    throw Object.assign(new Error(message || (error.context?.status === 404
      ? 'La fonction « notifier » n’est pas déployée.' : 'Notification impossible pour le moment.')), { code: 'FONCTION' });
  }
  return data;
}

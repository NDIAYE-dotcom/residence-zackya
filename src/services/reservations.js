import { supabase } from '../lib/supabase.js';

// Toutes les requêtes du module « Réservations »

export const TAILLE_PAGE = 50;

const COLONNES_LISTE = 'id, reference, client_id, client_nom, client_phone, studio_id, studio_code, studio_nom, ' +
  'formule, date_debut, date_fin, statut, source, montant_total, remise, total_paye, reste_a_payer, created_at';

const debutDuJour = (jour) => new Date(`${jour}T00:00:00`);
const finDuJour = (jour) => new Date(`${jour}T23:59:59.999`);

/**
 * Liste filtrée et paginée.
 * statut : '' (tous), 'actives' (en attente + confirmées + en cours) ou un statut précis.
 * du / au (« AAAA-MM-JJ ») : réservations qui chevauchent cette période.
 */
export async function rechercherReservations({
  recherche = '', statut = '', studioId = '', source = '', du = '', au = '', page = 0,
} = {}) {
  let requete = supabase
    .from('v_reservations')
    .select(COLONNES_LISTE, { count: 'exact' })
    .order('date_debut', { ascending: false })
    .range(page * TAILLE_PAGE, page * TAILLE_PAGE + TAILLE_PAGE - 1);

  if (statut === 'actives') requete = requete.in('statut', ['en_attente', 'confirmee', 'en_cours']);
  else if (statut) requete = requete.eq('statut', statut);
  if (studioId) requete = requete.eq('studio_id', studioId);
  if (source) requete = requete.eq('source', source);
  if (du) requete = requete.gt('date_fin', debutDuJour(du).toISOString());
  if (au) requete = requete.lt('date_debut', finDuJour(au).toISOString());

  const texte = recherche.replace(/[,()%*\\]/g, ' ').trim();
  if (texte) {
    const conditions = [`reference.ilike.%${texte}%`, `client_nom.ilike.%${texte}%`];
    const chiffres = recherche.replace(/\D/g, '');
    if (chiffres.length >= 3) conditions.push(`client_phone.ilike.%${chiffres}%`);
    requete = requete.or(conditions.join(','));
  }

  const { data, error, count } = await requete;
  if (error) throw error;
  return { reservations: data, total: count ?? 0 };
}

// Studios libres sur la période, avec le prix total calculé par la base
export async function studiosLibres(formule, debut, fin, exclure = null) {
  const { data, error } = await supabase.rpc('studios_libres_staff', {
    p_formule: formule,
    p_debut: new Date(debut).toISOString(),
    p_fin: new Date(fin).toISOString(),
    p_exclure: exclure,
  });
  if (error) throw error;
  return data;
}

/**
 * Crée la réservation (+ acompte éventuel) en une transaction.
 * Renvoie { id, reference, montant }. Erreur 23P01 si le créneau vient d'être pris.
 */
export async function creerReservation(r) {
  const { data, error } = await supabase.rpc('creer_reservation_staff', {
    p_studio: r.studioId,
    p_client: r.clientId,
    p_formule: r.formule,
    p_debut: new Date(r.debut).toISOString(),
    p_fin: new Date(r.fin).toISOString(),
    p_nb_personnes: r.nbPersonnes,
    p_source: r.source,
    p_statut: r.statut,
    p_remise: r.remise,
    p_caution: r.caution,
    p_notes: r.notes,
    p_acompte: r.acompte,
    p_mode: r.acompte > 0 ? r.mode : null,
    p_reference_transaction: r.referenceTransaction,
  });
  if (error) throw error;
  const [ligne] = data;
  return { id: ligne.res_id, reference: ligne.res_reference, montant: ligne.res_montant };
}

// ---------- Fiche réservation ----------

export async function lireReservation(id) {
  const { data, error } = await supabase.from('v_reservations').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

// Historique (journal) lisible par tout le personnel concerné
export async function historiqueReservation(id) {
  const { data, error } = await supabase.rpc('journal_reservation', { p_id: id });
  if (error) throw error;
  return data;
}

// Confirmer, check-in (en_cours), check-out (terminee), annuler / no-show (motif obligatoire)
export async function changerStatut(id, statut, motif = null) {
  const { error } = await supabase.rpc('changer_statut_reservation', { p_id: id, p_statut: statut, p_motif: motif });
  if (error) throw error;
}

// Nouveau départ → renvoie le nouveau montant (erreur 23P01 si le studio est pris)
export async function prolonger(id, fin) {
  const { data, error } = await supabase.rpc('prolonger_reservation', { p_id: id, p_fin: new Date(fin).toISOString() });
  if (error) throw error;
  return data;
}

// Nouveau studio → renvoie le nouveau montant
export async function changerStudio(id, studioId) {
  const { data, error } = await supabase.rpc('changer_studio_reservation', { p_id: id, p_studio: studioId });
  if (error) throw error;
  return data;
}

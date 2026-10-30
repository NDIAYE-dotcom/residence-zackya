import { supabase } from '../lib/supabase.js';

// Requêtes du site public (visiteur non connecté).
// Règle : jamais d'accès direct aux réservations ni aux clients — seulement le catalogue et des RPC.

const COLONNES_STUDIO = 'id, code, nom, description, capacite, etage, surface_m2, equipements, photos, statut, ' +
  'categorie:categories(id, nom, description), tarifs(formule, prix, actif)';

// Studios publiés (hors service exclus), avec leurs tarifs actifs
export async function catalogueStudios() {
  const { data, error } = await supabase
    .from('studios').select(COLONNES_STUDIO).eq('publie', true).neq('statut', 'hors_service')
    .eq('tarifs.actif', true) // un membre du personnel connecté ne doit pas voir les tarifs désactivés
    .order('code');
  if (error) throw error;
  return data;
}

export async function studioPublic(id) {
  const { data, error } = await supabase
    .from('studios').select(COLONNES_STUDIO).eq('id', id).eq('publie', true).neq('statut', 'hors_service')
    .eq('tarifs.actif', true).maybeSingle();
  if (error) throw error;
  return data;
}

// [{ jour: 'AAAA-MM-JJ', occupation: 'libre' | 'partiel' | 'complet' }] (62 jours maximum)
export async function calendrierStudio(id, du, au) {
  const { data, error } = await supabase.rpc('calendrier_studio', { p_studio: id, p_du: du, p_au: au });
  if (error) throw error;
  return data;
}

// Recherche de l'accueil : studios libres sur la période, avec le prix de la formule choisie
export async function rechercherDisponibles(formule, debut, fin) {
  const p = { p_debut: new Date(debut).toISOString(), p_fin: new Date(fin).toISOString() };
  const { data, error } = await supabase.rpc('studios_disponibles', p);
  if (error) throw error;
  return Promise.all((data ?? []).map(async (s) => {
    const { data: prix } = await supabase.rpc('calculer_prix', { p_studio: s.id, p_formule: formule, ...p });
    return { ...s, prix };
  }));
}

// Coordonnées publiques (paramètres)
export { lireParametres } from './parametres.js';

// Prix + disponibilité d'un studio sur une période (avant de réserver)
// Renvoie { disponible, prix } — prix null si le studio ne propose pas cette formule
export async function verifierSejour(studioId, formule, debut, fin) {
  const p = { p_debut: new Date(debut).toISOString(), p_fin: new Date(fin).toISOString() };
  const [dispo, prix] = await Promise.all([
    supabase.rpc('studio_disponible', { p_studio: studioId, ...p }),
    supabase.rpc('calculer_prix', { p_studio: studioId, p_formule: formule, ...p }),
  ]);
  if (dispo.error) throw dispo.error;
  return { disponible: !!dispo.data, prix: prix.error ? null : prix.data };
}

// Réservation en ligne → « en attente » ; renvoie { reference, montant }
export async function creerReservationPublique(r) {
  const { data, error } = await supabase.rpc('creer_reservation_publique', {
    p_studio: r.studioId,
    p_formule: r.formule,
    p_debut: new Date(r.debut).toISOString(),
    p_fin: new Date(r.fin).toISOString(),
    p_nom: r.nom,
    p_phone: r.phone,
    p_email: r.email || null,
    p_nb_personnes: r.nbPersonnes,
    p_notes: r.notes || null,
  });
  if (error) throw error;
  return data[0];
}

// Suivi : référence + téléphone (au format +221…) ; null si introuvable
export async function suivreReservation(reference, phone) {
  const { data, error } = await supabase.rpc('suivre_reservation', { p_reference: reference, p_phone: phone });
  if (error) throw error;
  return data[0] ?? null;
}

// Statut avec la référence seule (sans données personnelles) ; null si introuvable
export async function statutParReference(reference) {
  const { data, error } = await supabase.rpc('statut_reservation_public', { p_reference: reference });
  if (error) throw error;
  return data[0] ?? null;
}

// Format d'une référence : ZQ-AAMMJJ-NNNN
export const REFERENCE_VALIDE = /^ZQ-\d{6}-\d{4,}$/;

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

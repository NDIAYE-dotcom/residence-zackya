import { supabase } from '../lib/supabase.js';
import { journaliser } from './journal.js';

// Toutes les requêtes Supabase du module « Studios & tarifs »

const BUCKET = 'studios';

// ---------- Studios ----------

export async function listerStudios() {
  const { data, error } = await supabase
    .from('studios')
    .select('*, categorie:categories(id, nom), tarifs(formule, prix, actif)')
    .order('code');
  if (error) throw error;
  return data;
}

export async function listerCategories() {
  const { data, error } = await supabase.from('categories').select('id, nom, capacite').order('nom');
  if (error) throw error;
  return data;
}

export async function creerStudio(valeurs) {
  const { data, error } = await supabase.from('studios').insert(valeurs).select().single();
  if (error) throw error;
  await journaliser('studio.cree', 'studios', data.id, { code: data.code });
  return data;
}

// action : nom dans le journal (studio.modifie, studio.statut, studio.publication, studio.photos)
export async function modifierStudio(id, valeurs, action = 'studio.modifie') {
  const { data, error } = await supabase.from('studios').update(valeurs).eq('id', id).select().single();
  if (error) throw error;
  await journaliser(action, 'studios', id, valeurs);
  return data;
}

// Supprime le studio (tarifs supprimés en cascade) puis ses photos.
// Erreur 23503 si le studio a des réservations.
export async function supprimerStudio(studio) {
  const { error } = await supabase.from('studios').delete().eq('id', studio.id);
  if (error) throw error;
  const chemins = (studio.photos ?? []).map(cheminPhoto).filter(Boolean);
  if (chemins.length) await supabase.storage.from(BUCKET).remove(chemins);
  await journaliser('studio.supprime', 'studios', studio.id, { code: studio.code, nom: studio.nom });
}

// ---------- Tarifs ----------

export async function listerTarifs(studioId) {
  const { data, error } = await supabase.from('tarifs').select('*').eq('studio_id', studioId);
  if (error) throw error;
  return data;
}

// lignes : [{ formule, prix, duree_heures, actif }] — crée ou met à jour (1 tarif par formule)
export async function enregistrerTarifs(studioId, lignes) {
  const { error } = await supabase
    .from('tarifs')
    .upsert(lignes.map((l) => ({ ...l, studio_id: studioId })), { onConflict: 'studio_id,formule' });
  if (error) throw error;
  await journaliser('tarifs.modifies', 'studios', studioId, { tarifs: lignes });
}

// ---------- Photos (Storage, bucket public « studios ») ----------

// URL publique → chemin dans le bucket
const cheminPhoto = (url) => url.split(`/object/public/${BUCKET}/`)[1] ?? null;

// Envoie une photo (déjà compressée en JPEG) et renvoie son URL publique
export async function envoyerPhoto(studioId, fichier) {
  const chemin = `${studioId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(chemin, fichier, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
}

// Enregistre la liste ordonnée des photos (la 1re = couverture)
export const enregistrerPhotos = (studioId, photos) => modifierStudio(studioId, { photos }, 'studio.photos');

export async function supprimerFichiersPhotos(urls) {
  const chemins = urls.map(cheminPhoto).filter(Boolean);
  if (chemins.length) await supabase.storage.from(BUCKET).remove(chemins);
}

// Liste courte (filtres, listes déroulantes)
export async function listerStudiosResume() {
  const { data, error } = await supabase.from('studios').select('id, code, nom').order('code');
  if (error) throw error;
  return data;
}

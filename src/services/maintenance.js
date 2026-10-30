import { supabase } from '../lib/supabase.js';
import { journaliser } from './journal.js';

// Toutes les requêtes du module « Maintenance » (pannes)

const BUCKET = 'maintenance';

// statut : 'ouvertes' (à faire + en cours), 'terminee' ou '' (toutes)
export async function listerPannes({ statut = 'ouvertes', studioId = '' } = {}) {
  let requete = supabase.from('v_maintenances').select('*').order('created_at', { ascending: false }).limit(200);
  if (statut === 'ouvertes') requete = requete.neq('statut', 'terminee');
  else if (statut) requete = requete.eq('statut', statut);
  if (studioId) requete = requete.eq('studio_id', studioId);
  const { data, error } = await requete;
  if (error) throw error;
  return data;
}

// Coût des pannes résolues depuis une date (indicateur « coût du mois »)
export async function coutMaintenancesDepuis(depuis) {
  const { data, error } = await supabase.from('maintenances').select('cout').eq('statut', 'terminee').gte('resolu_le', depuis.toISOString());
  if (error) throw error;
  return data.reduce((t, m) => t + (m.cout ?? 0), 0);
}

// Photo déjà compressée (JPEG) → URL publique
export async function envoyerPhotoPanne(studioId, fichier) {
  const chemin = `${studioId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(chemin, fichier, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
}

export async function supprimerPhotosPanne(urls) {
  const chemins = urls.map((u) => u.split(`/object/public/${BUCKET}/`)[1]).filter(Boolean);
  if (chemins.length) await supabase.storage.from(BUCKET).remove(chemins);
}

export async function signalerPanne({ studioId, titre, description, priorite, photos }) {
  const { data: s } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from('maintenances')
    .insert({ studio_id: studioId, titre, description: description || null, priorite, photos, signale_par: s.session?.user.id ?? null })
    .select()
    .single();
  if (error) throw error;
  await journaliser('maintenance.signalee', 'maintenances', data.id, { titre, priorite });
  return data;
}

export async function prendreEnCharge(panne) {
  const { error } = await supabase.from('maintenances').update({ statut: 'en_cours' }).eq('id', panne.id);
  if (error) throw error;
  await journaliser('maintenance.en_cours', 'maintenances', panne.id, { titre: panne.titre });
}

export async function changerPriorite(panne, priorite) {
  const { error } = await supabase.from('maintenances').update({ priorite }).eq('id', panne.id);
  if (error) throw error;
  await journaliser('maintenance.priorite', 'maintenances', panne.id, { titre: panne.titre, priorite });
}

// Résolution (coût + dépense facultative) : fonction en base
export async function resoudrePanne(panne, { cout, notes, creerDepense }) {
  const { error } = await supabase.rpc('resoudre_maintenance', {
    p_id: panne.id, p_cout: cout, p_notes: notes || null, p_creer_depense: creerDepense,
  });
  if (error) throw error;
}

export async function supprimerPanne(panne) {
  const { error } = await supabase.from('maintenances').delete().eq('id', panne.id);
  if (error) throw error;
  await supprimerPhotosPanne(panne.photos ?? []);
  await journaliser('maintenance.supprimee', 'maintenances', panne.id, { titre: panne.titre });
}

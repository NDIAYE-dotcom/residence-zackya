import { supabase } from '../lib/supabase.js';
import { journaliser } from './journal.js';

// Toutes les requêtes du module « Clients »

export const TAILLE_PAGE = 50;

// Recherche par nom, email ou téléphone (chiffres seulement : « 77 123 » trouve +22177123…)
export async function rechercherClients({ recherche = '', listeNoire = false, page = 0 } = {}) {
  let requete = supabase
    .from('v_clients')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * TAILLE_PAGE, page * TAILLE_PAGE + TAILLE_PAGE - 1);

  const texte = recherche.replace(/[,()%*\\]/g, ' ').trim(); // caractères réservés du filtre « or »
  if (texte) {
    const conditions = [`full_name.ilike.%${texte}%`, `email.ilike.%${texte}%`];
    const chiffres = recherche.replace(/\D/g, '');
    if (chiffres.length >= 3) conditions.push(`phone.ilike.%${chiffres}%`);
    requete = requete.or(conditions.join(','));
  }
  if (listeNoire) requete = requete.eq('liste_noire', true);

  const { data, error, count } = await requete;
  if (error) throw error;
  return { clients: data, total: count ?? 0 };
}

export async function lireClient(id) {
  const { data, error } = await supabase.from('v_clients').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function historiqueClient(id) {
  const { data, error } = await supabase
    .from('v_reservations')
    .select('id, reference, studio_code, studio_nom, formule, date_debut, date_fin, statut, montant_total, remise, total_paye, reste_a_payer')
    .eq('client_id', id)
    .order('date_debut', { ascending: false });
  if (error) throw error;
  return data;
}

// Client déjà enregistré avec ce numéro (pour éviter les doublons)
export async function trouverParTelephone(phone, saufId = null) {
  let requete = supabase.from('clients').select('id, full_name').eq('phone', phone).limit(1);
  if (saufId) requete = requete.neq('id', saufId);
  const { data, error } = await requete;
  if (error) throw error;
  return data[0] ?? null;
}

export async function creerClient(valeurs) {
  const { data, error } = await supabase.from('clients').insert(valeurs).select().single();
  if (error) throw error;
  await journaliser('client.cree', 'clients', data.id, { nom: data.full_name });
  return data;
}

export async function modifierClient(id, valeurs, action = 'client.modifie') {
  const { data, error } = await supabase.from('clients').update(valeurs).eq('id', id).select().single();
  if (error) throw error;
  await journaliser(action, 'clients', id, valeurs);
  return data;
}

export const mettreEnListeNoire = (id, motif) =>
  modifierClient(id, { liste_noire: true, liste_noire_motif: motif, liste_noire_le: new Date().toISOString() }, 'client.liste_noire');

export const retirerDeListeNoire = (id) =>
  modifierClient(id, { liste_noire: false, liste_noire_motif: null, liste_noire_le: null }, 'client.liste_noire_retire');

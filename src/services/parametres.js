import { supabase } from '../lib/supabase.js';
import { journaliser } from './journal.js';

// Paramètres de la résidence (clé → valeur), gardés en mémoire après la 1re lecture
let cache = null;

export async function lireParametres() {
  if (cache) return cache;
  const { data, error } = await supabase.from('parametres').select('cle, valeur');
  if (error) throw error;
  cache = Object.fromEntries(data.map((p) => [p.cle, p.valeur]));
  return cache;
}

// À appeler après une modification dans le module Paramètres
export const viderCacheParametres = () => { cache = null; };

// ---------- Module Paramètres (admin) ----------

// valeurs : { cle: valeur } — crée ou met à jour chaque paramètre
export async function enregistrerParametres(valeurs) {
  const lignes = Object.entries(valeurs).map(([cle, valeur]) => ({ cle, valeur: String(valeur) }));
  const { error } = await supabase.from('parametres').upsert(lignes, { onConflict: 'cle' });
  if (error) throw error;
  viderCacheParametres();
  await journaliser('parametres.modifies', 'parametres', null, valeurs);
}

// Catégories de studios
export async function listerCategoriesStudios() {
  const { data, error } = await supabase.from('categories').select('*, studios(count)').order('nom');
  if (error) throw error;
  return data.map((c) => ({ ...c, nb_studios: c.studios?.[0]?.count ?? 0 }));
}

export async function enregistrerCategorieStudio(categorie) {
  const valeurs = { nom: categorie.nom.trim(), description: categorie.description?.trim() || null, capacite: Number(categorie.capacite) || 2 };
  const requete = categorie.id
    ? supabase.from('categories').update(valeurs).eq('id', categorie.id)
    : supabase.from('categories').insert(valeurs);
  const { error } = await requete;
  if (error) throw error;
  await journaliser('parametres.categorie_studio', 'categories', categorie.id ?? null, valeurs);
}

// Les studios de cette catégorie deviennent « Sans catégorie »
export async function supprimerCategorieStudio(categorie) {
  const { error } = await supabase.from('categories').delete().eq('id', categorie.id);
  if (error) throw error;
  await journaliser('parametres.categorie_studio_supprimee', 'categories', categorie.id, { nom: categorie.nom });
}

// Catégories de dépenses (toutes, y compris masquées) avec leur nombre d'utilisations
export async function listerCategoriesDepensesAdmin() {
  const [{ data: cats, error }, { data: deps, error: e2 }] = await Promise.all([
    supabase.from('categories_depenses').select('*').order('ordre').order('nom'),
    supabase.from('depenses').select('categorie'),
  ]);
  if (error) throw error;
  if (e2) throw e2;
  const usage = deps.reduce((m, d) => ({ ...m, [d.categorie]: (m[d.categorie] ?? 0) + 1 }), {});
  return cats.map((c) => ({ ...c, nb_depenses: usage[c.nom] ?? 0 }));
}

export async function modifierCategorieDepense(nom, valeurs) {
  const { error } = await supabase.from('categories_depenses').update(valeurs).eq('nom', nom);
  if (error) throw error;
}

export async function renommerCategorieDepense(ancien, nouveau) {
  const { error } = await supabase.rpc('renommer_categorie_depense', { p_ancien: ancien, p_nouveau: nouveau });
  if (error) throw error;
}

export async function supprimerCategorieDepense(nom) {
  const { data, error } = await supabase.from('categories_depenses').delete().eq('nom', nom).select();
  if (error) throw error;
  if (!data.length) throw Object.assign(new Error('Catégorie utilisée par des dépenses : masquez-la plutôt.'), { code: 'FONCTION' });
}

// ---------- Journal d'activité (admin) ----------

export const TAILLE_PAGE_JOURNAL = 50;

export async function listerJournal({ module = '', utilisateur = '', du = '', au = '', page = 0 } = {}) {
  let requete = supabase
    .from('journal_activite')
    .select('id, action, cible_table, cible_id, details, created_at, auteur:profiles(full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * TAILLE_PAGE_JOURNAL, page * TAILLE_PAGE_JOURNAL + TAILLE_PAGE_JOURNAL - 1);
  if (module) requete = requete.like('action', `${module}.%`);
  if (utilisateur) requete = requete.eq('user_id', utilisateur);
  if (du) requete = requete.gte('created_at', new Date(`${du}T00:00:00`).toISOString());
  if (au) requete = requete.lte('created_at', new Date(`${au}T23:59:59.999`).toISOString());
  const { data, error, count } = await requete;
  if (error) throw error;
  return { lignes: data, total: count ?? 0 };
}

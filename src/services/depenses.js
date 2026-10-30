import { supabase } from '../lib/supabase.js';
import { journaliser } from './journal.js';

// Toutes les requêtes du module « Dépenses »

// « 2026-10 » → bornes du mois (dates « AAAA-MM-JJ »)
export const bornesMois = (mois) => {
  const [a, m] = mois.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const dernier = new Date(a, m, 0).getDate();
  return { du: `${a}-${pad(m)}-01`, au: `${a}-${pad(m)}-${pad(dernier)}` };
};

export async function listerDepenses(mois) {
  const { du, au } = bornesMois(mois);
  const { data, error } = await supabase
    .from('depenses')
    .select('*, studio:studios(code, nom), par:profiles(full_name)')
    .gte('date_depense', du)
    .lte('date_depense', au)
    .order('date_depense', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Total d'un mois (comparaison avec le mois précédent)
export async function totalDepensesMois(mois) {
  const { du, au } = bornesMois(mois);
  const { data, error } = await supabase.from('depenses').select('montant').gte('date_depense', du).lte('date_depense', au);
  if (error) throw error;
  return data.reduce((t, d) => t + d.montant, 0);
}

export async function listerCategoriesDepenses() {
  const { data, error } = await supabase.from('categories_depenses').select('nom').eq('actif', true).order('ordre').order('nom');
  if (error) throw error;
  return data.map((c) => c.nom);
}

export async function ajouterCategorieDepense(nom) {
  const { error } = await supabase.from('categories_depenses').insert({ nom });
  if (error && error.code !== '23505') throw error; // déjà existante : rien à faire
}

export async function creerDepense(valeurs) {
  const { data: s } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from('depenses').insert({ ...valeurs, saisi_par: s.session?.user.id ?? null }).select().single();
  if (error) throw error;
  await journaliser('depense.creee', 'depenses', data.id, { libelle: data.libelle, montant: data.montant });
  return data;
}

export async function modifierDepense(id, valeurs) {
  const { data, error } = await supabase.from('depenses').update(valeurs).eq('id', id).select().single();
  if (error) throw error;
  await journaliser('depense.modifiee', 'depenses', id, valeurs);
  return data;
}

export async function supprimerDepense(depense) {
  const { error } = await supabase.from('depenses').delete().eq('id', depense.id);
  if (error) throw error;
  await journaliser('depense.supprimee', 'depenses', depense.id, { libelle: depense.libelle, montant: depense.montant, date: depense.date_depense });
}

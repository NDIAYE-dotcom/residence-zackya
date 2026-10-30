import { supabase } from '../lib/supabase.js';

// Toutes les requêtes de l'inventaire par studio

export async function listerInventaire(studioId) {
  const { data, error } = await supabase.from('inventaire').select('*').eq('studio_id', studioId).order('article');
  if (error) throw error;
  return data;
}

// Nombre d'articles « à remplacer » par studio (pastilles d'alerte)
export async function alertesInventaire() {
  const { data, error } = await supabase.from('inventaire').select('studio_id').eq('etat', 'a_remplacer');
  if (error) throw error;
  return data.reduce((m, l) => ({ ...m, [l.studio_id]: (m[l.studio_id] ?? 0) + 1 }), {});
}

export async function ajouterArticle(studioId, { article, quantite = 1, etat = 'bon', notes = null }) {
  const { data, error } = await supabase
    .from('inventaire').insert({ studio_id: studioId, article: article.trim(), quantite, etat, notes }).select().single();
  if (error) throw error;
  return data;
}

export async function modifierArticle(id, valeurs) {
  const { data, error } = await supabase.from('inventaire').update(valeurs).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function supprimerArticle(id) {
  const { error } = await supabase.from('inventaire').delete().eq('id', id);
  if (error) throw error;
}

// Copie la liste d'articles d'un autre studio (les articles déjà présents sont ignorés)
export async function copierInventaire(depuisStudioId, versStudioId) {
  const source = await listerInventaire(depuisStudioId);
  if (!source.length) return 0;
  const { data, error } = await supabase
    .from('inventaire')
    .upsert(source.map((a) => ({ studio_id: versStudioId, article: a.article, quantite: a.quantite, etat: 'bon' })),
      { onConflict: 'studio_id,article', ignoreDuplicates: true })
    .select();
  if (error) throw error;
  return data.length;
}

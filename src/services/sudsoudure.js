import { supabase } from '../lib/supabase.js';
import { lireParametres, enregistrerParametres } from './parametres.js';
import { journaliser } from './journal.js';

// Factures et devis de SUDSOUDURE ENTREPRISE (admin) — séparés de la comptabilité de Zaquia Résidence

// Coordonnées de l'entreprise : paramètres « sud_* » (en-tête et pied des PDF)
const CHAMPS_ENTREPRISE = ['nom', 'activite', 'gerant', 'telephones', 'adresse', 'email', 'ninea', 'rccm', 'conditions'];

export async function lireEntreprise() {
  const p = await lireParametres();
  return Object.fromEntries(CHAMPS_ENTREPRISE.map((c) => [c, p[`sud_${c}`] ?? '']));
}

export async function enregistrerEntreprise(entreprise) {
  await enregistrerParametres(Object.fromEntries(CHAMPS_ENTREPRISE.map((c) => [`sud_${c}`, (entreprise[c] ?? '').trim()])));
}

export async function listerDocumentsSud() {
  const { data, error } = await supabase
    .from('sud_documents')
    .select('*')
    .order('date_document', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Création ou modification ; la base calcule les totaux et le numéro
export async function enregistrerDocumentSud(id, valeurs) {
  const requete = id
    ? supabase.from('sud_documents').update(valeurs).eq('id', id)
    : supabase.from('sud_documents').insert(valeurs);
  const { data, error } = await requete.select().single();
  if (error) throw error;
  await journaliser(id ? 'sud.document_modifie' : 'sud.document_cree', 'sud_documents', data.id,
    { numero: data.numero, client: data.client_nom, total: data.total_ttc });
  return data;
}

export async function supprimerDocumentSud(document) {
  const { error } = await supabase.from('sud_documents').delete().eq('id', document.id);
  if (error) throw error;
  await journaliser('sud.document_supprime', 'sud_documents', document.id, { numero: document.numero, client: document.client_nom });
}

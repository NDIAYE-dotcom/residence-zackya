import { supabase } from '../lib/supabase.js';
import { journaliser } from './journal.js';

// Toutes les requêtes du module « Personnel » (admin)

export async function listerPersonnel() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, actif, created_at')
    .order('actif', { ascending: true }) // comptes en attente d'activation en premier
    .order('full_name');
  if (error) throw error;
  return data;
}

// action : nom dans le journal (personnel.modifie, personnel.role, personnel.active, personnel.desactive)
export async function modifierEmploye(id, valeurs, action = 'personnel.modifie') {
  const { data, error } = await supabase.from('profiles').update(valeurs).eq('id', id).select().single();
  if (error) throw error;
  await journaliser(action, 'profiles', id, valeurs);
  return data;
}

// Appel de l'Edge Function « creer-employe » (seule à détenir la clé service_role)
async function appelerFonction(corps) {
  const { data, error } = await supabase.functions.invoke('creer-employe', { body: corps });
  if (!error) return data;

  let message = '';
  try { message = (await error.context.json()).erreur; } catch { /* réponse non JSON */ }
  if (!message) {
    message = error.context?.status === 404
      ? 'La fonction « creer-employe » n’est pas déployée sur Supabase.'
      : 'Le service de gestion des comptes ne répond pas. Réessayez.';
  }
  throw Object.assign(new Error(message), { code: 'FONCTION' });
}

// { email, password, full_name, phone, role, actif }
export const creerEmploye = (employe) => appelerFonction({ action: 'creer', ...employe });

export const changerMotDePasse = (id, password) =>
  appelerFonction({ action: 'changer_mot_de_passe', id, password });

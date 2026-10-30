import { supabase } from '../lib/supabase.js';
import { enregistrerParametres } from './parametres.js';

// Sauvegarde manuelle (admin) : toutes les tables dans un seul fichier JSON
// (l'offre gratuite Supabase ne donne pas accès aux sauvegardes automatiques)

export const TABLES_SAUVEGARDE = [
  'parametres', 'categories', 'studios', 'tarifs', 'clients', 'reservations', 'paiements',
  'depenses', 'categories_depenses', 'clotures_caisse', 'taches_menage', 'maintenances',
  'inventaire', 'profiles', 'journal_activite',
];
const PAQUET = 1000; // le serveur renvoie au plus 1 000 lignes par requête

// surProgression(table, index, total) pour afficher l'avancement
export async function exporterSauvegarde(surProgression) {
  const tables = {};
  for (const [i, table] of TABLES_SAUVEGARDE.entries()) {
    surProgression?.(table, i, TABLES_SAUVEGARDE.length);
    let lignes = [];
    for (let page = 0; ; page += 1) {
      const { data, error } = await supabase.from(table).select('*').range(page * PAQUET, page * PAQUET + PAQUET - 1);
      if (error) throw error;
      lignes = lignes.concat(data);
      if (data.length < PAQUET) break;
    }
    tables[table] = lignes;
  }
  const dateSauvegarde = new Date().toISOString();
  await enregistrerParametres({ derniere_sauvegarde: dateSauvegarde });
  return { application: 'Zaquia Résidence', version: 1, date: dateSauvegarde, tables };
}

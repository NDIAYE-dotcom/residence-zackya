// Reçu PDF : chargement des données puis ouverture dans un nouvel onglet
// jsPDF est chargé seulement au moment d'imprimer (l'application reste légère).
import { lirePaiementPourRecu } from '../services/paiements.js';
import { lireParametres } from '../services/parametres.js';
import { dessinerRecu } from './recuDessin.js';

async function imageEnDataUrl(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(lecteur.result);
    lecteur.onerror = reject;
    lecteur.readAsDataURL(blob);
  });
}

/**
 * Ouvre le reçu PDF d'un paiement dans un nouvel onglet (imprimer, enregistrer, partager).
 * L'onglet est ouvert tout de suite, sinon le navigateur le bloquerait après le chargement.
 */
export async function imprimerRecu(paiementId) {
  const onglet = window.open('', '_blank');
  try {
    const [{ jsPDF }, donnees, params, logo] = await Promise.all([
      import('jspdf'),
      lirePaiementPourRecu(paiementId),
      lireParametres(),
      imageEnDataUrl('/logo-zaquia.png'),
    ]);
    const doc = dessinerRecu(jsPDF, donnees, params, logo);
    if (onglet) onglet.location.href = doc.output('bloburl');
    else doc.save(`recu-${donnees.paiement.numero_recu}.pdf`);
  } catch (err) {
    onglet?.close();
    throw err;
  }
}

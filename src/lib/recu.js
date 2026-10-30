// Reçu PDF : chargement des données puis ouverture dans un nouvel onglet
// jsPDF est chargé seulement au moment d'imprimer (l'application reste légère).
import { lirePaiementPourRecu } from '../services/paiements.js';
import { lireParametres } from '../services/parametres.js';
import { dessinerRecu } from './recuDessin.js';

// Logo réduit à la taille utile (40 mm ≈ 320 px) sur fond blanc, en JPEG : reçu léger (≈ 50 Ko au lieu de 6 Mo)
function logoAllege(url, taille = 320) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = taille;
      canvas.height = taille;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // le reçu est blanc derrière le logo
      ctx.fillRect(0, 0, taille, taille);
      ctx.drawImage(img, 0, 0, taille, taille);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = reject;
    img.src = url;
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
      logoAllege('/logo-zaquia.png'),
    ]);
    const doc = dessinerRecu(jsPDF, donnees, params, logo);
    if (onglet) onglet.location.href = doc.output('bloburl');
    else doc.save(`recu-${donnees.paiement.numero_recu}.pdf`);
  } catch (err) {
    onglet?.close();
    throw err;
  }
}

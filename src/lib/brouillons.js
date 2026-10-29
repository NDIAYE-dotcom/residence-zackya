// Brouillons de formulaires gardés dans le navigateur (localStorage)
// Clé : « zaquia:brouillon:<id employé>:<nom du formulaire> »

export const PREFIXE_BROUILLON = 'zaquia:brouillon:';
const DUREE_VIE_MS = 24 * 3600 * 1000; // un brouillon de plus de 24 h est oublié

export function lireBrouillon(cle) {
  try {
    const brut = localStorage.getItem(cle);
    if (!brut) return null;
    const { valeur, le } = JSON.parse(brut);
    if (Date.now() - le > DUREE_VIE_MS) { localStorage.removeItem(cle); return null; }
    return valeur;
  } catch {
    return null;
  }
}

export function ecrireBrouillon(cle, valeur) {
  try { localStorage.setItem(cle, JSON.stringify({ valeur, le: Date.now() })); } catch { /* stockage plein ou bloqué */ }
}

export function supprimerBrouillon(cle) {
  try { localStorage.removeItem(cle); } catch { /* ignoré */ }
}

// À la déconnexion : aucun brouillon (données clients) ne reste sur l'appareil
export function effacerTousLesBrouillons() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIXE_BROUILLON)).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignoré */ }
}

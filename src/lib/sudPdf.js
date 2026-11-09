// PDF des factures et devis de SUDSOUDURE ENTREPRISE (A4 portrait)
// Couleurs de la marque SUDSOUDURE (logo jaune / noir / bleu nuit), distinctes de la charte Zaquia.
import { nombreEnLettres } from './nombres.js';

const JAUNE = [245, 214, 0];
const NOIR = [24, 24, 24];
const NUIT = [30, 41, 59];
const GRIS = [95, 99, 110];
const CLAIR = [248, 247, 240];

// Les polices standard du PDF ne connaissent pas certains caractères (espaces fines, apostrophe typographique)
const propre = (t = '') => String(t).replace(/[  ]/g, ' ').replace(/[’‘]/g, "'");
const nombre = (n) => propre(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n));
const fcfa = (n) => `${nombre(n)} F`;
const dateFr = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Totaux affichés (mêmes règles que la base : montant de ligne arrondi, TVA 18 % arrondie)
export function totauxSud({ lignes = [], remise = 0, tva = false }) {
  const brut = lignes.reduce((t, l) => t + Math.round((Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0)), 0);
  const ht = brut - (Number(remise) || 0);
  const montantTva = tva ? Math.round(ht * 0.18) : 0;
  return { brut, ht, tva: montantTva, ttc: ht + montantTva };
}

export function dessinerDocumentSud(jsPDF, d, e, images) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }); // 210 × 297 mm
  const M = 14;
  const DROITE = 210 - M;
  const BAS = 262; // au-delà : nouvelle page (pied de page en dessous)
  const facture = d.type === 'facture';
  const t = totauxSud(d);

  const police = (style, taille, couleur = NOIR) => { doc.setFont('helvetica', style); doc.setFontSize(taille); doc.setTextColor(...couleur); };
  const texte = (s, x, y, options) => doc.text(propre(s), x, y, options);

  // ---- En-tête : logo + coordonnées ----
  doc.setFillColor(...JAUNE); doc.rect(0, 0, 210, 4, 'F');
  doc.addImage(images.logo, 'PNG', M, 9, 64, 26.3, 'logo', 'FAST');
  let y = 13;
  police('bold', 13); texte(e.nom || 'SUDSOUDURE ENTREPRISE', DROITE, y, { align: 'right' });
  police('normal', 9, GRIS);
  for (const ligne of [
    e.activite,
    e.gerant && `Gérant : ${e.gerant}`,
    e.telephones && `Tél : ${e.telephones}`,
    e.adresse,
    e.email,
    [e.ninea && `NINEA : ${e.ninea}`, e.rccm && `RCCM : ${e.rccm}`].filter(Boolean).join(' · '),
  ].filter(Boolean)) { y += 4.6; texte(ligne, DROITE, y, { align: 'right' }); }

  y = Math.max(y + 5, 41);
  doc.setDrawColor(...NOIR); doc.setLineWidth(0.6); doc.line(M, y, DROITE, y);

  // ---- Titre, numéro, date ----
  y += 12;
  police('bold', 24); texte(facture ? 'FACTURE' : 'DEVIS', M, y);
  doc.setFillColor(...CLAIR); doc.setDrawColor(...JAUNE); doc.setLineWidth(0.8);
  doc.roundedRect(126, y - 10, DROITE - 126, 16, 2, 2, 'FD');
  police('bold', 11); texte(`N° ${d.numero}`, 130, y - 3.5);
  police('normal', 10, GRIS); texte(`Date : ${dateFr(d.date_document)}`, 130, y + 2.5);

  // ---- Client ----
  y += 12;
  police('bold', 8.5, GRIS); texte(facture ? 'FACTURÉ À' : 'CLIENT', M, y);
  y += 5.5;
  police('bold', 12); texte(d.client_nom, M, y);
  police('normal', 10, NUIT);
  if (d.client_telephone) { y += 5; texte(`Tél : ${d.client_telephone}`, M, y); }
  if (d.client_adresse) for (const l of doc.splitTextToSize(propre(d.client_adresse), 110)) { y += 5; texte(l, M, y); }
  if (d.objet) {
    y += 8;
    police('bold', 10); texte('Objet :', M, y);
    police('normal', 10, NUIT);
    const lignesObjet = doc.splitTextToSize(propre(d.objet), DROITE - M - 16);
    lignesObjet.forEach((l, i) => texte(l, M + 15, y + i * 4.8));
    y += (lignesObjet.length - 1) * 4.8;
  }

  // ---- Tableau des prestations ----
  const COL = { n: M, des: M + 10, qte: 120, unite: 136, pu: 154, mt: DROITE };
  const LARGEUR_DES = COL.qte - COL.des - 4;
  const entete = (yy) => {
    doc.setFillColor(...NOIR); doc.rect(M, yy, DROITE - M, 8, 'F');
    police('bold', 8.5, JAUNE);
    texte('N°', COL.n + 2, yy + 5.4);
    texte('DÉSIGNATION', COL.des, yy + 5.4);
    texte('QTÉ', COL.qte + 12, yy + 5.4, { align: 'right' });
    texte('UNITÉ', COL.unite + 1, yy + 5.4);
    texte('P.U.', COL.pu + 18, yy + 5.4, { align: 'right' });
    texte('MONTANT', COL.mt - 2, yy + 5.4, { align: 'right' });
    return yy + 8;
  };
  y = entete(y + 8);
  d.lignes.forEach((l, i) => {
    const lignesTexte = doc.splitTextToSize(propre(l.designation), LARGEUR_DES);
    const h = Math.max(7.5, lignesTexte.length * 4.4 + 3.2);
    if (y + h > BAS) { doc.addPage(); y = entete(18); }
    if (i % 2) { doc.setFillColor(...CLAIR); doc.rect(M, y, DROITE - M, h, 'F'); }
    police('normal', 9.5);
    texte(String(i + 1), COL.n + 2, y + 5);
    lignesTexte.forEach((lt, k) => texte(lt, COL.des, y + 5 + k * 4.4));
    texte(nombre(l.quantite), COL.qte + 12, y + 5, { align: 'right' });
    texte(l.unite || '', COL.unite + 1, y + 5);
    texte(nombre(l.prix_unitaire), COL.pu + 18, y + 5, { align: 'right' });
    police('bold', 9.5); texte(nombre(Math.round(l.quantite * l.prix_unitaire)), COL.mt - 2, y + 5, { align: 'right' });
    y += h;
  });
  doc.setDrawColor(...NOIR); doc.setLineWidth(0.4); doc.line(M, y, DROITE, y);

  // ---- Totaux ----
  const lignesTotaux = [];
  if (d.remise > 0) lignesTotaux.push(['Total brut', fcfa(t.brut)], ['Remise', `- ${fcfa(d.remise)}`]);
  if (d.tva) lignesTotaux.push(['Total HT', fcfa(t.ht)], ['TVA 18 %', fcfa(t.tva)]);
  if (y + 10 + lignesTotaux.length * 6.5 + 12 > BAS) { doc.addPage(); y = 18; }
  y += 4;
  for (const [libelle, valeur] of lignesTotaux) {
    y += 6.5;
    police('normal', 10, GRIS); texte(libelle, 128, y);
    police('normal', 10); texte(valeur, DROITE - 2, y, { align: 'right' });
  }
  y += 3;
  doc.setFillColor(...JAUNE); doc.rect(124, y, DROITE - 124, 10, 'F');
  police('bold', 11.5); texte(facture ? 'NET À PAYER' : 'TOTAL', 128, y + 6.8);
  texte(fcfa(t.ttc), DROITE - 2, y + 6.8, { align: 'right' });
  y += 18;

  // ---- Montant en lettres ----
  const phrase = `${facture ? 'Arrêtée la présente facture' : 'Arrêté le présent devis'} à la somme de : `
    + `${majuscule(nombreEnLettres(t.ttc))} francs CFA${d.tva ? ' TTC' : ''}.`;
  police('italic', 10, NUIT);
  const lignesPhrase = doc.splitTextToSize(propre(phrase), DROITE - M);
  if (y + lignesPhrase.length * 5 > BAS) { doc.addPage(); y = 18; }
  lignesPhrase.forEach((l, i) => texte(l, M, y + i * 5));
  y += lignesPhrase.length * 5 + 4;

  // ---- Notes / conditions ----
  if (d.notes) {
    const lignesNotes = doc.splitTextToSize(propre(d.notes), 112);
    if (y + 6 + lignesNotes.length * 4.6 > BAS) { doc.addPage(); y = 18; }
    police('bold', 9, GRIS); texte('Conditions et remarques', M, y + 2);
    police('normal', 9, NUIT); lignesNotes.forEach((l, i) => texte(l, M, y + 7 + i * 4.6));
  }

  // ---- Signature et tampon (à droite, sous les totaux) ----
  if (y + 48 > BAS + 8) { doc.addPage(); y = 18; }
  police('bold', 10); texte('Le Gérant', 168, y + 2, { align: 'center' });
  if (e.gerant) { police('normal', 9, GRIS); texte(e.gerant, 168, y + 6.5, { align: 'center' }); }
  if (images.tampon) doc.addImage(images.tampon, 'PNG', 146, y + 7, 44, 44, 'tampon', 'FAST');

  // ---- Pied de page (toutes les pages) ----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFillColor(...JAUNE); doc.rect(0, 293, 210, 4, 'F');
    doc.setDrawColor(...NOIR); doc.setLineWidth(0.3); doc.line(M, 280, DROITE, 280);
    police('normal', 8, GRIS);
    texte([e.nom, e.telephones && `Tél : ${e.telephones}`, e.adresse].filter(Boolean).join(' · '), M, 285);
    texte(`${d.numero} · page ${p}/${pages}`, DROITE, 285, { align: 'right' });
  }
  return doc;
}

// Image du dossier public → data URL (jsPDF a besoin des octets)
const versDataURL = async (url) => {
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`Image introuvable : ${url}`);
  const blob = await reponse.blob();
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(lecteur.result);
    lecteur.onerror = reject;
    lecteur.readAsDataURL(blob);
  });
};

// Construit le PDF → { blob, nom } (jsPDF chargé seulement à ce moment-là)
export async function genererPdfSud(document, entreprise) {
  const [{ jsPDF }, logo, tampon] = await Promise.all([
    import('jspdf'),
    versDataURL('/sud/logo.png'),
    document.tampon ? versDataURL('/sud/tampon.png') : null,
  ]);
  const pdf = dessinerDocumentSud(jsPDF, document, entreprise, { logo, tampon });
  return { blob: pdf.output('blob'), nom: `${document.numero}.pdf` };
}

// Dessin du reçu PDF au format du carnet de reçus Zaquia Résidence (A5 paysage)
// Module sans accès à Supabase : reçoit toutes les données en paramètre.
import { nombreEnLettres } from './nombres.js';
import { FORMULES, MODES_PAIEMENT, TYPES_PAIEMENT, signeCA } from './format.js';

// Couleurs lues dans index.css : une seule source pour l'écran et le PDF
const couleur = (variable) => {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(variable).trim().replace('#', '');
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
};

// Les polices standard du PDF ne connaissent pas certains caractères (espaces fines, apostrophe typographique)
const propre = (t = '') => String(t).replace(/[\u202f\u00a0]/g, ' ').replace(/[’‘]/g, "'");
const montant = (n) => propre(`${new Intl.NumberFormat('fr-FR').format(n)} FCFA`);
const jourMois = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export function dessinerRecu(jsPDF, { paiement, paiements }, params, logo) {
  const BLEU = couleur('--bleu');
  const ROUGE = couleur('--rouge');
  const CLAIR = couleur('--bleu-clair');
  const TEXTE = couleur('--texte');

  const r = paiement.reservation;
  const net = r.montant_total - r.remise;
  // Avance = tout ce que le client avait payé jusqu'à ce reçu inclus (hors cautions)
  const avance = paiements
    .filter((p) => p.numero_recu <= paiement.numero_recu)
    .reduce((t, p) => t + signeCA(p.type) * p.montant, 0);
  const reste = Math.max(0, net - avance);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' }); // 210 × 148 mm
  const etiquette = (texte, x, y, taille = 14) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(taille); doc.setTextColor(...BLEU); doc.text(propre(texte), x, y);
  };
  const valeur = (texte, x, y, taille = 12) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(taille); doc.setTextColor(...TEXTE); doc.text(propre(texte), x, y);
  };
  const pointilles = (x1, x2, y) => {
    doc.setDrawColor(...BLEU); doc.setLineWidth(0.35); doc.setLineDashPattern([0.4, 1], 0);
    doc.line(x1, y, x2, y);
    doc.setLineDashPattern([], 0);
  };

  // ---- Vague bleue et rouge en bas ----
  // (coins du bas arrondis comme le cadre)
  const vague = (decalage) => doc
    .moveTo(4, 134 - decalage).curveTo(60, 146 - decalage, 150, 128 - decalage, 206, 136 - decalage)
    .lineTo(206, 141).curveTo(206, 142.7, 204.7, 144, 203, 144)
    .lineTo(7, 144).curveTo(5.3, 144, 4, 142.7, 4, 141)
    .close().fill();
  doc.setFillColor(...ROUGE); vague(3.5);
  doc.setFillColor(...BLEU); vague(0);

  // ---- Logo (avant le cadre : son fond blanc ne doit pas masquer la bordure) ----
  doc.addImage(logo, logo.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG', 8, 3, 40, 40, 'logo', 'FAST'); // compressé

  // ---- Cadre ----
  doc.setDrawColor(...BLEU); doc.setLineWidth(0.9);
  doc.roundedRect(4, 4, 202, 140, 3, 3, 'S');

  // ---- En-tête : adresse | n° de reçu ----
  doc.setDrawColor(...ROUGE); doc.setLineWidth(0.8);
  doc.line(52, 10, 52, 36);
  etiquette(params.adresse ?? 'Ziguinchor', 58, 20, 13);
  etiquette(params.telephone ?? '', 58, 29, 13);

  doc.setDrawColor(...BLEU); doc.setLineWidth(0.7);
  doc.roundedRect(130, 10, 72, 22, 4, 4, 'S');
  etiquette('REÇU N°', 135, 24, 15);
  // Numéro centré dans sa case
  const num = String(paiement.numero_recu).padStart(5, '0');
  doc.setFillColor(...CLAIR);
  doc.roundedRect(166, 13, 33, 16, 3, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...TEXTE);
  doc.text(num, 182.5, 24, { align: 'center' });

  // ---- Date ----
  const [jj, mm, aaaa] = jourMois(paiement.created_at).split('/');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...BLEU);
  doc.text(`Date :  ${jj} / ${mm} / ${aaaa}`, 202, 44, { align: 'right' });

  // ---- Reçu de M ----
  etiquette('Reçu de M', 10, 56);
  pointilles(40, 202, 57);
  valeur(r.client?.full_name ?? '', 43, 55.5, 13);

  // ---- La somme de (en lettres + en chiffres) ----
  etiquette('la somme de', 10, 70);
  doc.setFillColor(...CLAIR); doc.setDrawColor(...BLEU); doc.setLineWidth(0.7);
  doc.roundedRect(50, 61, 152, 24, 5, 5, 'FD');
  const enLettres = `${majuscule(nombreEnLettres(paiement.montant))} francs CFA`;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...TEXTE);
  doc.text(doc.splitTextToSize(propre(enLettres), 142).slice(0, 2), 55, 69.5);
  doc.setFontSize(13); doc.setTextColor(...ROUGE);
  doc.text(`(${montant(paiement.montant)})`, 197, 81, { align: 'right' });

  // ---- Pour ----
  etiquette('Pour', 10, 94);
  pointilles(24, 202, 95);
  pointilles(10, 202, 102.5);
  const pour = `${TYPES_PAIEMENT[paiement.type]} · Réservation ${r.reference} · ${r.studio?.nom ?? ''} (${r.studio?.code ?? ''}) · `
    + `${FORMULES[r.formule]} du ${jourMois(r.date_debut)} au ${jourMois(r.date_fin)}`;
  const regle = `Payé par ${MODES_PAIEMENT[paiement.mode]}${paiement.reference_transaction ? ` (n° ${paiement.reference_transaction})` : ''}`
    + `${paiement.recu?.full_name ? ` · encaissé par ${paiement.recu.full_name}` : ''}`;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...TEXTE);
  const lignesPour = doc.splitTextToSize(propre(pour), 175);
  doc.text(lignesPour[0], 27, 93.5);
  doc.text(propre([lignesPour.slice(1).join(' '), regle].filter(Boolean).join(' · ')).slice(0, 120), 10, 101);

  // ---- Avance / Reste ----
  doc.setDrawColor(...BLEU); doc.setLineWidth(0.7);
  doc.roundedRect(10, 106, 92, 24, 4, 4, 'S');
  etiquette('Avance :', 14, 115.5, 13);
  etiquette('Reste :', 14, 126, 13);
  doc.setFillColor(...CLAIR);
  doc.roundedRect(40, 109.5, 58, 8.5, 2, 2, 'F');
  doc.roundedRect(40, 120, 58, 8.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...TEXTE);
  doc.text(montant(avance), 95, 115.5, { align: 'right' });
  doc.setTextColor(...(reste > 0 ? ROUGE : TEXTE));
  doc.text(reste > 0 ? montant(reste) : 'Soldé', 95, 126, { align: 'right' });

  // ---- Signature - Cachet ----
  doc.setDrawColor(...BLEU); doc.setLineWidth(0.7);
  doc.roundedRect(108, 106, 94, 24, 4, 4, 'S');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...BLEU);
  doc.text('Signature - Cachet', 155, 111, { align: 'center' });
  doc.setDrawColor(...CLAIR); doc.setLineWidth(0.5);
  doc.roundedRect(112, 113, 86, 14, 2, 2, 'S');

  return doc;
}

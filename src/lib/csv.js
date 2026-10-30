// Export CSV lisible directement par Excel (séparateur « ; », accents conservés)

const cellule = (v) => {
  const t = v == null ? '' : String(v);
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

// colonnes : [{ titre, valeur: (ligne) => … }]
export function telechargerCSV(nomFichier, colonnes, lignes) {
  const contenu = [
    colonnes.map((c) => cellule(c.titre)).join(';'),
    ...lignes.map((l) => colonnes.map((c) => cellule(c.valeur(l))).join(';')),
  ].join('\r\n');
  const blob = new Blob([`\ufeff${contenu}`], { type: 'text/csv;charset=utf-8' }); // BOM : accents corrects dans Excel
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(url);
}

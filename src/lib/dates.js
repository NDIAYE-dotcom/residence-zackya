// Dates de séjour (Ziguinchor = UTC+0, comme les appareils du personnel)

const pad = (n) => String(n).padStart(2, '0');

// Date → valeur d'un <input type="datetime-local"> (« 2026-11-03T18:00 »)
export const versChampDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Date → valeur d'un <input type="date"> (« 2026-11-03 »)
export const versChampJour = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Même jour que « date », à l'heure « HH:MM »
const aHeure = (date, hhmm = '00:00') => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m || 0, 0, 0);
  return d;
};

const ajouterJours = (date, jours) => { const d = new Date(date); d.setDate(d.getDate() + jours); return d; };
const ajouterHeures = (date, heures) => new Date(new Date(date).getTime() + heures * 3600 * 1000);

// Prochain quart d'heure (ex. 14:07 → 14:15)
export const prochainQuartDHeure = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil((d.getMinutes() + 1) / 15) * 15);
  return d;
};

/**
 * Arrivée proposée selon la formule, le jour de « base » :
 * nuitée → heure de début de nuitée (18:00), semaine / mois → heure de check-in (14:00),
 * heure / demi-journée / journée → maintenant. Jamais dans le passé.
 */
export function debutParDefaut(formule, params = {}, base = new Date()) {
  const maintenant = prochainQuartDHeure();
  let d;
  if (formule === 'nuitee') d = aHeure(base, params.nuitee_debut ?? '18:00');
  else if (formule === 'semaine' || formule === 'mois') d = aHeure(base, params.heure_checkin ?? '14:00');
  else d = base > maintenant ? new Date(base) : maintenant;
  return d < maintenant ? maintenant : d;
}

/**
 * Départ calculé pour « quantite » unités de la formule :
 * nuitée → N nuits plus tard à l'heure de fin de nuitée (12:00),
 * semaine / mois → 7N / 30N jours plus tard à l'heure de check-out (12:00).
 */
export function calculerFin(formule, debut, quantite = 1, params = {}) {
  const q = Math.max(1, Number(quantite) || 1);
  switch (formule) {
    case 'heure': return ajouterHeures(debut, q);
    case 'demi_journee': return ajouterHeures(debut, 6 * q);
    case 'journee': return ajouterHeures(debut, 12 * q);
    case 'nuitee': return aHeure(ajouterJours(debut, q), params.nuitee_fin ?? '12:00');
    case 'semaine': return aHeure(ajouterJours(debut, 7 * q), params.heure_checkout ?? '12:00');
    case 'mois': return aHeure(ajouterJours(debut, 30 * q), params.heure_checkout ?? '12:00');
    default: return ajouterHeures(debut, q);
  }
}

// « lun. 3 nov., 18:00 »
export const formatJourHeure = (d) =>
  new Date(d).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// Durée lisible : « 2 j 18 h », « 5 h 30 »
export function formatDuree(debut, fin) {
  const minutes = Math.round((new Date(fin) - new Date(debut)) / 60000);
  const j = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (j) return `${j} j${h ? ` ${h} h` : ''}`;
  return `${h} h${m ? ` ${pad(m)}` : ''}`;
}

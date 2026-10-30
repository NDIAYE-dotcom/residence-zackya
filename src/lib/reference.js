// Référence de réservation telle que collée par le client → format officiel
// « zq 261031 0012 », « ZQ2610310012 », « zq-261031-0012 » → « ZQ-261031-0012 »
export function normaliserReference(saisie = '') {
  const brut = saisie.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = brut.match(/^ZQ(\d{6})(\d{4,})$/);
  return m ? `ZQ-${m[1]}-${m[2]}` : saisie.toUpperCase().trim();
}

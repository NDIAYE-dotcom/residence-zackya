// Téléphones sénégalais : mobiles 70/75/76/77/78 et fixes 33, avec ou sans +221

// Renvoie « +221XXXXXXXXX » si le numéro est valide, sinon null
export const normaliserTelephone = (saisie = '') => {
  let n = saisie.replace(/[\s.\-()]/g, '');
  if (n.startsWith('+221')) n = n.slice(4);
  else if (n.startsWith('00221')) n = n.slice(5);
  return /^(7[05678]|33)\d{7}$/.test(n) ? `+221${n}` : null;
};

export const telephoneValide = (saisie) => normaliserTelephone(saisie) !== null;

// « +221771234567 » → « +221 77 123 45 67 »
export const formatTelephone = (tel) => {
  const n = normaliserTelephone(tel ?? '');
  if (!n) return tel ?? '';
  const l = n.slice(4);
  return `+221 ${l.slice(0, 2)} ${l.slice(2, 5)} ${l.slice(5, 7)} ${l.slice(7)}`;
};

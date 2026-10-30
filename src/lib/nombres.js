// Montant en toutes lettres (reçus) : 25 000 → « vingt-cinq mille »

const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

// 0 à 99
function moinsDeCent(n) {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (d === 7 || d === 9) { // 70-79 et 90-99 : soixante-dix…, quatre-vingt-dix…
    const reste = n - (d === 7 ? 60 : 80);
    return d === 7 && reste === 11 ? 'soixante et onze' : `${DIZAINES[d]}-${UNITES[reste]}`;
  }
  if (u === 0) return d === 8 ? 'quatre-vingts' : DIZAINES[d];
  if (u === 1 && d !== 8) return `${DIZAINES[d]} et un`;
  return `${DIZAINES[d]}-${UNITES[u]}`;
}

// 0 à 999 ; « final » = pas suivi de « mille » (cents / quatre-vingts gardent leur s)
function moinsDeMille(n, final) {
  const c = Math.floor(n / 100);
  const r = n % 100;
  let texte = '';
  if (c > 0) texte = c === 1 ? 'cent' : `${UNITES[c]} cent${r === 0 && final ? 's' : ''}`;
  if (r > 0) {
    let t = moinsDeCent(r);
    if (!final && t === 'quatre-vingts') t = 'quatre-vingt';
    texte = texte ? `${texte} ${t}` : t;
  }
  return texte;
}

export function nombreEnLettres(nombre) {
  const n = Math.floor(Math.abs(Number(nombre) || 0));
  if (n === 0) return 'zéro';
  const milliards = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const milliers = Math.floor((n % 1e6) / 1000);
  const reste = n % 1000;
  const parties = [];
  if (milliards) parties.push(`${moinsDeMille(milliards, true)} milliard${milliards > 1 ? 's' : ''}`);
  if (millions) parties.push(`${moinsDeMille(millions, true)} million${millions > 1 ? 's' : ''}`);
  if (milliers) parties.push(milliers === 1 ? 'mille' : `${moinsDeMille(milliers, false)} mille`);
  if (reste) parties.push(moinsDeMille(reste, true));
  return parties.join(' ');
}

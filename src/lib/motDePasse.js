// Génère un mot de passe facile à dicter (pas de 0/O, 1/l/I) : ex. « Zq7k-m4Tx-9pRa »
const CARACTERES = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function genererMotDePasse() {
  const valeurs = crypto.getRandomValues(new Uint32Array(12));
  const brut = Array.from(valeurs, (v) => CARACTERES[v % CARACTERES.length]).join('');
  return `${brut.slice(0, 4)}-${brut.slice(4, 8)}-${brut.slice(8)}`;
}

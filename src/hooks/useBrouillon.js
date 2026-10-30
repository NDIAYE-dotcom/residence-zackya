import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { PREFIXE_BROUILLON, lireBrouillon, ecrireBrouillon, supprimerBrouillon } from '../lib/brouillons.js';

/**
 * Comme useState, mais la valeur survit à un changement de page ou à une actualisation.
 * - propre à chaque employé (ou « public » pour un visiteur du site), oubliée après 24 h ou à la déconnexion
 * - rien n'est gardé tant que la valeur est identique à la valeur de départ
 * Renvoie [valeur, setValeur, { restaure, marquerEnregistre, abandonner }] :
 *   marquerEnregistre(v?) → après un envoi réussi (v devient la nouvelle référence)
 *   abandonner()          → efface le brouillon et revient à la valeur de départ
 */
export function useBrouillon(nom, initial) {
  const { session } = useAuth();
  const cle = nom ? `${PREFIXE_BROUILLON}${session?.user.id ?? 'public'}:${nom}` : null;

  const initialRef = useRef(undefined);
  if (initialRef.current === undefined) initialRef.current = typeof initial === 'function' ? initial() : initial;
  const reference = useRef(JSON.stringify(initialRef.current));

  const [valeur, setValeur] = useState(() => (cle && lireBrouillon(cle)) ?? initialRef.current);
  const [restaure, setRestaure] = useState(() => !!cle && lireBrouillon(cle) !== null);
  const valeurRef = useRef(valeur);
  valeurRef.current = valeur;

  // Sauvegarde à chaque modification (immédiate : rien n'est perdu si on quitte la page)
  useEffect(() => {
    if (!cle) return;
    if (JSON.stringify(valeur) === reference.current) supprimerBrouillon(cle);
    else ecrireBrouillon(cle, valeur);
  }, [cle, valeur]);

  const marquerEnregistre = useCallback((v) => {
    reference.current = JSON.stringify(v === undefined ? valeurRef.current : v);
    if (cle) supprimerBrouillon(cle);
    setRestaure(false);
  }, [cle]);

  const abandonner = useCallback(() => {
    if (cle) supprimerBrouillon(cle);
    reference.current = JSON.stringify(initialRef.current);
    setValeur(initialRef.current);
    setRestaure(false);
  }, [cle]);

  return [valeur, setValeur, { restaure, marquerEnregistre, abandonner }];
}

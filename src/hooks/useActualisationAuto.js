import { useEffect, useRef } from 'react';

/**
 * Relance « charger » toutes les « intervalleMs » tant que la page est visible,
 * et immédiatement quand le visiteur revient sur l'onglet (ou rallume son téléphone).
 * Pour les pages publiques : le visiteur n'a pas accès au temps réel Supabase (RLS).
 */
export function useActualisationAuto(charger, intervalleMs, actif = true) {
  const chargerRef = useRef(charger);
  chargerRef.current = charger;

  useEffect(() => {
    if (!actif) return undefined;
    const lancer = () => { if (document.visibilityState === 'visible') chargerRef.current(); };
    const minuterie = setInterval(lancer, intervalleMs);
    document.addEventListener('visibilitychange', lancer);
    window.addEventListener('focus', lancer);
    return () => {
      clearInterval(minuterie);
      document.removeEventListener('visibilitychange', lancer);
      window.removeEventListener('focus', lancer);
    };
  }, [intervalleMs, actif]);
}

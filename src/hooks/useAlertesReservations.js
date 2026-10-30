import { useCallback, useEffect, useRef, useState } from 'react';
import { abonnerReservations, compterEnAttente, resumeReservation } from '../services/notifications.js';
import { deverrouillerSon, jouerCarillon } from '../lib/son.js';

const CLE_SON = 'zaquia:alertes-son'; // préférence propre à cet appareil

const lirePreference = () => { try { return localStorage.getItem(CLE_SON) === 'oui'; } catch { return false; } };
const ecrirePreference = (v) => { try { localStorage.setItem(CLE_SON, v ? 'oui' : 'non'); } catch { /* ignoré */ } };

/**
 * Alertes de l'administration (temps réel) :
 * - enAttente : nombre de réservations à confirmer (pastille du menu)
 * - alertes : réservations arrivées par le site depuis l'ouverture de la page
 * - son : carillon activé sur cet appareil (+ notification du navigateur si l'onglet est caché)
 */
export function useAlertesReservations(actif) {
  const [enAttente, setEnAttente] = useState(0);
  const [alertes, setAlertes] = useState([]);
  const [son, setSon] = useState(lirePreference);
  const sonRef = useRef(son);
  sonRef.current = son;
  const minuteur = useRef(null);

  useEffect(() => {
    if (!actif) return undefined;
    compterEnAttente().then(setEnAttente).catch(() => {});
    const desabonner = abonnerReservations({
      surNouvelle: async (r) => {
        const resume = (await resumeReservation(r.id).catch(() => null)) ?? { id: r.id, reference: r.reference };
        setAlertes((liste) => [resume, ...liste.filter((a) => a.id !== resume.id)].slice(0, 4));
        if (sonRef.current) jouerCarillon();
        if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Nouvelle réservation en ligne', {
            body: `${resume.client_nom ?? ''} · ${resume.studio_code ?? ''} · ${resume.reference}`,
            icon: '/logo-zaquia.png',
            tag: resume.id,
          });
        }
      },
      surChangement: () => {
        clearTimeout(minuteur.current);
        minuteur.current = setTimeout(() => compterEnAttente().then(setEnAttente).catch(() => {}), 400);
      },
    });
    return () => { clearTimeout(minuteur.current); desabonner(); };
  }, [actif]);

  // Doit être appelé dans un clic (règle des navigateurs pour le son)
  const activerSon = useCallback(async () => {
    deverrouillerSon();
    jouerCarillon(); // aperçu
    setSon(true);
    ecrirePreference(true);
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* refusé */ }
    }
  }, []);

  const couperSon = useCallback(() => { setSon(false); ecrirePreference(false); }, []);
  const fermer = useCallback((id) => setAlertes((liste) => liste.filter((a) => a.id !== id)), []);

  return { enAttente, alertes, son, activerSon, couperSon, fermer };
}

import { useEffect, useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import { rechercherReservations } from '../../../services/reservations.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, STATUTS_RESERVATION } from '../../../lib/format.js';
import { formatJourHeure } from '../../../lib/dates.js';
import './ChoixReservationModal.css';

// Encaisser depuis la caisse : retrouver la réservation (référence, nom, téléphone)
export default function ChoixReservationModal({ onFermer, onChoisir }) {
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  // Sans recherche : réservations actives (les plus probables à encaisser)
  useEffect(() => {
    let annule = false;
    setChargement(true);
    const minuteur = setTimeout(async () => {
      try {
        const res = await rechercherReservations({ recherche, statut: recherche.trim() ? '' : 'actives' });
        if (!annule) { setResultats(res.reservations.slice(0, 8)); setErreur(''); }
      } catch (err) {
        if (!annule) setErreur(messageErreur(err));
      } finally {
        if (!annule) setChargement(false);
      }
    }, 300);
    return () => { annule = true; clearTimeout(minuteur); };
  }, [recherche]);

  return (
    <Modal ouvert titre="Encaisser : quelle réservation ?" onFermer={onFermer}>
      <div className="choixresa">
        <input type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} autoFocus
          placeholder="Référence, nom ou téléphone du client…" aria-label="Rechercher une réservation" />

        {chargement ? (
          <p className="choixresa__etat">Recherche…</p>
        ) : erreur ? (
          <p className="choixresa__etat choixresa__etat--erreur">{erreur}</p>
        ) : !resultats.length ? (
          <p className="choixresa__etat">Aucune réservation trouvée.</p>
        ) : (
          <ul className="choixresa__liste">
            {resultats.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => onChoisir(r)}>
                  <span className="choixresa__gauche">
                    <strong>{r.reference} · {r.client_nom}</strong>
                    <small>{r.studio_code} · {formatJourHeure(r.date_debut)} · {STATUTS_RESERVATION[r.statut]}</small>
                  </span>
                  <span className={r.reste_a_payer > 0 ? 'choixresa__reste' : 'choixresa__solde'}>
                    {r.reste_a_payer > 0 ? `Reste ${formatFCFA(r.reste_a_payer)}` : 'Soldé'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

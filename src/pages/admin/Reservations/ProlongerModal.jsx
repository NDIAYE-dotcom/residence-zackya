import { useEffect, useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { prolonger, studiosLibres } from '../../../services/reservations.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, UNITES_FORMULE, UNITES_FORMULE_PLURIEL } from '../../../lib/format.js';
import { ajouterUnites, formatDuree, formatJourHeure, versChampDate } from '../../../lib/dates.js';
import './ProlongerModal.css';

// Prolonger (ou modifier) le départ : disponibilité et nouveau prix vérifiés avant validation
export default function ProlongerModal({ resa, onFermer, onTermine }) {
  const toast = useToast();
  const finActuelle = new Date(resa.date_fin);
  const [fin, setFin] = useState(() => versChampDate(ajouterUnites(resa.formule, finActuelle, 1)));
  const [apercu, setApercu] = useState(null); // { libre, prix } | null pendant la vérification
  const [envoi, setEnvoi] = useState(false);

  const valide = fin && new Date(fin) > new Date(resa.date_debut);

  // Vérifie la disponibilité du même studio (en ignorant cette réservation) et calcule le prix
  useEffect(() => {
    if (!valide) { setApercu(null); return; }
    let annule = false;
    setApercu(null);
    const minuteur = setTimeout(async () => {
      try {
        const libres = await studiosLibres(resa.formule, resa.date_debut, fin, resa.id);
        const ici = libres.find((s) => s.studio_id === resa.studio_id);
        if (!annule) setApercu({ libre: !!ici, prix: ici?.prix ?? null });
      } catch (err) {
        if (!annule) setApercu({ libre: false, prix: null, erreur: messageErreur(err) });
      }
    }, 300);
    return () => { annule = true; clearTimeout(minuteur); };
  }, [fin, valide, resa.formule, resa.date_debut, resa.id, resa.studio_id]);

  const valider = async () => {
    setEnvoi(true);
    try {
      onTermine(await prolonger(resa.id, fin));
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const difference = apercu?.prix != null ? apercu.prix - resa.montant_total : 0;

  return (
    <Modal ouvert titre="Prolonger le séjour" onFermer={envoi ? undefined : onFermer}>
      <div className="prolonger">
        <p className="prolonger__actuel">Départ actuel : <strong>{formatJourHeure(resa.date_fin)}</strong></p>

        <div className="prolonger__raccourcis">
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" onClick={() => setFin(versChampDate(ajouterUnites(resa.formule, finActuelle, n)))}>
              + {n} {n > 1 ? UNITES_FORMULE_PLURIEL[resa.formule] : UNITES_FORMULE[resa.formule]}
            </button>
          ))}
        </div>

        <div className="champ">
          <label htmlFor="pr-fin">Nouveau départ</label>
          <input id="pr-fin" type="datetime-local" step="900" value={fin} min={versChampDate(new Date(resa.date_debut))}
            onChange={(e) => setFin(e.target.value)} />
        </div>

        {!valide ? (
          <p className="prolonger__resultat prolonger__resultat--non">Le départ doit être après l’arrivée.</p>
        ) : !apercu ? (
          <p className="prolonger__resultat">Vérification de la disponibilité…</p>
        ) : apercu.erreur ? (
          <p className="prolonger__resultat prolonger__resultat--non">{apercu.erreur}</p>
        ) : !apercu.libre ? (
          <p className="prolonger__resultat prolonger__resultat--non">
            {resa.studio_code} est déjà réservé sur cette période. Choisissez un départ plus tôt ou changez de studio.
          </p>
        ) : (
          <div className="prolonger__resultat prolonger__resultat--oui">
            <span>Séjour : {formatDuree(resa.date_debut, fin)}</span>
            <span>Nouveau prix : <strong>{formatFCFA(apercu.prix)}</strong></span>
            <span>{difference >= 0 ? 'Supplément' : 'Diminution'} : <strong>{formatFCFA(Math.abs(difference))}</strong></span>
          </div>
        )}

        <div className="prolonger__actions">
          <button type="button" className="btn btn-contour" onClick={onFermer} disabled={envoi}>Annuler</button>
          <button type="button" className="btn btn-rouge" onClick={valider} disabled={envoi || !apercu?.libre}>
            {envoi ? 'Enregistrement…' : 'Valider le nouveau départ'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

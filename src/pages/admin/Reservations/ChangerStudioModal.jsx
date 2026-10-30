import { useEffect, useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { changerStudio, studiosLibres } from '../../../services/reservations.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, FORMULES } from '../../../lib/format.js';
import './ChangerStudioModal.css';

// Changer de studio : studios libres sur les mêmes dates, prix recalculé
export default function ChangerStudioModal({ resa, onFermer, onTermine }) {
  const toast = useToast();
  const [studios, setStudios] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [choisi, setChoisi] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let annule = false;
    studiosLibres(resa.formule, resa.date_debut, resa.date_fin, resa.id)
      .then((s) => { if (!annule) setStudios(s.filter((x) => x.studio_id !== resa.studio_id)); })
      .catch((err) => { if (!annule) setErreur(messageErreur(err, 'Impossible de vérifier les disponibilités.')); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [resa]);

  const valider = async () => {
    setEnvoi(true);
    try {
      onTermine(await changerStudio(resa.id, choisi.studio_id));
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal ouvert titre={`Changer de studio · actuellement ${resa.studio_code}`} onFermer={envoi ? undefined : onFermer}>
      <div className="cstudio">
        {resa.statut === 'en_cours' && (
          <p className="cstudio__info">Le client est déjà installé : {resa.studio_code} passera en « Nettoyage » et le nouveau studio en « Occupé ».</p>
        )}

        {chargement ? (
          <p className="cstudio__etat">Recherche des studios libres…</p>
        ) : erreur ? (
          <p className="cstudio__etat cstudio__etat--erreur">{erreur}</p>
        ) : !studios.length ? (
          <p className="cstudio__etat">Aucun autre studio libre avec un tarif « {FORMULES[resa.formule]} » sur ces dates.</p>
        ) : (
          <div className="cstudio__liste" role="radiogroup" aria-label="Nouveau studio">
            {studios.map((s) => {
              const ecart = s.prix - resa.montant_total;
              return (
                <button key={s.studio_id} type="button" role="radio" aria-checked={choisi?.studio_id === s.studio_id}
                  className={`cstudio__carte ${choisi?.studio_id === s.studio_id ? 'cstudio__carte--choisie' : ''}`}
                  onClick={() => setChoisi(s)}>
                  <span className="cstudio__code">{s.code}</span>
                  <span className="cstudio__nom"><strong>{s.nom}</strong><small>{s.categorie ?? 'Sans catégorie'} · {s.capacite} pers.</small></span>
                  <span className="cstudio__prix">
                    <strong>{formatFCFA(s.prix)}</strong>
                    <small className={ecart > 0 ? 'cstudio__plus' : ecart < 0 ? 'cstudio__moins' : ''}>
                      {ecart === 0 ? 'Même prix' : `${ecart > 0 ? '+' : '−'} ${formatFCFA(Math.abs(ecart))}`}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="cstudio__actions">
          <button type="button" className="btn btn-contour" onClick={onFermer} disabled={envoi}>Annuler</button>
          <button type="button" className="btn btn-rouge" onClick={valider} disabled={envoi || !choisi}>
            {envoi ? 'Enregistrement…' : choisi ? `Passer en ${choisi.code}` : 'Choisissez un studio'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

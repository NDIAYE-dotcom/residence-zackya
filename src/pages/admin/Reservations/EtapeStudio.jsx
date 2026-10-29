import { useEffect, useState } from 'react';
import { studiosLibres } from '../../../services/reservations.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, FORMULES, STATUTS_STUDIO, UNITES_FORMULE, UNITES_FORMULE_PLURIEL } from '../../../lib/format.js';
import './EtapeStudio.css';

// Étape 2 : studios libres sur la période, avec le prix calculé par la base
export default function EtapeStudio({ sejour, choisi, onChoisir, onRetour, onSuivant }) {
  const [studios, setStudios] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreur('');
    studiosLibres(sejour.formule, sejour.debut, sejour.fin)
      .then((s) => { if (!annule) setStudios(s); })
      .catch((err) => { if (!annule) setErreur(messageErreur(err, 'Impossible de vérifier les disponibilités.')); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [sejour.formule, sejour.debut, sejour.fin, essai]);

  return (
    <div className="estudio">
      <h2>Studios libres</h2>

      {chargement ? (
        <p className="estudio__etat">Vérification des disponibilités…</p>
      ) : erreur ? (
        <div className="estudio__etat estudio__etat--erreur">
          <p>{erreur}</p>
          <button type="button" className="btn btn-contour" onClick={() => setEssai((n) => n + 1)}>Réessayer</button>
        </div>
      ) : !studios.length ? (
        <div className="estudio__etat">
          <p>Aucun studio libre avec un tarif « {FORMULES[sejour.formule]} » sur cette période.</p>
          <p>Essayez d’autres dates ou une autre formule.</p>
        </div>
      ) : (
        <div className="estudio__liste" role="radiogroup" aria-label="Studio">
          {studios.map((s) => {
            const unites = s.prix_unitaire ? Math.round(s.prix / s.prix_unitaire) : 1;
            const actif = choisi?.studio_id === s.studio_id;
            return (
              <button key={s.studio_id} type="button" role="radio" aria-checked={actif}
                className={`estudio__carte ${actif ? 'estudio__carte--choisie' : ''}`} onClick={() => onChoisir(s)}>
                <span className="estudio__code">{s.code}</span>
                <span className="estudio__infos">
                  <strong>{s.nom}</strong>
                  <small>{s.categorie ?? 'Sans catégorie'} · {s.capacite} pers.</small>
                  <span className="estudio__etiquettes">
                    {s.statut !== 'disponible' && (
                      <span className={`badge badge-${s.statut}`}>Actuellement : {STATUTS_STUDIO[s.statut]}</span>
                    )}
                    {!s.publie && <span className="estudio__non-publie">Non publié</span>}
                  </span>
                </span>
                <span className="estudio__prix">
                  <strong>{formatFCFA(s.prix)}</strong>
                  <small>{unites} {unites > 1 ? UNITES_FORMULE_PLURIEL[sejour.formule] : UNITES_FORMULE[sejour.formule]} × {formatFCFA(s.prix_unitaire)}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="nresa__nav">
        <button type="button" className="btn btn-contour" onClick={onRetour}>← Dates</button>
        <button type="button" className="btn btn-rouge" onClick={onSuivant} disabled={!choisi}>Continuer →</button>
      </div>
    </div>
  );
}

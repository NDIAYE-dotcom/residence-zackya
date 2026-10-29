import { useState } from 'react';
import { FORMULES, UNITES_FORMULE, UNITES_FORMULE_PLURIEL } from '../../../lib/format.js';
import { calculerFin, debutParDefaut, formatDuree, versChampDate } from '../../../lib/dates.js';
import './EtapeDates.css';

// Étape 1 : formule, arrivée, nombre d'unités → départ calculé (modifiable)
export default function EtapeDates({ sejour, params, onChange, onSuivant }) {
  const [erreur, setErreur] = useState('');
  const { formule, debut, fin, quantite } = sejour;

  const recalculer = (s) => ({ ...s, fin: s.debut ? versChampDate(calculerFin(s.formule, new Date(s.debut), s.quantite, params)) : '' });

  const choisirFormule = (f) => {
    // Garde le jour choisi, applique l'heure habituelle de la formule
    const base = debut ? new Date(debut) : new Date();
    onChange(recalculer({ ...sejour, formule: f, debut: versChampDate(debutParDefaut(f, params, base)) }));
    setErreur('');
  };

  const changerQuantite = (q) => onChange(recalculer({ ...sejour, quantite: Math.max(1, Math.min(q, 99)) }));

  const suivant = () => {
    if (!debut || !fin) return setErreur('Indiquez l’arrivée et le départ.');
    if (new Date(fin) <= new Date(debut)) return setErreur('Le départ doit être après l’arrivée.');
    setErreur('');
    onSuivant();
  };

  const valide = debut && fin && new Date(fin) > new Date(debut);

  return (
    <div className="edates">
      <h2>Quelle formule ?</h2>
      <div className="edates__formules" role="radiogroup" aria-label="Formule">
        {Object.entries(FORMULES).map(([k, v]) => (
          <button key={k} type="button" role="radio" aria-checked={formule === k}
            className={`edates__formule ${formule === k ? 'edates__formule--choisie' : ''}`}
            onClick={() => choisirFormule(k)}>
            {v}
          </button>
        ))}
      </div>

      <div className="edates__grille">
        <div className="champ">
          <label htmlFor="nr-debut">Arrivée</label>
          <input id="nr-debut" type="datetime-local" step="900" value={debut}
            onChange={(e) => onChange(recalculer({ ...sejour, debut: e.target.value }))} />
        </div>

        <div className="champ">
          <label htmlFor="nr-quantite">Nombre de {UNITES_FORMULE_PLURIEL[formule]}</label>
          <div className="edates__quantite">
            <button type="button" onClick={() => changerQuantite(quantite - 1)} disabled={quantite <= 1} aria-label="Moins">−</button>
            <input id="nr-quantite" type="number" min="1" max="99" inputMode="numeric" value={quantite}
              onChange={(e) => changerQuantite(Number(e.target.value) || 1)} />
            <button type="button" onClick={() => changerQuantite(quantite + 1)} aria-label="Plus">+</button>
          </div>
        </div>

        <div className="champ">
          <label htmlFor="nr-fin">Départ <small>(modifiable)</small></label>
          <input id="nr-fin" type="datetime-local" step="900" value={fin} min={debut || undefined}
            onChange={(e) => onChange({ ...sejour, fin: e.target.value })} />
        </div>
      </div>

      <p className="edates__aide">
        {formule === 'nuitee' && `Nuitée : arrivée à partir de ${params?.nuitee_debut ?? '18:00'}, départ à ${params?.nuitee_fin ?? '12:00'} le lendemain. Prix par nuit.`}
        {(formule === 'semaine' || formule === 'mois') && `Check-in ${params?.heure_checkin ?? '14:00'}, check-out ${params?.heure_checkout ?? '12:00'}.`}
        {['heure', 'demi_journee', 'journee'].includes(formule) && `Prix par ${UNITES_FORMULE[formule]} commencée.`}
        {valide && <strong> Durée : {formatDuree(debut, fin)}.</strong>}
      </p>

      {erreur && <p className="edates__erreur">{erreur}</p>}

      <div className="nresa__nav">
        <button type="button" className="btn btn-rouge" onClick={suivant}>Voir les studios libres →</button>
      </div>
    </div>
  );
}

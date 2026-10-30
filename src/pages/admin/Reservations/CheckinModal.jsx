import { useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { changerStatut } from '../../../services/reservations.js';
import { modifierClient } from '../../../services/clients.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, PIECES_IDENTITE } from '../../../lib/format.js';
import { formatJourHeure } from '../../../lib/dates.js';
import './CheckinModal.css';

// Check-in : pièce d'identité obligatoire, puis le studio passe « Occupé » (trigger en base)
export default function CheckinModal({ resa, client, onFermer, onTermine }) {
  const toast = useToast();
  const [piece, setPiece, brouillon] = useBrouillon(`checkin:${resa.id}`, () => ({
    type: client?.piece_type ?? 'CNI',
    numero: client?.piece_numero ?? '',
  }));
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const enAvance = new Date() < new Date(resa.date_debut);

  const valider = async (e) => {
    e.preventDefault();
    if (!piece.type || !piece.numero.trim()) return setErreur('Le type et le numéro de la pièce sont obligatoires.');
    setErreur('');
    setEnvoi(true);
    try {
      const numero = piece.numero.trim().toUpperCase();
      if (numero !== client?.piece_numero || piece.type !== client?.piece_type) {
        await modifierClient(resa.client_id, { piece_type: piece.type, piece_numero: numero });
      }
      await changerStatut(resa.id, 'en_cours');
      brouillon.marquerEnregistre();
      onTermine();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal ouvert titre={`Check-in · ${resa.client_nom}`} onFermer={envoi ? undefined : onFermer}>
      <form className="checkin" onSubmit={valider} noValidate>
        <p className="checkin__resume">
          Studio <strong>{resa.studio_code} – {resa.studio_nom}</strong> jusqu’au <strong>{formatJourHeure(resa.date_fin)}</strong>.
        </p>

        {enAvance && (
          <p className="checkin__info">Arrivée anticipée : prévue le {formatJourHeure(resa.date_debut)}.</p>
        )}
        {resa.reste_a_payer > 0 && (
          <p className="checkin__info checkin__info--rouge">
            Reste à payer : <strong>{formatFCFA(resa.reste_a_payer)}</strong> (vous pouvez encaisser maintenant ou au départ).
          </p>
        )}

        <fieldset className="checkin__piece">
          <legend>Pièce d’identité du client *</legend>
          <div className="checkin__ligne">
            <div className="champ">
              <label htmlFor="ci-type">Type</label>
              <select id="ci-type" value={piece.type} onChange={(e) => setPiece((p) => ({ ...p, type: e.target.value }))}>
                {PIECES_IDENTITE.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className={`champ ${erreur ? 'champ--erreur' : ''}`}>
              <label htmlFor="ci-num">Numéro</label>
              <input id="ci-num" value={piece.numero} autoFocus={!piece.numero}
                onChange={(e) => setPiece((p) => ({ ...p, numero: e.target.value }))} placeholder="1 234 1985 01234" />
            </div>
          </div>
          {erreur && <small className="champ__erreur">{erreur}</small>}
          {client?.piece_numero && <small className="checkin__aide">Pièce déjà enregistrée : vérifiez qu’elle correspond.</small>}
        </fieldset>

        <div className="checkin__actions">
          <button type="button" className="btn btn-contour" onClick={() => { brouillon.abandonner(); onFermer(); }} disabled={envoi}>Annuler</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Valider l’arrivée'}</button>
        </div>
      </form>
    </Modal>
  );
}

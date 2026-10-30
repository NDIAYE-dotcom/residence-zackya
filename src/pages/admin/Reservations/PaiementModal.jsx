import { useEffect, useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import BrouillonRestaure from '../../../components/BrouillonRestaure/BrouillonRestaure.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { enregistrerPaiement, paiementsReservation } from '../../../services/paiements.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA, MODES_PAIEMENT, TYPES_PAIEMENT } from '../../../lib/format.js';
import './PaiementModal.css';

// PayDunya = paiement en ligne uniquement
const MODES_STAFF = Object.entries(MODES_PAIEMENT).filter(([k]) => k !== 'paydunya');

// Encaisser un paiement (acompte, solde, extra, caution) ou enregistrer un remboursement
export default function PaiementModal({ resa, onFermer, onTermine }) {
  const toast = useToast();
  const reste = Math.max(0, resa.reste_a_payer);
  const [form, setForm, brouillon] = useBrouillon(`paiement:${resa.id}`, () => ({
    type: resa.total_paye > 0 ? 'solde' : 'acompte',
    montant: reste > 0 ? String(reste) : '',
    mode: 'especes',
    referenceTransaction: '',
  }));
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [cautionDispo, setCautionDispo] = useState(0); // caution versée et pas encore rendue

  useEffect(() => {
    paiementsReservation(resa.id)
      .then((ps) => setCautionDispo(ps.reduce((t, p) => t + (p.type === 'caution' ? p.montant : p.type === 'restitution_caution' ? -p.montant : 0), 0)))
      .catch(() => setCautionDispo(0));
  }, [resa.id]);

  const maj = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  // Types proposés : remboursement si le client a payé, restitution si une caution est détenue
  const types = Object.entries(TYPES_PAIEMENT).filter(([k]) =>
    (k !== 'remboursement' || resa.total_paye > 0) && (k !== 'restitution_caution' || cautionDispo > 0));

  const valider = async (e) => {
    e.preventDefault();
    const montant = Number(form.montant);
    if (!Number.isInteger(montant) || montant <= 0) return setErreur('Montant invalide (nombre entier en FCFA).');
    if (['acompte', 'solde'].includes(form.type) && montant > reste) {
      return setErreur(`Le montant dépasse le reste à payer (${formatFCFA(reste)}). Utilisez « Extra » pour un service en plus.`);
    }
    if (form.type === 'restitution_caution' && montant > cautionDispo) {
      return setErreur(`La caution détenue est de ${formatFCFA(cautionDispo)}.`);
    }
    if (form.type === 'remboursement' && montant > resa.total_paye) {
      return setErreur(`On ne peut pas rembourser plus que le montant payé (${formatFCFA(resa.total_paye)}).`);
    }
    setErreur('');
    setEnvoi(true);
    try {
      const p = await enregistrerPaiement({
        reservationId: resa.id, montant, mode: form.mode, type: form.type,
        referenceTransaction: form.mode === 'especes' ? '' : form.referenceTransaction,
      });
      brouillon.marquerEnregistre();
      onTermine(p);
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal ouvert titre={`Encaisser · ${resa.reference}`} onFermer={envoi ? undefined : onFermer}>
      <form className="paiement" onSubmit={valider} noValidate>
        <BrouillonRestaure visible={brouillon.restaure} onEffacer={brouillon.abandonner} />

        <div className="paiement__resume">
          <div><span>À payer</span><strong>{formatFCFA(resa.montant_total - resa.remise)}</strong></div>
          <div><span>Déjà payé</span><strong>{formatFCFA(resa.total_paye)}</strong></div>
          <div className="paiement__reste"><span>Reste</span><strong>{formatFCFA(reste)}</strong></div>
        </div>

        <div className="paiement__grille">
          <div className="champ">
            <label htmlFor="pa-type">Type</label>
            <select id="pa-type" value={form.type} onChange={maj('type')}>
              {types.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className={`champ ${erreur ? 'champ--erreur' : ''}`}>
            <label htmlFor="pa-montant">Montant (FCFA)</label>
            <input id="pa-montant" type="number" min="1" step="500" inputMode="numeric" value={form.montant} onChange={maj('montant')} autoFocus />
          </div>
          <div className="champ">
            <label htmlFor="pa-mode">Mode</label>
            <select id="pa-mode" value={form.mode} onChange={maj('mode')}>
              {MODES_STAFF.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {form.mode !== 'especes' && (
            <div className="champ">
              <label htmlFor="pa-ref">N° de transaction</label>
              <input id="pa-ref" value={form.referenceTransaction} onChange={maj('referenceTransaction')} placeholder="Identifiant Wave / OM…" />
            </div>
          )}
        </div>

        {form.type === 'caution' && <p className="paiement__aide">La caution n’entre pas dans le chiffre d’affaires : elle est rendue au départ.</p>}
        {form.type === 'remboursement' && <p className="paiement__aide">Le remboursement diminue le montant payé par le client.</p>}
        {form.type === 'restitution_caution' && <p className="paiement__aide">Caution détenue : {formatFCFA(cautionDispo)}. Sa restitution ne change pas le chiffre d’affaires.</p>}
        {cautionDispo > 0 && form.type !== 'restitution_caution' && <p className="paiement__aide">Caution détenue pour ce client : {formatFCFA(cautionDispo)}.</p>}
        {erreur && <p className="paiement__erreur">{erreur}</p>}

        <div className="paiement__actions">
          <button type="button" className="btn btn-contour" onClick={() => { brouillon.abandonner(); onFermer(); }} disabled={envoi}>Annuler</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer le paiement'}</button>
        </div>
      </form>
    </Modal>
  );
}

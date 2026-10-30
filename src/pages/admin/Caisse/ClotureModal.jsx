import { useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import BrouillonRestaure from '../../../components/BrouillonRestaure/BrouillonRestaure.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { cloturerCaisse } from '../../../services/paiements.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA } from '../../../lib/format.js';
import './ClotureModal.css';

// Clôture : espèces comptées vs attendues, écart, notes — puis la journée est verrouillée
export default function ClotureModal({ jour, libelleJour, attendues, onFermer, onTermine }) {
  const toast = useToast();
  const [form, setForm, brouillon] = useBrouillon(`cloture:${jour}`, { comptees: '', notes: '' });
  const [envoi, setEnvoi] = useState(false);

  const comptees = form.comptees === '' ? null : Number(form.comptees);
  const valide = comptees !== null && Number.isInteger(comptees) && comptees >= 0;
  const ecart = valide ? comptees - attendues : 0;

  const valider = async (e) => {
    e.preventDefault();
    if (!valide) return;
    if (ecart !== 0 && !form.notes.trim()) return toast.erreur('Il y a un écart : expliquez-le dans les notes.');
    setEnvoi(true);
    try {
      await cloturerCaisse(jour, comptees, form.notes.trim());
      brouillon.marquerEnregistre();
      onTermine();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal ouvert titre="Clôturer la journée" onFermer={envoi ? undefined : onFermer}>
      <form className="cloture" onSubmit={valider} noValidate>
        <BrouillonRestaure visible={brouillon.restaure} onEffacer={brouillon.abandonner} />
        <p className="cloture__jour">{libelleJour}</p>

        <div className="cloture__attendu">
          <span>Espèces attendues en caisse</span>
          <strong>{formatFCFA(attendues)}</strong>
        </div>

        <div className="champ">
          <label htmlFor="cl-comptees">Espèces comptées (FCFA)</label>
          <input id="cl-comptees" type="number" min="0" step="500" inputMode="numeric" autoFocus
            value={form.comptees} onChange={(e) => setForm((f) => ({ ...f, comptees: e.target.value }))} />
        </div>

        {valide && (
          <p className={`cloture__ecart ${ecart === 0 ? 'cloture__ecart--ok' : ''}`}>
            {ecart === 0 ? 'Aucun écart : la caisse est juste.' : `Écart : ${ecart > 0 ? '+' : '−'} ${formatFCFA(Math.abs(ecart))} (${ecart > 0 ? 'excédent' : 'manquant'})`}
          </p>
        )}

        <div className="champ">
          <label htmlFor="cl-notes">Notes {ecart !== 0 && valide ? '(obligatoires en cas d’écart)' : ''}</label>
          <textarea id="cl-notes" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Ex : 2 000 FCFA rendus en trop à un client…" />
        </div>

        <p className="cloture__info">Après la clôture, plus aucun paiement ne pourra être ajouté à cette journée (seul l’administrateur peut la rouvrir).</p>

        <div className="cloture__actions">
          <button type="button" className="btn btn-contour" onClick={() => { brouillon.abandonner(); onFermer(); }} disabled={envoi}>Annuler</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi || !valide}>{envoi ? 'Clôture…' : 'Clôturer la journée'}</button>
        </div>
      </form>
    </Modal>
  );
}

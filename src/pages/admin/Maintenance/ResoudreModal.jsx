import { useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { resoudrePanne } from '../../../services/maintenance.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { formatFCFA } from '../../../lib/format.js';
import './ResoudreModal.css';

// Marquer une panne résolue : coût, ce qui a été fait, création de la dépense
export default function ResoudreModal({ panne, onFermer, onResolue }) {
  const toast = useToast();
  const [form, setForm, brouillon] = useBrouillon(`panne:resoudre:${panne.id}`, { cout: '', notes: '', creerDepense: true });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const cout = form.cout === '' ? 0 : Number(form.cout);

  const valider = async (e) => {
    e.preventDefault();
    if (!Number.isInteger(cout) || cout < 0) return setErreur('Coût invalide (nombre entier en FCFA, 0 si gratuit).');
    setErreur('');
    setEnvoi(true);
    try {
      await resoudrePanne(panne, { cout, notes: form.notes.trim(), creerDepense: form.creerDepense && cout > 0 });
      brouillon.marquerEnregistre();
      onResolue();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal ouvert titre={`Panne résolue · ${panne.studio_code}`} onFermer={envoi ? undefined : onFermer}>
      <form className="resoudre" onSubmit={valider} noValidate>
        <p className="resoudre__titre">{panne.titre}</p>

        <div className={`champ ${erreur ? 'champ--erreur' : ''}`}>
          <label htmlFor="rs-cout">Coût de la réparation (FCFA)</label>
          <input id="rs-cout" type="number" min="0" step="500" inputMode="numeric" placeholder="0" autoFocus
            value={form.cout} onChange={(e) => setForm((f) => ({ ...f, cout: e.target.value }))} />
          {erreur && <small className="champ__erreur">{erreur}</small>}
        </div>

        <div className="champ">
          <label htmlFor="rs-notes">Ce qui a été fait (facultatif)</label>
          <textarea id="rs-notes" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Ex : recharge de gaz par le frigoriste" />
        </div>

        {cout > 0 && (
          <label className="resoudre__depense">
            <input type="checkbox" checked={form.creerDepense} onChange={(e) => setForm((f) => ({ ...f, creerDepense: e.target.checked }))} />
            <span>
              <strong>Enregistrer {formatFCFA(cout)} dans les Dépenses</strong>
              <small>Catégorie « Réparations / maintenance », rattachée à {panne.studio_code}.</small>
            </span>
          </label>
        )}

        {panne.priorite === 'urgente' && <p className="resoudre__info">{panne.studio_code} redeviendra « Disponible » s’il n’y a plus d’autre panne urgente.</p>}

        <div className="resoudre__actions">
          <button type="button" className="btn btn-contour" onClick={() => { brouillon.abandonner(); onFermer(); }} disabled={envoi}>Annuler</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Marquer résolue'}</button>
        </div>
      </form>
    </Modal>
  );
}

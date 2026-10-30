import { useEffect, useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import BrouillonRestaure from '../../../components/BrouillonRestaure/BrouillonRestaure.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { useBrouillon } from '../../../hooks/useBrouillon.js';
import { creerTache } from '../../../services/menage.js';
import { listerStudiosResume } from '../../../services/studios.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { versChampDate } from '../../../lib/dates.js';
import './NouvelleTacheModal.css';

// Tâche de ménage ajoutée à la main (grand ménage, studio à rafraîchir…)
export default function NouvelleTacheModal({ equipe, peutAssigner, onFermer, onCree }) {
  const toast = useToast();
  const [studios, setStudios] = useState([]);
  const [form, setForm, brouillon] = useBrouillon('menage:nouvelle', () => ({
    studioId: '', notes: '', assigneA: '', prevueLe: versChampDate(new Date()),
  }));
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => { listerStudiosResume().then(setStudios).catch(() => setStudios([])); }, []);

  const maj = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const valider = async (e) => {
    e.preventDefault();
    if (!form.studioId) return setErreur('Choisissez le studio.');
    setErreur('');
    setEnvoi(true);
    try {
      await creerTache({ ...form, notes: form.notes.trim() });
      brouillon.marquerEnregistre();
      onCree();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal ouvert titre="Nouvelle tâche de ménage" onFermer={envoi ? undefined : onFermer}>
      <form className="ntache" onSubmit={valider} noValidate>
        <BrouillonRestaure visible={brouillon.restaure} onEffacer={brouillon.abandonner} />

        <div className={`champ ${erreur ? 'champ--erreur' : ''}`}>
          <label htmlFor="nt-studio">Studio</label>
          <select id="nt-studio" value={form.studioId} onChange={maj('studioId')}>
            <option value="">Choisir…</option>
            {studios.map((s) => <option key={s.id} value={s.id}>{s.code} – {s.nom}</option>)}
          </select>
          {erreur && <small className="champ__erreur">{erreur}</small>}
        </div>

        <div className="champ">
          <label htmlFor="nt-notes">Ce qu’il faut faire</label>
          <textarea id="nt-notes" rows={3} value={form.notes} onChange={maj('notes')}
            placeholder="Ex : grand ménage, changer les rideaux, nettoyer le balcon…" />
        </div>

        <div className="ntache__ligne">
          <div className="champ">
            <label htmlFor="nt-quand">Prévue le</label>
            <input id="nt-quand" type="datetime-local" step="900" value={form.prevueLe} onChange={maj('prevueLe')} />
          </div>
          {peutAssigner && (
            <div className="champ">
              <label htmlFor="nt-qui">Assignée à</label>
              <select id="nt-qui" value={form.assigneA} onChange={maj('assigneA')}>
                <option value="">Personne</option>
                {equipe.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="ntache__actions">
          <button type="button" className="btn btn-contour" onClick={() => { brouillon.abandonner(); onFermer(); }} disabled={envoi}>Annuler</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi}>{envoi ? 'Ajout…' : 'Ajouter la tâche'}</button>
        </div>
      </form>
    </Modal>
  );
}

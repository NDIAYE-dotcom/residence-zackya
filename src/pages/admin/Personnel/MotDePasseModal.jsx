import { useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { changerMotDePasse } from '../../../services/personnel.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { genererMotDePasse } from '../../../lib/motDePasse.js';
import AccesTransmis from './AccesTransmis.jsx';
import './EmployeModal.css';

// Nouveau mot de passe pour un employé (oubli, départ d'un collègue…)
export default function MotDePasseModal({ employe, onFermer }) {
  const toast = useToast();
  const [password, setPassword] = useState(genererMotDePasse);
  const [voir, setVoir] = useState(true);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [fait, setFait] = useState(false);

  const enregistrer = async (e) => {
    e.preventDefault();
    if (password.length < 8) return setErreur('Au moins 8 caractères.');
    setErreur('');
    setEnvoi(true);
    try {
      await changerMotDePasse(employe.id, password);
      setFait(true);
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal ouvert titre={`Mot de passe de ${employe.full_name}`} onFermer={envoi ? undefined : onFermer}>
      {fait ? (
        <AccesTransmis nom={employe.full_name} email={employe.email} password={password} actif={employe.actif} onTerminer={onFermer} />
      ) : (
        <form className="employe-modal" onSubmit={enregistrer} noValidate>
          <p className="employe-modal__texte">
            L’ancien mot de passe ne fonctionnera plus. Transmettez le nouveau à l’employé.
          </p>
          <div className={`champ ${erreur ? 'champ--erreur' : ''}`}>
            <label htmlFor="mdp-nouveau">Nouveau mot de passe</label>
            <div className="employe-modal__mdp">
              <input id="mdp-nouveau" type={voir ? 'text' : 'password'} autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="btn btn-contour" onClick={() => setVoir((v) => !v)}>
                {voir ? 'Masquer' : 'Afficher'}
              </button>
              <button type="button" className="btn btn-contour" onClick={() => { setPassword(genererMotDePasse()); setVoir(true); }}>
                Générer
              </button>
            </div>
            {erreur && <small className="champ__erreur">{erreur}</small>}
          </div>
          <div className="employe-modal__actions">
            <button type="button" className="btn btn-contour" onClick={onFermer} disabled={envoi}>Annuler</button>
            <button type="submit" className="btn btn-rouge" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Changer le mot de passe'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

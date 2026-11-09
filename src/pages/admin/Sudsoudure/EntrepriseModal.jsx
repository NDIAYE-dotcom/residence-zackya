import { useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { enregistrerEntreprise } from '../../../services/sudsoudure.js';
import { messageErreur } from '../../../lib/erreurs.js';
import './DocumentModal.css';

const CHAMPS = [
  ['nom', 'Nom de l’entreprise'],
  ['activite', 'Activité'],
  ['gerant', 'Gérant'],
  ['telephones', 'Téléphones'],
  ['adresse', 'Adresse'],
  ['email', 'Email'],
  ['ninea', 'NINEA'],
  ['rccm', 'RCCM'],
];

// Coordonnées imprimées en haut et en bas des factures SUDSOUDURE
export default function EntrepriseModal({ entreprise, onFermer, onEnregistre }) {
  const toast = useToast();
  const [form, setForm] = useState(entreprise);
  const [envoi, setEnvoi] = useState(false);
  const maj = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const enregistrer = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return toast.erreur('Le nom de l’entreprise est obligatoire.');
    setEnvoi(true);
    try {
      await enregistrerEntreprise(form);
      toast.succes('Coordonnées enregistrées.');
      onEnregistre();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Modal ouvert titre="Coordonnées de SUDSOUDURE" onFermer={envoi ? undefined : onFermer}>
      <form className="sudform" onSubmit={enregistrer} noValidate>
        <p className="sudform__aide">Imprimées en haut et en bas de chaque facture et devis.</p>
        <div className="sudform__grille">
          {CHAMPS.map(([cle, libelle]) => (
            <div className="champ" key={cle}>
              <label htmlFor={`ent-${cle}`}>{libelle}</label>
              <input id={`ent-${cle}`} value={form[cle]} onChange={maj(cle)} />
            </div>
          ))}
        </div>
        <div className="champ">
          <label htmlFor="ent-conditions">Conditions proposées sur les nouvelles factures</label>
          <textarea id="ent-conditions" rows={2} value={form.conditions} onChange={maj('conditions')} />
        </div>
        <div className="sudform__actions">
          <button type="button" className="btn btn-contour" onClick={onFermer} disabled={envoi}>Annuler</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </Modal>
  );
}

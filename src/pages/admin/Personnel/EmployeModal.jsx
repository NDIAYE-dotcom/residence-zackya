import { useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { creerEmploye, modifierEmploye } from '../../../services/personnel.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { ROLES_STAFF, DESCRIPTIONS_ROLES } from '../../../lib/format.js';
import { normaliserTelephone, formatTelephone } from '../../../lib/telephone.js';
import { genererMotDePasse } from '../../../lib/motDePasse.js';
import AccesTransmis from './AccesTransmis.jsx';
import './EmployeModal.css';

/**
 * Création d'un employé (via l'Edge Function) ou modification du nom / téléphone.
 * Le rôle et l'activation se changent directement dans la liste.
 */
export default function EmployeModal({ employe, onFermer, onEnregistre }) {
  const toast = useToast();
  const creation = !employe;
  const [form, setForm] = useState({
    full_name: employe?.full_name ?? '',
    email: '',
    phone: employe?.phone ? formatTelephone(employe.phone) : '',
    role: 'receptionniste',
    password: creation ? genererMotDePasse() : '',
    actif: true,
  });
  const [voirMdp, setVoirMdp] = useState(true);
  const [erreurs, setErreurs] = useState({});
  const [envoi, setEnvoi] = useState(false);
  const [acces, setAcces] = useState(null); // accès à transmettre après création

  const maj = (champ) => (e) =>
    setForm((f) => ({ ...f, [champ]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const valider = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Le nom est obligatoire.';
    if (form.phone.trim() && !normaliserTelephone(form.phone)) e.phone = 'Numéro sénégalais invalide (ex : 77 123 45 67).';
    if (creation) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Adresse email invalide.';
      if (form.password.length < 8) e.password = 'Au moins 8 caractères.';
    }
    setErreurs(e);
    return !Object.keys(e).length;
  };

  const enregistrer = async (ev) => {
    ev.preventDefault();
    if (!valider()) return;
    setEnvoi(true);
    const phone = form.phone.trim() ? normaliserTelephone(form.phone) : null;
    try {
      if (creation) {
        const email = form.email.trim().toLowerCase();
        await creerEmploye({ email, password: form.password, full_name: form.full_name.trim(), phone, role: form.role, actif: form.actif });
        setAcces({ nom: form.full_name.trim(), email, password: form.password, actif: form.actif });
        onEnregistre(null);
      } else {
        await modifierEmploye(employe.id, { full_name: form.full_name.trim(), phone });
        toast.succes('Informations enregistrées.');
        onEnregistre(employe);
        onFermer();
      }
    } catch (err) {
      if (err.code === 'FONCTION' && err.message.includes('déjà un compte')) setErreurs({ email: err.message });
      else toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const champ = (nom) => `champ ${erreurs[nom] ? 'champ--erreur' : ''}`;

  // Après création : écran récapitulatif des accès
  if (acces) {
    return (
      <Modal ouvert titre="Compte créé" onFermer={onFermer}>
        <AccesTransmis {...acces} onTerminer={onFermer} />
      </Modal>
    );
  }

  return (
    <Modal ouvert titre={creation ? 'Nouvel employé' : `Modifier ${employe.full_name}`} onFermer={envoi ? undefined : onFermer}>
      <form className="employe-modal" onSubmit={enregistrer} noValidate>
        <div className={champ('full_name')}>
          <label htmlFor="emp-nom">Nom complet *</label>
          <input id="emp-nom" value={form.full_name} onChange={maj('full_name')} placeholder="Awa Diatta" autoFocus />
          {erreurs.full_name && <small className="champ__erreur">{erreurs.full_name}</small>}
        </div>

        {creation && (
          <div className={champ('email')}>
            <label htmlFor="emp-email">Email de connexion *</label>
            <input id="emp-email" type="email" autoComplete="off" value={form.email} onChange={maj('email')} placeholder="awa@zaquia.sn" />
            {erreurs.email && <small className="champ__erreur">{erreurs.email}</small>}
          </div>
        )}

        <div className={champ('phone')}>
          <label htmlFor="emp-tel">Téléphone</label>
          <input id="emp-tel" type="tel" inputMode="tel" value={form.phone} onChange={maj('phone')} placeholder="77 123 45 67" />
          {erreurs.phone && <small className="champ__erreur">{erreurs.phone}</small>}
        </div>

        {creation && (
          <>
            <fieldset className="employe-modal__roles">
              <legend>Rôle *</legend>
              {Object.entries(ROLES_STAFF).map(([cle, libelle]) => (
                <label key={cle} className={`employe-modal__role ${form.role === cle ? 'employe-modal__role--choisi' : ''}`}>
                  <input type="radio" name="role" value={cle} checked={form.role === cle} onChange={maj('role')} />
                  <span><strong>{libelle}</strong><small>{DESCRIPTIONS_ROLES[cle]}</small></span>
                </label>
              ))}
            </fieldset>

            <div className={champ('password')}>
              <label htmlFor="emp-mdp">Mot de passe provisoire *</label>
              <div className="employe-modal__mdp">
                <input id="emp-mdp" type={voirMdp ? 'text' : 'password'} autoComplete="new-password"
                  value={form.password} onChange={maj('password')} />
                <button type="button" className="btn btn-contour" onClick={() => setVoirMdp((v) => !v)}>
                  {voirMdp ? 'Masquer' : 'Afficher'}
                </button>
                <button type="button" className="btn btn-contour"
                  onClick={() => { setForm((f) => ({ ...f, password: genererMotDePasse() })); setVoirMdp(true); }}>
                  Générer
                </button>
              </div>
              {erreurs.password && <small className="champ__erreur">{erreurs.password}</small>}
            </div>

            <label className="employe-modal__actif">
              <input type="checkbox" checked={form.actif} onChange={maj('actif')} />
              <span>
                <strong>Activer le compte maintenant</strong>
                <small>Sinon, l’employé ne pourra se connecter qu’après activation dans la liste.</small>
              </span>
            </label>
          </>
        )}

        <div className="employe-modal__actions">
          <button type="button" className="btn btn-contour" onClick={onFermer} disabled={envoi}>Annuler</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi}>
            {envoi ? 'Enregistrement…' : creation ? 'Créer le compte' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

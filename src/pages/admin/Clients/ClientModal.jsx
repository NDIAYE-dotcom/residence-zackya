import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../../components/Modal/Modal.jsx';
import { useToast } from '../../../components/Toast/Toast.jsx';
import { creerClient, modifierClient, trouverParTelephone } from '../../../services/clients.js';
import { messageErreur } from '../../../lib/erreurs.js';
import { PIECES_IDENTITE, NATIONALITES } from '../../../lib/format.js';
import { normaliserTelephoneClient, formatTelephone } from '../../../lib/telephone.js';
import './ClientModal.css';

// Création ou modification d'un client
export default function ClientModal({ client, onFermer, onEnregistre }) {
  const toast = useToast();
  const creation = !client;
  const [form, setForm] = useState({
    full_name: client?.full_name ?? '',
    phone: client?.phone ? formatTelephone(client.phone) : '',
    email: client?.email ?? '',
    nationalite: client?.nationalite ?? 'Sénégalaise',
    piece_type: client?.piece_type ?? '',
    piece_numero: client?.piece_numero ?? '',
    notes: client?.notes ?? '',
  });
  const [erreurs, setErreurs] = useState({});
  const [doublon, setDoublon] = useState(null); // client existant avec le même numéro
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ) => (e) => setForm((f) => ({ ...f, [champ]: e.target.value }));

  const valider = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Le nom est obligatoire.';
    if (!normaliserTelephoneClient(form.phone)) e.phone = 'Numéro invalide : 77 123 45 67, ou +33 6… pour l’étranger.';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Adresse email invalide.';
    if (form.piece_numero.trim() && !form.piece_type) e.piece_type = 'Précisez le type de pièce.';
    setErreurs(e);
    return !Object.keys(e).length;
  };

  const enregistrer = async (ev) => {
    ev.preventDefault();
    setDoublon(null);
    if (!valider()) return;
    setEnvoi(true);
    const phone = normaliserTelephoneClient(form.phone);
    try {
      const existant = await trouverParTelephone(phone, client?.id);
      if (existant) {
        setDoublon(existant);
        setErreurs({ phone: `Ce numéro appartient déjà à ${existant.full_name}.` });
        return;
      }
      const valeurs = {
        full_name: form.full_name.trim(),
        phone,
        email: form.email.trim().toLowerCase() || null,
        nationalite: form.nationalite.trim() || null,
        piece_type: form.piece_type || null,
        piece_numero: form.piece_numero.trim().toUpperCase() || null,
        notes: form.notes.trim() || null,
      };
      const enregistre = creation ? await creerClient(valeurs) : await modifierClient(client.id, valeurs);
      toast.succes(creation ? `Client ${enregistre.full_name} ajouté.` : 'Fiche client enregistrée.');
      onEnregistre(enregistre);
      onFermer();
    } catch (err) {
      toast.erreur(messageErreur(err));
    } finally {
      setEnvoi(false);
    }
  };

  const champ = (nom) => `champ ${erreurs[nom] ? 'champ--erreur' : ''}`;

  return (
    <Modal ouvert titre={creation ? 'Nouveau client' : `Modifier ${client.full_name}`} onFermer={envoi ? undefined : onFermer}>
      <form className="client-modal" onSubmit={enregistrer} noValidate>
        <div className={champ('full_name')}>
          <label htmlFor="cl-nom">Nom complet *</label>
          <input id="cl-nom" value={form.full_name} onChange={maj('full_name')} placeholder="Fatou Sané" autoFocus />
          {erreurs.full_name && <small className="champ__erreur">{erreurs.full_name}</small>}
        </div>

        <div className="client-modal__ligne">
          <div className={champ('phone')}>
            <label htmlFor="cl-tel">Téléphone *</label>
            <input id="cl-tel" type="tel" inputMode="tel" value={form.phone} onChange={maj('phone')} placeholder="77 123 45 67" />
            {erreurs.phone && (
              <small className="champ__erreur">
                {erreurs.phone}{' '}
                {doublon && <Link to={`/admin/clients/${doublon.id}`} onClick={onFermer}>Ouvrir sa fiche</Link>}
              </small>
            )}
          </div>
          <div className={champ('email')}>
            <label htmlFor="cl-email">Email</label>
            <input id="cl-email" type="email" value={form.email} onChange={maj('email')} placeholder="facultatif" />
            {erreurs.email && <small className="champ__erreur">{erreurs.email}</small>}
          </div>
        </div>

        <div className="champ">
          <label htmlFor="cl-nat">Nationalité</label>
          <input id="cl-nat" list="cl-nationalites" value={form.nationalite} onChange={maj('nationalite')} />
          <datalist id="cl-nationalites">
            {NATIONALITES.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>

        <fieldset className="client-modal__piece">
          <legend>Pièce d’identité</legend>
          <div className="client-modal__ligne">
            <div className={champ('piece_type')}>
              <label htmlFor="cl-piece">Type</label>
              <select id="cl-piece" value={form.piece_type} onChange={maj('piece_type')}>
                <option value="">—</option>
                {PIECES_IDENTITE.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              {erreurs.piece_type && <small className="champ__erreur">{erreurs.piece_type}</small>}
            </div>
            <div className="champ">
              <label htmlFor="cl-num">Numéro</label>
              <input id="cl-num" value={form.piece_numero} onChange={maj('piece_numero')} placeholder="1 234 1985 01234" />
            </div>
          </div>
          <small className="client-modal__aide">Obligatoire au check-in, peut être complétée à l’arrivée du client.</small>
        </fieldset>

        <div className="champ">
          <label htmlFor="cl-notes">Notes internes</label>
          <textarea id="cl-notes" rows={3} value={form.notes} onChange={maj('notes')}
            placeholder="Préférences, remarques… (jamais visibles par le client)" />
        </div>

        <div className="client-modal__actions">
          <button type="button" className="btn btn-contour" onClick={onFermer} disabled={envoi}>Annuler</button>
          <button type="submit" className="btn btn-rouge" disabled={envoi}>
            {envoi ? 'Enregistrement…' : creation ? 'Ajouter le client' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

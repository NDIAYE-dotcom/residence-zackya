import { useState } from 'react';
import './AccesTransmis.css';

// Récapitulatif des accès à transmettre à l'employé (copie ou WhatsApp)
export default function AccesTransmis({ nom, email, password, actif = true, onTerminer }) {
  const [copie, setCopie] = useState(false);
  const adresse = `${window.location.origin}/admin`;

  const message =
    `Bonjour ${nom}, voici vos accès à l’administration Zaquia Résidence :\n` +
    `Adresse : ${adresse}\n` +
    (email ? `Email : ${email}\n` : '') +
    `Mot de passe : ${password}`;

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  };

  return (
    <div className="acces">
      <p className="acces__intro">
        Transmettez ces informations à <strong>{nom}</strong>. Le mot de passe ne sera plus affiché ensuite.
      </p>

      <dl className="acces__liste">
        <dt>Adresse</dt><dd>{adresse}</dd>
        {email && (<><dt>Email</dt><dd>{email}</dd></>)}
        <dt>Mot de passe</dt><dd className="acces__mdp">{password}</dd>
      </dl>

      {!actif && (
        <p className="acces__alerte">Le compte est <strong>inactif</strong> : activez-le dans la liste pour permettre la connexion.</p>
      )}

      <div className="acces__actions">
        <button type="button" className="btn btn-contour" onClick={copier}>{copie ? 'Copié ✓' : 'Copier'}</button>
        <a className="btn btn-contour" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          Envoyer par WhatsApp
        </a>
        <button type="button" className="btn btn-rouge" onClick={onTerminer}>Terminé</button>
      </div>
    </div>
  );
}

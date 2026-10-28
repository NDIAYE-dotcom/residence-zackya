import Modal from '../Modal/Modal.jsx';
import './Confirm.css';

/**
 * Confirmation des actions sensibles (supprimer, annuler, rembourser…).
 * children : contenu en plus (ex. champ « motif »).
 */
export default function Confirm({
  ouvert, titre = 'Confirmer', message, libelle = 'Confirmer', danger = true,
  enCours = false, desactive = false, onConfirmer, onAnnuler, children,
}) {
  return (
    <Modal
      ouvert={ouvert}
      titre={titre}
      onFermer={enCours ? undefined : onAnnuler}
      pied={
        <>
          <button type="button" className="btn btn-contour" onClick={onAnnuler} disabled={enCours}>Annuler</button>
          <button type="button" className={`btn ${danger ? 'btn-rouge' : 'btn-primaire'}`}
            onClick={onConfirmer} disabled={enCours || desactive}>
            {enCours ? 'Patientez…' : libelle}
          </button>
        </>
      }
    >
      {message && <p className="confirm__message">{message}</p>}
      {children}
    </Modal>
  );
}

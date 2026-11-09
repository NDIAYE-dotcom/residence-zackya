import { useMemo, useState } from 'react';
import Modal from '../../../components/Modal/Modal.jsx';
import { formatFCFA } from '../../../lib/format.js';
import './PdfPret.css';

/**
 * PDF prêt : partager (WhatsApp… sur téléphone), télécharger ou ouvrir.
 * Le partage est lancé par un clic sur un PDF déjà construit : le navigateur l'accepte toujours.
 */
export default function PdfPret({ pdf, document, onFermer }) {
  const fichier = useMemo(() => new File([pdf.blob], pdf.nom, { type: 'application/pdf' }), [pdf]);
  // Adresse temporaire du PDF créée au moment du clic, libérée une minute plus tard
  // (la libérer à la fermeture de la fenêtre cassait le téléchargement)
  const adresse = () => {
    const url = URL.createObjectURL(pdf.blob);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return url;
  };
  const partageable = typeof navigator.canShare === 'function' && navigator.canShare({ files: [fichier] });
  const [info, setInfo] = useState('');

  const libelle = document.type === 'facture' ? 'Facture' : 'Devis';
  const message = `${libelle} ${document.numero} · ${document.client_nom} · ${formatFCFA(document.total_ttc)}`;

  const partager = async () => {
    setInfo('');
    try {
      await navigator.share({ files: [fichier], title: pdf.nom, text: message });
    } catch (err) {
      if (err.name !== 'AbortError') setInfo('Partage impossible sur cet appareil : téléchargez le PDF puis envoyez-le sur WhatsApp.');
    }
  };

  const telecharger = () => {
    const lien = window.document.createElement('a');
    lien.href = adresse();
    lien.download = pdf.nom;
    window.document.body.appendChild(lien);
    lien.click();
    lien.remove();
    if (!partageable) setInfo('PDF téléchargé : dans WhatsApp, utilisez le trombone 📎 puis « Document » pour l’envoyer.');
  };

  return (
    <Modal ouvert titre={`${libelle} ${document.numero}`} onFermer={onFermer}>
      <div className="pdfpret">
        <p className="pdfpret__resume"><strong>{document.client_nom}</strong><span>{formatFCFA(document.total_ttc)}</span></p>
        {partageable && (
          <button type="button" className="btn btn-rouge" onClick={partager}>Partager (WhatsApp…)</button>
        )}
        <button type="button" className={`btn ${partageable ? 'btn-contour' : 'btn-rouge'}`} onClick={telecharger}>Télécharger le PDF</button>
        <button type="button" className="btn btn-contour" onClick={() => window.open(adresse(), '_blank')}>Ouvrir / imprimer</button>
        {info && <p className="pdfpret__info">{info}</p>}
      </div>
    </Modal>
  );
}

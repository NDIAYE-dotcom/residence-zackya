import './Chargement.css';

// Indicateur affiché pendant le téléchargement d'une page (chargement à la demande)
export default function Chargement({ pleinEcran = false }) {
  return (
    <div className={`chargement ${pleinEcran ? 'chargement--plein' : ''}`} role="status" aria-live="polite">
      <span className="chargement__roue" aria-hidden="true" />
      <span className="chargement__texte">Chargement…</span>
    </div>
  );
}

import './BrouillonRestaure.css';

// Bandeau affiché quand un formulaire a été pré-rempli depuis un brouillon
export default function BrouillonRestaure({ visible, onEffacer, libelle = 'Effacer le brouillon' }) {
  if (!visible) return null;
  return (
    <div className="brouillon" role="status">
      <span>Brouillon restauré : vous reprenez là où vous vous étiez arrêté.</span>
      <button type="button" onClick={onEffacer}>{libelle}</button>
    </div>
  );
}

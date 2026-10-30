import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Introuvable.css';

// Site public : adresse inconnue (lien erroné, ancienne page…)
export default function Introuvable() {
  useEffect(() => { document.title = 'Page introuvable · Zaquia Résidence'; }, []);
  return (
    <div className="introuvable">
      <span className="introuvable__code" aria-hidden="true">404</span>
      <h1>Cette page n’existe pas</h1>
      <p>Le lien est peut-être incomplet ou la page a été déplacée.</p>
      <div className="introuvable__liens">
        <Link className="btn btn-rouge" to="/">Retour à l’accueil</Link>
        <Link className="btn btn-contour" to="/studios">Voir nos studios</Link>
        <Link className="btn btn-contour" to="/suivi">Suivre ma réservation</Link>
      </div>
    </div>
  );
}

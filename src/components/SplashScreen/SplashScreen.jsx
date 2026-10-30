import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './SplashScreen.css';

/**
 * Écran d'ouverture de l'Administration.
 * La barre ROUGE se remplit progressivement par-dessus la barre BLEUE.
 * Quand elle atteint 100 %, on ouvre la page de connexion
 * (ou directement le tableau de bord si l'utilisateur est déjà connecté).
 */
const DUREE_MS = 3000; // durée totale du chargement

export default function SplashScreen() {
  const [progression, setProgression] = useState(0);
  const [sortie, setSortie] = useState(false);
  const navigate = useNavigate();
  const { session, profile, loading } = useAuth();

  // Animation fluide de 0 à 100 % avec requestAnimationFrame
  useEffect(() => {
    let debut = null;
    let frame;
    const animer = (t) => {
      if (debut === null) debut = t;
      const ratio = Math.min((t - debut) / DUREE_MS, 1);
      // easing : démarre vite, ralentit à la fin (effet "chargement réel")
      const eased = 1 - Math.pow(1 - ratio, 2.2);
      setProgression(Math.round(eased * 100));
      if (ratio < 1) frame = requestAnimationFrame(animer);
    };
    frame = requestAnimationFrame(animer);
    return () => cancelAnimationFrame(frame);
  }, []);

  // À 100 % (et session vérifiée) → fondu puis redirection
  useEffect(() => {
    if (progression < 100 || loading) return;
    setSortie(true);
    const accueil = profile?.role === 'menage' ? '/admin/menage' : '/admin/dashboard'; // ménage : ses tâches d'abord
    const destination = session && profile?.actif ? accueil : '/admin/login';
    const timer = setTimeout(() => navigate(destination, { replace: true }), 450);
    return () => clearTimeout(timer);
  }, [progression, loading, session, profile, navigate]);

  return (
    <div className={`splash ${sortie ? 'splash--sortie' : ''}`}>
      <img src="/logo-zaquia.png" alt="Zaquia Résidence" className="splash__logo" />

      <h1 className="splash__titre">Administration</h1>

      <div
        className="splash__barre"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progression}
        aria-label="Chargement de l'application"
      >
        <div className="splash__remplissage" style={{ width: `${progression}%` }} />
      </div>

      <p className="splash__texte">
        loading<span className="splash__points"><span>.</span><span>.</span><span>.</span><span>.</span></span>
      </p>
    </div>
  );
}

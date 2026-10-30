import { useEffect, useRef, useState } from 'react';
import './HeroDefilant.css';

// Photos de la résidence (public/hero : 1600 px ordinateur, 900 px téléphone)
const DIAPOS = [
  { n: 1, titre: 'Bienvenue à Zaquia Résidence', texte: 'Des studios meublés au cœur de Goumel, à Ziguinchor.', alt: 'Façade orange et bleue de Zaquia Résidence' },
  { n: 2, titre: 'Des salons chaleureux', texte: 'Lumières douces, cuir et décoration soignée.', alt: 'Salon avec canapés en cuir et mur en pierre éclairé' },
  { n: 3, titre: 'Cuisine et espace repas', texte: 'Pour vos séjours courts comme pour les longs.', alt: 'Cuisine avec bar en marbre et table à manger' },
  { n: 4, titre: 'Une décoration unique', texte: 'Un style inspiré de l’Afrique, pensé pour votre bien-être.', alt: 'Salon avec grand mur en mosaïque colorée' },
  { n: 5, titre: 'Comme chez vous', texte: 'Posez vos valises, on s’occupe du reste.', alt: 'Salon lumineux avec tableaux africains' },
];
const DUREE_MS = 6000;

/**
 * Grand diaporama de l'accueil : fondu + léger zoom, défilement automatique,
 * pause au survol, flèches, points, glisser au doigt. « children » = boutons d'action.
 */
export default function HeroDefilant({ children }) {
  const [index, setIndex] = useState(0);
  const [charges, setCharges] = useState(() => new Set([0, 1])); // images téléchargées seulement quand nécessaire
  const [survol, setSurvol] = useState(false);
  const [pause, setPause] = useState(false);
  const [mouvementReduit, setMouvementReduit] = useState(false);
  const debutToucher = useRef(null);
  const n = DIAPOS.length;

  useEffect(() => {
    const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMouvementReduit(requete.matches);
    const ecouter = (e) => setMouvementReduit(e.matches);
    requete.addEventListener('change', ecouter);
    return () => requete.removeEventListener('change', ecouter);
  }, []);

  const aller = (i) => {
    const cible = (i + n) % n;
    setIndex(cible);
    setCharges((c) => new Set([...c, cible, (cible + 1) % n]));
  };

  // Défilement automatique (arrêté au survol, en pause, ou si l'appareil demande moins d'animations)
  const arrete = survol || pause || mouvementReduit;
  useEffect(() => {
    if (arrete) return undefined;
    const t = setTimeout(() => aller(index + 1), DUREE_MS);
    return () => clearTimeout(t);
  }, [index, arrete]);

  const finToucher = (e) => {
    const ecart = e.changedTouches[0].clientX - debutToucher.current;
    if (Math.abs(ecart) > 50) aller(index + (ecart > 0 ? -1 : 1));
  };

  const diapo = DIAPOS[index];

  return (
    <section className={`hero ${arrete ? 'hero--arrete' : ''}`} aria-roledescription="carrousel" aria-label="Photos de la résidence"
      onMouseEnter={() => setSurvol(true)} onMouseLeave={() => setSurvol(false)}
      onTouchStart={(e) => { debutToucher.current = e.touches[0].clientX; }} onTouchEnd={finToucher}>
      {DIAPOS.map((d, i) => (
        <div key={d.n} className={`hero__diapo ${i === index ? 'hero__diapo--active' : ''}`} aria-hidden={i !== index}>
          {charges.has(i) && (
            <picture>
              <source media="(max-width: 700px)" srcSet={`/hero/hero-${d.n}-mobile.jpg`} />
              <img src={`/hero/hero-${d.n}.jpg`} alt={d.alt} fetchpriority={i === 0 ? 'high' : undefined} />
            </picture>
          )}
        </div>
      ))}
      <div className="hero__voile" aria-hidden="true" />

      <div className="hero__contenu">
        <span className="hero__surtitre">Ziguinchor · Goumel</span>
        <h1>Studios meublés<br /><em>à l’heure, à la nuit ou au mois</em></h1>
        <p key={index} className="hero__legende" aria-live="polite">
          <strong>{diapo.titre}.</strong> <span>{diapo.texte}</span>
        </p>
        <div className="hero__boutons">{children}</div>
      </div>

      <button type="button" className="hero__fleche hero__fleche--gauche" onClick={() => aller(index - 1)} aria-label="Photo précédente">‹</button>
      <button type="button" className="hero__fleche hero__fleche--droite" onClick={() => aller(index + 1)} aria-label="Photo suivante">›</button>

      <div className="hero__commandes">
        <div className="hero__points">
          {DIAPOS.map((d, i) => (
            <button key={d.n} type="button" className={i === index ? 'hero__point--actif' : ''} onClick={() => aller(i)}
              aria-label={`Photo ${i + 1} : ${d.titre}`} aria-current={i === index}>
              {/* Barre de progression jusqu'à la photo suivante */}
              {i === index && <span key={index} style={{ animationDuration: `${DUREE_MS}ms` }} />}
            </button>
          ))}
        </div>
        {!mouvementReduit && (
          <button type="button" className="hero__pause" onClick={() => setPause((p) => !p)}
            aria-label={pause ? 'Reprendre le défilement' : 'Mettre le défilement en pause'}>
            {pause ? '▶' : '❚❚'}
          </button>
        )}
      </div>
    </section>
  );
}

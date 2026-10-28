import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Galerie.css';

/**
 * Visionneuse plein écran des photos d'un studio.
 * Flèches, clavier (← → Échap), glisser au doigt, miniatures.
 */
export default function Galerie({ photos, indexInitial = 0, titre, onFermer }) {
  const [index, setIndex] = useState(indexInitial);
  const debutToucher = useRef(null);
  const fermerRef = useRef(onFermer);
  fermerRef.current = onFermer;
  const n = photos.length;

  const precedente = () => setIndex((i) => (i - 1 + n) % n);
  const suivante = () => setIndex((i) => (i + 1) % n);

  useEffect(() => {
    const clavier = (e) => {
      if (e.key === 'Escape') fermerRef.current();
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + n) % n);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % n);
    };
    document.addEventListener('keydown', clavier);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', clavier);
      document.body.style.overflow = '';
    };
  }, [n]);

  const finToucher = (e) => {
    const ecart = e.changedTouches[0].clientX - debutToucher.current;
    if (Math.abs(ecart) > 50) (ecart > 0 ? precedente : suivante)();
  };

  return createPortal(
    <div className="galerie" role="dialog" aria-modal="true" aria-label={`Photos – ${titre}`}>
      <header className="galerie__entete">
        <span><strong>{titre}</strong> · {index + 1} / {n}</span>
        <button type="button" className="galerie__fermer" onClick={onFermer} aria-label="Fermer">×</button>
      </header>

      <div className="galerie__scene"
        onTouchStart={(e) => { debutToucher.current = e.touches[0].clientX; }}
        onTouchEnd={finToucher}
        onClick={(e) => e.target === e.currentTarget && onFermer()}>
        <img key={photos[index]} src={photos[index]} alt={`${titre} – photo ${index + 1}`} />
        {n > 1 && (
          <>
            <button type="button" className="galerie__fleche galerie__fleche--gauche" onClick={precedente} aria-label="Photo précédente">‹</button>
            <button type="button" className="galerie__fleche galerie__fleche--droite" onClick={suivante} aria-label="Photo suivante">›</button>
          </>
        )}
      </div>

      {n > 1 && (
        <div className="galerie__miniatures">
          {photos.map((url, i) => (
            <button key={url} type="button" className={i === index ? 'galerie__miniature--active' : ''}
              onClick={() => setIndex(i)} aria-label={`Photo ${i + 1}`}>
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

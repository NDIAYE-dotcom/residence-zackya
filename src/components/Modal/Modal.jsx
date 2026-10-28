import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

// Pile des modales ouvertes : Échap ne ferme que celle du dessus
const pile = [];

/**
 * Fenêtre modale réutilisable.
 * onFermer absent (ex. pendant un envoi) = impossible de fermer.
 */
export default function Modal({ ouvert, titre, onFermer, children, pied, large = false }) {
  const fermerRef = useRef(onFermer);
  fermerRef.current = onFermer;

  useEffect(() => {
    if (!ouvert) return;
    const id = Symbol('modal');
    pile.push(id);
    const touche = (e) => {
      if (e.key === 'Escape' && pile[pile.length - 1] === id) fermerRef.current?.();
    };
    document.addEventListener('keydown', touche);
    document.body.style.overflow = 'hidden';
    return () => {
      pile.splice(pile.indexOf(id), 1);
      document.removeEventListener('keydown', touche);
      if (!pile.length) document.body.style.overflow = '';
    };
  }, [ouvert]);

  if (!ouvert) return null;

  // Rendu directement dans <body> : une modale ouverte depuis une autre reste bien au-dessus
  return createPortal(
    <div className="modal__voile" onMouseDown={(e) => e.target === e.currentTarget && onFermer?.()}>
      <div className={`modal ${large ? 'modal--large' : ''}`} role="dialog" aria-modal="true" aria-label={titre}>
        <header className="modal__entete">
          <h2>{titre}</h2>
          <button type="button" className="modal__fermer" onClick={() => onFermer?.()} disabled={!onFermer} aria-label="Fermer">×</button>
        </header>
        <div className="modal__corps">{children}</div>
        {pied && <footer className="modal__pied">{pied}</footer>}
      </div>
    </div>,
    document.body
  );
}

import { useRef, useState } from 'react';
import './Carrousel.css';

/**
 * Carrousel de photos en CSS (scroll-snap) :
 * glisser au doigt sur mobile, flèches sur ordinateur, clic = agrandir (onOuvrir).
 */
export default function Carrousel({ photos = [], alt = '', onOuvrir }) {
  const pisteRef = useRef(null);
  const [index, setIndex] = useState(0);
  const n = photos.length;

  if (!n) return <div className="carrousel carrousel--vide"><span>Photos bientôt disponibles</span></div>;

  const aller = (i) => {
    const piste = pisteRef.current;
    piste.scrollTo({ left: ((i + n) % n) * piste.clientWidth, behavior: 'smooth' });
  };

  const surDefilement = () => {
    const piste = pisteRef.current;
    setIndex(Math.round(piste.scrollLeft / piste.clientWidth));
  };

  return (
    <div className="carrousel">
      <div className="carrousel__piste" ref={pisteRef} onScroll={surDefilement}>
        {photos.map((url, i) => (
          <button key={url} type="button" className="carrousel__diapo" onClick={() => onOuvrir?.(i)}
            tabIndex={i === index ? 0 : -1} aria-label={`Agrandir la photo ${i + 1} sur ${n}`}>
            <img src={url} alt={`${alt} – photo ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} draggable="false" />
          </button>
        ))}
      </div>

      {n > 1 && (
        <>
          <button type="button" className="carrousel__fleche carrousel__fleche--gauche"
            onClick={() => aller(index - 1)} aria-label="Photo précédente">‹</button>
          <button type="button" className="carrousel__fleche carrousel__fleche--droite"
            onClick={() => aller(index + 1)} aria-label="Photo suivante">›</button>
          <span className="carrousel__compteur">{index + 1} / {n}</span>
          <div className="carrousel__points">
            {photos.map((url, i) => (
              <button key={url} type="button" className={i === index ? 'carrousel__point--actif' : ''}
                onClick={() => aller(i)} aria-label={`Voir la photo ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

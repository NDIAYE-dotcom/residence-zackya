import './BarresHorizontales.css';

/**
 * Classement en barres horizontales (une seule série, une seule couleur).
 * elements : [{ cle, libelle, valeur, texte, detail }] — texte = valeur formatée
 * couleur : 'bleu' | 'rouge'
 */
export default function BarresHorizontales({ elements, couleur = 'bleu', vide = 'Aucune donnée.' }) {
  if (!elements.length) return <p className="barresh__vide">{vide}</p>;
  const max = Math.max(...elements.map((e) => e.valeur), 1);
  const total = elements.reduce((t, e) => t + Math.max(e.valeur, 0), 0);
  return (
    <ul className="barresh">
      {elements.map((e) => (
        <li key={e.cle} title={`${e.libelle} : ${e.texte}`}>
          <span className="barresh__titre">
            <span>{e.libelle}</span>
            <strong>{e.texte}</strong>
          </span>
          <span className="barresh__piste">
            <span className={`barresh__barre barresh__barre--${couleur}`} style={{ width: `${(Math.max(e.valeur, 0) / max) * 100}%` }} />
          </span>
          <small>{e.detail ?? (total ? `${Math.round((Math.max(e.valeur, 0) / total) * 100)} %` : '')}</small>
        </li>
      ))}
    </ul>
  );
}

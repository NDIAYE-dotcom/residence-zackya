import { STATUTS_STUDIO, UNITES_FORMULE, formatFCFA } from '../../../lib/format.js';
import './StudioCarte.css';

// Carte d'un studio : photo, infos, prix « dès », statut et publication modifiables directement
export default function StudioCarte({ studio, onOuvrir, onStatut, onPublier, onSupprimer }) {
  const actifs = (studio.tarifs ?? []).filter((t) => t.actif);
  const moinsCher = actifs.reduce((min, t) => (!min || t.prix < min.prix ? t : min), null);
  const couverture = studio.photos?.[0];

  return (
    <article className="studio-carte">
      <div className="studio-carte__photo" style={couverture ? { backgroundImage: `url(${couverture})` } : undefined}>
        {!couverture && <span className="studio-carte__sans-photo">Aucune photo</span>}
        <span className={`badge badge-${studio.statut} studio-carte__statut`}>{STATUTS_STUDIO[studio.statut]}</span>
        {studio.photos.length > 1 && <span className="studio-carte__nb">{studio.photos.length} photos</span>}
      </div>

      <div className="studio-carte__corps">
        <div className="studio-carte__titre">
          <span className="studio-carte__code">{studio.code}</span>
          <h3>{studio.nom}</h3>
        </div>
        <p className="studio-carte__infos">
          {studio.categorie?.nom ?? 'Sans catégorie'} · {studio.capacite} pers. · Étage {studio.etage ?? 0}
          {studio.surface_m2 ? ` · ${studio.surface_m2} m²` : ''}
        </p>
        <p className="studio-carte__prix">
          {moinsCher ? (
            <>Dès <strong>{formatFCFA(moinsCher.prix)}</strong> / {UNITES_FORMULE[moinsCher.formule]} · {actifs.length} formule(s)</>
          ) : (
            <span className="studio-carte__alerte">Aucun tarif actif : non réservable</span>
          )}
        </p>

        <div className="studio-carte__rapide">
          <select value={studio.statut} onChange={(e) => onStatut(e.target.value)} aria-label={`Statut de ${studio.code}`}>
            {Object.entries(STATUTS_STUDIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="studio-carte__publie">
            <input type="checkbox" checked={studio.publie} onChange={(e) => onPublier(e.target.checked)} />
            Publié sur le site
          </label>
        </div>
      </div>

      <footer className="studio-carte__actions">
        <button className="btn btn-primaire" onClick={() => onOuvrir('infos')}>Modifier</button>
        <button className="btn btn-contour" onClick={() => onOuvrir('tarifs')}>Tarifs</button>
        <button className="btn btn-contour" onClick={() => onOuvrir('photos')}>Photos</button>
        <button className="studio-carte__supprimer" onClick={onSupprimer} aria-label={`Supprimer ${studio.code}`} title="Supprimer">
          Supprimer
        </button>
      </footer>
    </article>
  );
}

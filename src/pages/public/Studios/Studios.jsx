import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Carrousel from '../../../components/Carrousel/Carrousel.jsx';
import Galerie from '../../../components/Galerie/Galerie.jsx';
import { catalogueStudios } from '../../../services/public.js';
import { formatFCFA, ICONES_EQUIPEMENTS, UNITES_FORMULE, tarifMinimum } from '../../../lib/format.js';
import './Studios.css';

// Site public : galerie de tous les studios publiés
export default function Studios() {
  const [studios, setStudios] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [categorie, setCategorie] = useState('');
  const [personnes, setPersonnes] = useState(0);
  const [galerie, setGalerie] = useState(null);
  const [essai, setEssai] = useState(0);

  useEffect(() => { document.title = 'Nos studios · Zaquia Résidence'; }, []);

  useEffect(() => {
    setChargement(true);
    setErreur('');
    catalogueStudios()
      .then(setStudios)
      .catch(() => setErreur('Impossible d’afficher les studios pour le moment.'))
      .finally(() => setChargement(false));
  }, [essai]);

  const categories = useMemo(() => [...new Map(studios.filter((s) => s.categorie).map((s) => [s.categorie.id, s.categorie])).values()], [studios]);
  const visibles = studios.filter((s) => (!categorie || s.categorie?.id === categorie) && s.capacite >= personnes);

  return (
    <div className="pstudios">
      <header className="pstudios__entete">
        <h1>Nos studios</h1>
        <p>Studios meublés et équipés, à louer à l’heure, à la journée, à la nuit, à la semaine ou au mois.</p>
      </header>

      {studios.length > 0 && (
        <div className="pstudios__filtres">
          <div className="pstudios__puces" role="group" aria-label="Catégorie">
            <button type="button" className={!categorie ? 'pstudios__puce--active' : ''} onClick={() => setCategorie('')}>Tous</button>
            {categories.map((c) => (
              <button key={c.id} type="button" className={categorie === c.id ? 'pstudios__puce--active' : ''} onClick={() => setCategorie(c.id)}>{c.nom}</button>
            ))}
          </div>
          <label className="pstudios__personnes">
            Personnes
            <select value={personnes} onChange={(e) => setPersonnes(Number(e.target.value))}>
              <option value={0}>Toutes</option>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}{n === 6 ? ' et +' : ''}</option>)}
            </select>
          </label>
        </div>
      )}

      {chargement ? (
        <p className="pstudios__etat">Chargement des studios…</p>
      ) : erreur ? (
        <div className="pstudios__etat pstudios__etat--erreur">
          <p>{erreur}</p>
          <button className="btn btn-contour" onClick={() => setEssai((n) => n + 1)}>Réessayer</button>
        </div>
      ) : !visibles.length ? (
        <p className="pstudios__etat">{studios.length ? 'Aucun studio ne correspond à ces critères.' : 'Nos studios seront bientôt en ligne.'}</p>
      ) : (
        <div className="pstudios__grille">
          {visibles.map((s) => {
            const min = tarifMinimum(s.tarifs);
            const nuit = s.tarifs.find((t) => t.formule === 'nuitee');
            return (
              <article key={s.id} className="pcarte">
                <div className="pcarte__photo">
                  <Carrousel photos={s.photos} alt={s.nom} onOuvrir={(index) => setGalerie({ photos: s.photos, index, titre: s.nom })} />
                  {s.statut === 'maintenance' && <span className="pcarte__indispo">Momentanément indisponible</span>}
                </div>
                <div className="pcarte__corps">
                  <span className="pcarte__categorie">{s.categorie?.nom ?? 'Studio'}</span>
                  <h2><Link to={`/studios/${s.id}`}>{s.nom}</Link></h2>
                  <p className="pcarte__infos">👤 {s.capacite} pers.{s.surface_m2 ? ` · ${s.surface_m2} m²` : ''}</p>
                  {s.equipements.length > 0 && (
                    <ul className="pcarte__equipements">
                      {s.equipements.slice(0, 4).map((e) => <li key={e}>{ICONES_EQUIPEMENTS[e] ?? '✓'} {e}</li>)}
                      {s.equipements.length > 4 && <li>+{s.equipements.length - 4}</li>}
                    </ul>
                  )}
                  <div className="pcarte__pied">
                    <div className="pcarte__prix">
                      {min ? <>À partir de <strong>{formatFCFA(min.prix)}</strong> / {UNITES_FORMULE[min.formule]}</> : 'Tarifs sur demande'}
                      {nuit && min?.formule !== 'nuitee' && <small>Nuitée : {formatFCFA(nuit.prix)}</small>}
                    </div>
                    <Link className="btn btn-primaire" to={`/studios/${s.id}`}>Voir</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {galerie && <Galerie photos={galerie.photos} indexInitial={galerie.index} titre={galerie.titre} onFermer={() => setGalerie(null)} />}
    </div>
  );
}

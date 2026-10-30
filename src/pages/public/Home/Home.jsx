import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rechercherDisponibles, lireParametres } from '../../../services/public.js';
import { FORMULES, formatFCFA } from '../../../lib/format.js';
import Carrousel from '../../../components/Carrousel/Carrousel.jsx';
import Galerie from '../../../components/Galerie/Galerie.jsx';
import HeroDefilant from './HeroDefilant.jsx';
import './Home.css';

// Site public : accueil et recherche de disponibilité
export default function Home() {
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [formule, setFormule] = useState('nuitee');
  const [resultats, setResultats] = useState(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [galerie, setGalerie] = useState(null); // { photos, index, titre }
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    document.title = 'Zaquia Résidence · Studios meublés à Ziguinchor';
    lireParametres().then((p) => setWhatsapp(p.whatsapp ?? '')).catch(() => {});
  }, []);

  const rechercher = async (e) => {
    e.preventDefault();
    setErreur('');
    if (!debut || !fin || new Date(fin) <= new Date(debut)) return setErreur('Choisissez des dates valides.');
    setChargement(true);
    try {
      // Seuls les studios proposant la formule choisie (prix calculé) sont affichés
      setResultats((await rechercherDisponibles(formule, debut, fin)).filter((s) => s.prix != null));
    } catch {
      setErreur('Recherche impossible pour le moment.');
    } finally {
      setChargement(false);
    }
  };

  return (
    <div className="home">
      <HeroDefilant>
        <a className="btn btn-rouge" href="#recherche">
          <span className="hero__texte-long">Vérifier les disponibilités</span><span className="hero__texte-court">Réserver</span>
        </a>
        <Link className="btn btn-contour" to="/studios">
          <span className="hero__texte-long">Voir nos studios</span><span className="hero__texte-court">Nos studios</span>
        </Link>
      </HeroDefilant>

      {/* Recherche posée à cheval sur le bas des photos */}
      <section className="home__cadre-recherche" id="recherche">
        <form className="home__recherche" onSubmit={rechercher}>
          <div className="champ">
            <label htmlFor="h-formule">Formule</label>
            <select id="h-formule" value={formule} onChange={(e) => setFormule(e.target.value)}>
              {Object.entries(FORMULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="champ">
            <label htmlFor="h-debut">Arrivée</label>
            <input id="h-debut" type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} />
          </div>
          <div className="champ">
            <label htmlFor="h-fin">Départ</label>
            <input id="h-fin" type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} />
          </div>
          <button className="btn btn-rouge" disabled={chargement}>{chargement ? 'Recherche…' : 'Voir les disponibilités'}</button>
          {erreur && <p className="home__erreur">{erreur}</p>}
        </form>
      </section>

      <ul className="home__atouts">
        <li><span aria-hidden="true">🏠</span><strong>Studios meublés et équipés</strong><small>Prêts à vivre dès votre arrivée</small></li>
        <li><span aria-hidden="true">⏱</span><strong>À l’heure, à la nuit ou au mois</strong><small>La formule qui vous convient</small></li>
        <li><span aria-hidden="true">💬</span><strong>Confirmation par WhatsApp</strong><small>{whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">Écrivez-nous</a> : 'Réponse rapide'}</small></li>
        <li><span aria-hidden="true">📱</span><strong>Wave, Orange Money, espèces</strong><small>Payez comme vous voulez</small></li>
      </ul>

      <section id="studios" className="home__resultats">
        {!resultats ? (
          <div className="home__invitation">
            <p>Choisissez vos dates pour voir les studios libres et leur prix, ou découvrez tous nos studios.</p>
            <Link className="btn btn-contour" to="/studios">Voir tous nos studios</Link>
          </div>
        ) : (
          <>
            <h2>{resultats.length ? `${resultats.length} studio(s) disponible(s)` : 'Aucun studio disponible sur ces dates'}</h2>
            {!resultats.length && <p className="home__vide">Essayez d’autres dates ou une autre formule, ou contactez-nous sur WhatsApp.</p>}
            <div className="home__cartes">
              {resultats.map((s) => (
                <article key={s.id} className="home__carte">
                  <div className="home__photo">
                    <Carrousel photos={s.photos} alt={s.nom}
                      onOuvrir={(index) => setGalerie({ photos: s.photos, index, titre: s.nom })} />
                  </div>
                  <div className="home__carte-corps">
                    <h3><Link to={`/studios/${s.id}`}>{s.nom}</Link></h3>
                    <p>{s.capacite} pers. · {s.equipements.slice(0, 3).join(' · ')}</p>
                    <div className="home__carte-pied">
                      <strong>{formatFCFA(s.prix)}</strong>
                      <Link className="btn btn-primaire"
                        to={`/reserver?studio=${s.id}&formule=${formule}&debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`}>
                        Réserver
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {galerie && (
        <Galerie photos={galerie.photos} indexInitial={galerie.index} titre={galerie.titre}
          onFermer={() => setGalerie(null)} />
      )}
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase.js';
import { FORMULES, formatFCFA } from '../../../lib/format.js';
import Carrousel from '../../../components/Carrousel/Carrousel.jsx';
import Galerie from '../../../components/Galerie/Galerie.jsx';
import './Home.css';

// Site public : recherche de disponibilité (étape suivante : tunnel /reserver)
export default function Home() {
  const [debut, setDebut] = useState('');
  const [fin, setFin] = useState('');
  const [formule, setFormule] = useState('nuitee');
  const [resultats, setResultats] = useState(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const [galerie, setGalerie] = useState(null); // { photos, index, titre }
  const [menuOuvert, setMenuOuvert] = useState(false); // menu ☰ sur mobile

  const rechercher = async (e) => {
    e.preventDefault();
    setErreur('');
    if (!debut || !fin || new Date(fin) <= new Date(debut)) return setErreur('Choisissez des dates valides.');
    setChargement(true);
    const p = { p_debut: new Date(debut).toISOString(), p_fin: new Date(fin).toISOString() };
    const { data, error } = await supabase.rpc('studios_disponibles', p);
    if (error) { setErreur('Recherche impossible pour le moment.'); setChargement(false); return; }

    // Prix de chaque studio pour la formule choisie
    const avecPrix = await Promise.all((data ?? []).map(async (s) => {
      const { data: prix } = await supabase.rpc('calculer_prix', { p_studio: s.id, p_formule: formule, ...p });
      return { ...s, prix };
    }));
    setResultats(avecPrix);
    setChargement(false);
  };

  return (
    <div className="home">
      <header className="home__nav">
        <img src="/logo-zaquia.png" alt="Zaquia Résidence" />
        <button type="button" className="home__burger" onClick={() => setMenuOuvert((o) => !o)}
          aria-expanded={menuOuvert} aria-controls="home-menu" aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}>
          {menuOuvert ? '×' : '☰'}
        </button>
        <nav id="home-menu" className={menuOuvert ? 'home__menu--ouvert' : ''}>
          <a href="#studios" onClick={() => setMenuOuvert(false)}>Nos studios</a>
          <Link to="/suivi" onClick={() => setMenuOuvert(false)}>Suivre ma réservation</Link>
        </nav>
      </header>

      <section className="home__hero">
        <div className="home__hero-texte">
          <h1>Studios meublés à Ziguinchor,<br /><em>à l’heure, à la journée ou à la nuit.</em></h1>
          <p>Réservez en ligne en 2 minutes. Confirmation rapide par WhatsApp.</p>
        </div>

        <form className="home__recherche" onSubmit={rechercher}>
          <div className="champ">
            <label>Formule</label>
            <select value={formule} onChange={(e) => setFormule(e.target.value)}>
              {Object.entries(FORMULES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="champ">
            <label>Arrivée</label>
            <input type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} />
          </div>
          <div className="champ">
            <label>Départ</label>
            <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} />
          </div>
          <button className="btn btn-rouge" disabled={chargement}>{chargement ? 'Recherche…' : 'Voir les disponibilités'}</button>
          {erreur && <p className="home__erreur">{erreur}</p>}
        </form>
      </section>

      <section id="studios" className="home__resultats">
        {resultats && (
          <>
            <h2>{resultats.length} studio(s) disponible(s)</h2>
            <div className="home__cartes">
              {resultats.map((s) => (
                <article key={s.id} className="home__carte">
                  <div className="home__photo">
                    <Carrousel photos={s.photos} alt={s.nom}
                      onOuvrir={(index) => setGalerie({ photos: s.photos, index, titre: s.nom })} />
                  </div>
                  <div className="home__carte-corps">
                    <h3>{s.nom}</h3>
                    <p>{s.capacite} pers. · {s.equipements.slice(0, 3).join(' · ')}</p>
                    <div className="home__carte-pied">
                      <strong>{s.prix != null ? formatFCFA(s.prix) : '—'}</strong>
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

      <footer className="home__pied">
        © {new Date().getFullYear()} Zaquia Résidence · <Link to="/admin">Administration</Link>
      </footer>
    </div>
  );
}

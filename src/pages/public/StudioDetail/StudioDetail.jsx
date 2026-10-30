import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Carrousel from '../../../components/Carrousel/Carrousel.jsx';
import Galerie from '../../../components/Galerie/Galerie.jsx';
import { studioPublic, lireParametres } from '../../../services/public.js';
import { formatFCFA, FORMULES, ICONES_EQUIPEMENTS, UNITES_FORMULE, tarifMinimum } from '../../../lib/format.js';
import CalendrierDispo from './CalendrierDispo.jsx';
import './StudioDetail.css';

const ORDRE_FORMULES = Object.keys(FORMULES);

// Site public : page d'un studio (photos, équipements, prix, disponibilités)
export default function StudioDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [studio, setStudio] = useState(null);
  const [params, setParams] = useState({});
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [galerie, setGalerie] = useState(null);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    Promise.all([studioPublic(id), lireParametres().catch(() => ({}))])
      .then(([s, p]) => {
        if (annule) return;
        setStudio(s);
        setParams(p);
        document.title = s ? `${s.nom} · Zaquia Résidence` : 'Studio introuvable · Zaquia Résidence';
      })
      .catch(() => { if (!annule) setErreur('Impossible d’afficher ce studio pour le moment.'); })
      .finally(() => { if (!annule) setChargement(false); });
    return () => { annule = true; };
  }, [id]);

  if (chargement) return <p className="pdetail__etat">Chargement…</p>;
  if (erreur) return <p className="pdetail__etat pdetail__etat--erreur">{erreur}</p>;
  if (!studio) {
    return (
      <div className="pdetail__etat">
        <p>Ce studio n’existe pas ou n’est plus proposé.</p>
        <Link className="btn btn-contour" to="/studios">Voir nos studios</Link>
      </div>
    );
  }

  const tarifs = [...studio.tarifs].sort((a, b) => ORDRE_FORMULES.indexOf(a.formule) - ORDRE_FORMULES.indexOf(b.formule));
  const min = tarifMinimum(tarifs);
  const formuleDefaut = tarifs.some((t) => t.formule === 'nuitee') ? 'nuitee' : tarifs[0]?.formule;
  const indisponible = studio.statut === 'maintenance';

  // Clic sur un jour du calendrier → réservation pré-remplie (nuitée de ce jour par défaut)
  const reserverLe = (jour) => {
    const lendemain = new Date(`${jour}T00:00:00`);
    lendemain.setDate(lendemain.getDate() + 1);
    const j2 = `${lendemain.getFullYear()}-${String(lendemain.getMonth() + 1).padStart(2, '0')}-${String(lendemain.getDate()).padStart(2, '0')}`;
    const debut = `${jour}T${params.nuitee_debut ?? '18:00'}`;
    const fin = `${j2}T${params.nuitee_fin ?? '12:00'}`;
    navigate(`/reserver?studio=${studio.id}&formule=${formuleDefaut ?? 'nuitee'}&debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`);
  };

  const whatsapp = params.whatsapp
    ? `https://wa.me/${params.whatsapp}?text=${encodeURIComponent(`Bonjour, je suis intéressé(e) par le ${studio.nom}. Est-il disponible ?`)}`
    : null;

  return (
    <div className="pdetail">
      <Link to="/studios" className="pdetail__retour">← Tous nos studios</Link>

      <div className="pdetail__photos">
        <Carrousel photos={studio.photos} alt={studio.nom} onOuvrir={(index) => setGalerie({ index })} />
        {studio.photos.length > 1 && (
          <button type="button" className="pdetail__toutes" onClick={() => setGalerie({ index: 0 })}>
            Voir les {studio.photos.length} photos
          </button>
        )}
      </div>

      <div className="pdetail__grille">
        <div className="pdetail__principal">
          <header>
            <span className="pdetail__categorie">{studio.categorie?.nom ?? 'Studio meublé'}</span>
            <h1>{studio.nom}</h1>
            <p className="pdetail__infos">
              👤 Jusqu’à {studio.capacite} personne(s)
              {studio.surface_m2 ? ` · 📐 ${studio.surface_m2} m²` : ''}
              {` · 🏢 ${studio.etage ? `${studio.etage}ᵉ étage` : 'Rez-de-chaussée'}`}
            </p>
            {indisponible && <p className="pdetail__indispo">Ce studio est momentanément indisponible (entretien en cours).</p>}
          </header>

          {(studio.description || studio.categorie?.description) && (
            <section>
              <h2>Description</h2>
              <p className="pdetail__texte">{studio.description || studio.categorie.description}</p>
            </section>
          )}

          {studio.equipements.length > 0 && (
            <section>
              <h2>Équipements</h2>
              <ul className="pdetail__equipements">
                {studio.equipements.map((e) => <li key={e}><span aria-hidden="true">{ICONES_EQUIPEMENTS[e] ?? '✓'}</span>{e}</li>)}
              </ul>
            </section>
          )}

          <section>
            <h2>Tarifs</h2>
            {!tarifs.length ? (
              <p className="pdetail__texte">Tarifs sur demande : contactez-nous.</p>
            ) : (
              <ul className="pdetail__tarifs">
                {tarifs.map((t) => (
                  <li key={t.formule}>
                    <span>{FORMULES[t.formule]}</span>
                    <strong>{formatFCFA(t.prix)}</strong>
                    <small>/ {UNITES_FORMULE[t.formule]}</small>
                  </li>
                ))}
              </ul>
            )}
            {tarifs.some((t) => t.formule === 'nuitee') && (
              <p className="pdetail__note">Nuitée : arrivée à partir de {params.nuitee_debut ?? '18:00'}, départ avant {params.nuitee_fin ?? '12:00'} le lendemain.</p>
            )}
          </section>

          {!indisponible && (
            <section>
              <h2>Disponibilités</h2>
              <p className="pdetail__note">Touchez un jour libre pour réserver une nuitée à partir de ce jour.</p>
              <CalendrierDispo studioId={studio.id} onChoisir={tarifs.length ? reserverLe : undefined} />
            </section>
          )}
        </div>

        <aside className="pdetail__reserver">
          {min && <p className="pdetail__apartir">À partir de<strong>{formatFCFA(min.prix)}</strong><span>/ {UNITES_FORMULE[min.formule]}</span></p>}
          {!indisponible && tarifs.length > 0 && (
            <Link className="btn btn-rouge" to={`/reserver?studio=${studio.id}&formule=${formuleDefaut}`}>Réserver ce studio</Link>
          )}
          {whatsapp && <a className="btn btn-contour" href={whatsapp} target="_blank" rel="noreferrer">Une question ? WhatsApp</a>}
          <ul className="pdetail__atouts">
            <li>✓ Confirmation rapide par WhatsApp</li>
            <li>✓ Paiement à l’arrivée ou acompte</li>
            <li>✓ À l’heure, à la nuit ou au mois</li>
          </ul>
        </aside>
      </div>

      {galerie && <Galerie photos={studio.photos} indexInitial={galerie.index} titre={studio.nom} onFermer={() => setGalerie(null)} />}
    </div>
  );
}

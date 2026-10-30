import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { lireParametres } from '../../services/public.js';
import './PublicLayout.css';

const LIENS = [
  { to: '/', label: 'Accueil', fin: true },
  { to: '/studios', label: 'Nos studios' },
  { to: '/suivi', label: 'Suivre ma réservation' },
];

// Entête + pied de page communs à tout le site de réservation
export default function PublicLayout() {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [coordonnees, setCoordonnees] = useState({});
  const { pathname } = useLocation();

  useEffect(() => { lireParametres().then(setCoordonnees).catch(() => {}); }, []);
  useEffect(() => { setMenuOuvert(false); window.scrollTo(0, 0); }, [pathname]); // nouvelle page : menu fermé, en haut

  const whatsapp = coordonnees.whatsapp
    ? `https://wa.me/${coordonnees.whatsapp}?text=${encodeURIComponent('Bonjour Zaquia Résidence, je souhaite des informations sur vos studios.')}`
    : null;

  return (
    <div className="site">
      {/* Barre flottante en verre dépoli (passe par-dessus les photos de l'accueil) */}
      <header className="site__entete">
        <div className="site__barre">
        <Link to="/" className="site__logo" aria-label="Zaquia Résidence – accueil">
          <img src="/logo-zaquia.png" alt="Zaquia Résidence" />
        </Link>
        <button type="button" className="site__burger" onClick={() => setMenuOuvert((o) => !o)}
          aria-expanded={menuOuvert} aria-controls="site-menu" aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}>
          {menuOuvert ? '×' : '☰'}
        </button>
        <nav id="site-menu" className={`site__menu ${menuOuvert ? 'site__menu--ouvert' : ''}`}>
          {LIENS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.fin} className={({ isActive }) => (isActive ? 'site__lien--actif' : '')}>{l.label}</NavLink>
          ))}
          {whatsapp && <a className="btn btn-rouge site__whatsapp" href={whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}
        </nav>
        </div>
      </header>

      <main className="site__contenu">
        <Outlet />
      </main>

      <footer className="site__pied">
        <div className="site__pied-grille">
          <div>
            <img src="/logo-zaquia.png" alt="" className="site__pied-logo" />
            <p>Studios meublés à l’heure, à la journée, à la nuit, à la semaine ou au mois.</p>
          </div>
          <div>
            <h2>Nous trouver</h2>
            <p>{coordonnees.adresse ?? 'Ziguinchor, Sénégal'}</p>
            {coordonnees.telephone_fixe && <p>Tél : <a href={`tel:${coordonnees.telephone_fixe.replace(/\s/g, '')}`}>{coordonnees.telephone_fixe}</a></p>}
            {coordonnees.telephone && <p>Mobile : <a href={`tel:${coordonnees.telephone.replace(/\s/g, '')}`}>{coordonnees.telephone}</a></p>}
            {coordonnees.email && <p><a href={`mailto:${coordonnees.email}`}>{coordonnees.email}</a></p>}
            {whatsapp && <p><a href={whatsapp} target="_blank" rel="noreferrer">Écrire sur WhatsApp</a></p>}
          </div>
          <div>
            <h2>Liens</h2>
            {LIENS.map((l) => <p key={l.to}><Link to={l.to}>{l.label}</Link></p>)}
          </div>
        </div>
        <p className="site__copyright">
          © {new Date().getFullYear()} {coordonnees.nom_residence ?? 'Zaquia Résidence'}
          {coordonnees.rccm ? ` · RCCM ${coordonnees.rccm}` : ''} · <Link to="/admin">Administration</Link>
        </p>
      </footer>
    </div>
  );
}

import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES_STAFF } from '../../lib/format.js';
import { useAlertesReservations } from '../../hooks/useAlertesReservations.js';
import AlertesReservations from '../../components/AlertesReservations/AlertesReservations.jsx';
import Chargement from '../../components/Chargement/Chargement.jsx';
import './AdminLayout.css';

// Menu : "roles" = qui voit l'entrée (absent = tout le personnel)
const MENU = [
  { to: '/admin/dashboard',    label: 'Tableau de bord' },
  { to: '/admin/planning',     label: 'Planning' },
  { to: '/admin/reservations', label: 'Réservations', roles: ['admin','gerant','receptionniste','comptable'] },
  { to: '/admin/clients',      label: 'Clients',      roles: ['admin','gerant','receptionniste'] },
  { to: '/admin/studios',      label: 'Studios & tarifs', roles: ['admin','gerant'] },
  { to: '/admin/caisse',       label: 'Caisse',       roles: ['admin','gerant','receptionniste','comptable'] },
  { to: '/admin/depenses',     label: 'Dépenses',     roles: ['admin','gerant','comptable'] },
  { to: '/admin/menage',       label: 'Ménage' },
  { to: '/admin/maintenance',  label: 'Maintenance' },
  { to: '/admin/rapports',     label: 'Rapports',     roles: ['admin','gerant','comptable'] },
  { to: '/admin/personnel',    label: 'Personnel',    roles: ['admin'] },
  { to: '/admin/parametres',   label: 'Paramètres',   roles: ['admin'] },
];

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const { pathname } = useLocation();

  // Titre de l'onglet : nom du module (pratique avec plusieurs onglets ouverts)
  useEffect(() => {
    const module = MENU.find((m) => pathname.startsWith(m.to));
    document.title = `${module?.label ?? 'Administration'} · Zaquia Admin`;
  }, [pathname]);

  const items = MENU.filter((m) => !m.roles || m.roles.includes(profile?.role));

  // Alertes temps réel des réservations en ligne (personnes qui les confirment)
  const recoitAlertes = ['admin', 'gerant', 'receptionniste'].includes(profile?.role);
  const { enAttente, alertes, son, activerSon, couperSon, fermer } = useAlertesReservations(recoitAlertes);

  const deconnexion = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin">
      <a className="lien-evitement" href="#contenu-admin">Aller au contenu</a>
      <aside className={`admin__sidebar ${menuOuvert ? 'admin__sidebar--ouvert' : ''}`}>
        <div className="admin__marque">
          <img src="/logo-zaquia.png" alt="Zaquia Résidence" />
        </div>
        <nav className="admin__nav">
          {items.map((m) => (
            <NavLink key={m.to} to={m.to} onClick={() => setMenuOuvert(false)}
              className={({ isActive }) => `admin__lien ${isActive ? 'admin__lien--actif' : ''}`}>
              {m.label}
              {m.to === '/admin/reservations' && recoitAlertes && enAttente > 0 && (
                <span className="admin__pastille" title={`${enAttente} réservation(s) à confirmer`}>{enAttente}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {menuOuvert && <div className="admin__voile" onClick={() => setMenuOuvert(false)} />}

      <div className="admin__principal">
        <header className="admin__entete">
          <button className="admin__burger" onClick={() => setMenuOuvert(true)} aria-label="Ouvrir le menu">☰</button>
          {recoitAlertes && (
            <button type="button" className={`admin__cloche ${son ? 'admin__cloche--active' : ''}`}
              onClick={son ? couperSon : activerSon}
              title={son ? 'Alertes sonores activées (cliquer pour couper)' : 'Activer les alertes sonores des réservations en ligne'}>
              {son ? '🔔' : '🔕'}<span>{son ? 'Alertes' : 'Activer le son'}</span>
              {enAttente > 0 && <em>{enAttente}</em>}
            </button>
          )}
          <div className="admin__utilisateur">
            <div>
              <strong>{profile?.full_name || 'Utilisateur'}</strong>
              <span>{ROLES_STAFF[profile?.role] ?? ''}</span>
            </div>
            <button className="btn btn-contour" onClick={deconnexion}>Déconnexion</button>
          </div>
        </header>
        <AlertesReservations alertes={alertes} onFermer={fermer} />
        <main className="admin__contenu" id="contenu-admin" tabIndex={-1}>
          <Suspense fallback={<Chargement />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

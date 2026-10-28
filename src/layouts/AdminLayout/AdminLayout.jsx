import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES_STAFF } from '../../lib/format.js';
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

  const items = MENU.filter((m) => !m.roles || m.roles.includes(profile?.role));

  const deconnexion = async () => {
    await signOut();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin">
      <aside className={`admin__sidebar ${menuOuvert ? 'admin__sidebar--ouvert' : ''}`}>
        <div className="admin__marque">
          <img src="/logo-zaquia.png" alt="Zaquia Résidence" />
        </div>
        <nav className="admin__nav">
          {items.map((m) => (
            <NavLink key={m.to} to={m.to} onClick={() => setMenuOuvert(false)}
              className={({ isActive }) => `admin__lien ${isActive ? 'admin__lien--actif' : ''}`}>
              {m.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {menuOuvert && <div className="admin__voile" onClick={() => setMenuOuvert(false)} />}

      <div className="admin__principal">
        <header className="admin__entete">
          <button className="admin__burger" onClick={() => setMenuOuvert(true)} aria-label="Ouvrir le menu">☰</button>
          <div className="admin__utilisateur">
            <div>
              <strong>{profile?.full_name || 'Utilisateur'}</strong>
              <span>{ROLES_STAFF[profile?.role] ?? ''}</span>
            </div>
            <button className="btn btn-contour" onClick={deconnexion}>Déconnexion</button>
          </div>
        </header>
        <main className="admin__contenu">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

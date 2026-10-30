import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout/AdminLayout.jsx';
import PublicLayout from './layouts/PublicLayout/PublicLayout.jsx';
import Home from './pages/public/Home/Home.jsx'; // page d'arrivée : chargée tout de suite
import Chargement from './components/Chargement/Chargement.jsx';

// Les autres pages sont téléchargées à la demande : un visiteur du site
// ne télécharge jamais le code de l'administration (et inversement).
const SplashScreen = lazy(() => import('./components/SplashScreen/SplashScreen.jsx'));
const Login = lazy(() => import('./pages/Login/Login.jsx'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard/Dashboard.jsx'));
const Studios = lazy(() => import('./pages/admin/Studios/Studios.jsx'));
const Personnel = lazy(() => import('./pages/admin/Personnel/Personnel.jsx'));
const Clients = lazy(() => import('./pages/admin/Clients/Clients.jsx'));
const ClientFiche = lazy(() => import('./pages/admin/Clients/ClientFiche.jsx'));
const Reservations = lazy(() => import('./pages/admin/Reservations/Reservations.jsx'));
const NouvelleReservation = lazy(() => import('./pages/admin/Reservations/NouvelleReservation.jsx'));
const ReservationFiche = lazy(() => import('./pages/admin/Reservations/ReservationFiche.jsx'));
const Planning = lazy(() => import('./pages/admin/Planning/Planning.jsx'));
const Caisse = lazy(() => import('./pages/admin/Caisse/Caisse.jsx'));
const Depenses = lazy(() => import('./pages/admin/Depenses/Depenses.jsx'));
const Rapports = lazy(() => import('./pages/admin/Rapports/Rapports.jsx'));
const Menage = lazy(() => import('./pages/admin/Menage/Menage.jsx'));
const Maintenance = lazy(() => import('./pages/admin/Maintenance/Maintenance.jsx'));
const Parametres = lazy(() => import('./pages/admin/Parametres/Parametres.jsx'));
const StudiosPublic = lazy(() => import('./pages/public/Studios/Studios.jsx'));
const StudioDetail = lazy(() => import('./pages/public/StudioDetail/StudioDetail.jsx'));
const Reserver = lazy(() => import('./pages/public/Reserver/Reserver.jsx'));
const Confirmation = lazy(() => import('./pages/public/Confirmation/Confirmation.jsx'));
const Suivi = lazy(() => import('./pages/public/Suivi/Suivi.jsx'));
const Introuvable = lazy(() => import('./pages/public/Introuvable/Introuvable.jsx'));

// Rôles autorisés par module
const ROLES_CLIENTS = ['admin', 'gerant', 'receptionniste'];
const ROLES_RESERVATIONS = ['admin', 'gerant', 'receptionniste', 'comptable']; // comptable : lecture seule
const ROLES_ARGENT = ['admin', 'gerant', 'comptable'];

export default function App() {
  return (
    <Suspense fallback={<Chargement pleinEcran />}>
      <Routes>
        {/* ===== SITE PUBLIC DE RÉSERVATION ===== */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/studios" element={<StudiosPublic />} />
          <Route path="/studios/:id" element={<StudioDetail />} />
          <Route path="/reserver" element={<Reserver />} />
          <Route path="/confirmation/:ref" element={<Confirmation />} />
          <Route path="/suivi" element={<Suivi />} />
          <Route path="*" element={<Introuvable />} />
        </Route>

        {/* ===== APPLICATION D'ADMINISTRATION ===== */}
        <Route path="/admin" element={<SplashScreen />} />
        <Route path="/admin/login" element={<Login />} />

        {/* Pages protégées (connexion obligatoire) */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/planning" element={<Planning />} />
          <Route path="/admin/reservations" element={<ProtectedRoute roles={ROLES_RESERVATIONS}><Reservations /></ProtectedRoute>} />
          <Route path="/admin/reservations/:id" element={<ProtectedRoute roles={ROLES_RESERVATIONS}><ReservationFiche /></ProtectedRoute>} />
          <Route path="/admin/reservations/nouvelle" element={<ProtectedRoute roles={ROLES_CLIENTS}><NouvelleReservation /></ProtectedRoute>} />
          <Route path="/admin/studios" element={<ProtectedRoute roles={['admin', 'gerant']}><Studios /></ProtectedRoute>} />
          <Route path="/admin/clients" element={<ProtectedRoute roles={ROLES_CLIENTS}><Clients /></ProtectedRoute>} />
          <Route path="/admin/clients/:id" element={<ProtectedRoute roles={ROLES_CLIENTS}><ClientFiche /></ProtectedRoute>} />
          <Route path="/admin/caisse" element={<ProtectedRoute roles={ROLES_RESERVATIONS}><Caisse /></ProtectedRoute>} />
          <Route path="/admin/depenses" element={<ProtectedRoute roles={ROLES_ARGENT}><Depenses /></ProtectedRoute>} />
          <Route path="/admin/menage" element={<Menage />} />
          <Route path="/admin/maintenance" element={<Maintenance />} />
          <Route path="/admin/rapports" element={<ProtectedRoute roles={ROLES_ARGENT}><Rapports /></ProtectedRoute>} />
          <Route path="/admin/personnel" element={<ProtectedRoute roles={['admin']}><Personnel /></ProtectedRoute>} />
          <Route path="/admin/parametres" element={<ProtectedRoute roles={['admin']}><Parametres /></ProtectedRoute>} />
          {/* Adresse inconnue dans l'administration → tableau de bord */}
          <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

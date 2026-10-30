import { Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen/SplashScreen.jsx';
import Login from './pages/Login/Login.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard/Dashboard.jsx';
import Studios from './pages/admin/Studios/Studios.jsx';
import Personnel from './pages/admin/Personnel/Personnel.jsx';
import Clients from './pages/admin/Clients/Clients.jsx';
import ClientFiche from './pages/admin/Clients/ClientFiche.jsx';
import Reservations from './pages/admin/Reservations/Reservations.jsx';
import NouvelleReservation from './pages/admin/Reservations/NouvelleReservation.jsx';
import ReservationFiche from './pages/admin/Reservations/ReservationFiche.jsx';
import Planning from './pages/admin/Planning/Planning.jsx';
import Caisse from './pages/admin/Caisse/Caisse.jsx';
import Depenses from './pages/admin/Depenses/Depenses.jsx';
import Rapports from './pages/admin/Rapports/Rapports.jsx';
import Menage from './pages/admin/Menage/Menage.jsx';
import Maintenance from './pages/admin/Maintenance/Maintenance.jsx';
import Home from './pages/public/Home/Home.jsx';
import EnConstruction from './components/EnConstruction.jsx';

// Rôles autorisés par module
const ROLES_CLIENTS = ['admin', 'gerant', 'receptionniste'];
const ROLES_RESERVATIONS = ['admin', 'gerant', 'receptionniste', 'comptable']; // comptable : lecture seule
const ROLES_ARGENT = ['admin', 'gerant', 'comptable'];

export default function App() {
  return (
    <Routes>
      {/* ===== SITE PUBLIC DE RÉSERVATION ===== */}
      <Route path="/" element={<Home />} />
      {/* À venir : /studios, /studios/:id, /reserver, /confirmation/:ref, /suivi */}

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
        <Route path="/admin/parametres" element={<EnConstruction titre="Paramètres" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

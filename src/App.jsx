import { Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen/SplashScreen.jsx';
import Login from './pages/Login/Login.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard/Dashboard.jsx';
import Home from './pages/public/Home/Home.jsx';
import EnConstruction from './components/EnConstruction.jsx';

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
        <Route path="/admin/planning" element={<EnConstruction titre="Planning" />} />
        <Route path="/admin/reservations" element={<EnConstruction titre="Réservations" />} />
        <Route path="/admin/studios" element={<EnConstruction titre="Studios & tarifs" />} />
        <Route path="/admin/clients" element={<EnConstruction titre="Clients" />} />
        <Route path="/admin/caisse" element={<EnConstruction titre="Caisse & paiements" />} />
        <Route path="/admin/depenses" element={<EnConstruction titre="Dépenses" />} />
        <Route path="/admin/menage" element={<EnConstruction titre="Ménage" />} />
        <Route path="/admin/maintenance" element={<EnConstruction titre="Maintenance" />} />
        <Route path="/admin/rapports" element={<EnConstruction titre="Rapports" />} />
        <Route path="/admin/personnel" element={<EnConstruction titre="Personnel" />} />
        <Route path="/admin/parametres" element={<EnConstruction titre="Paramètres" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

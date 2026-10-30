import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// roles (optionnel) : ex. ['admin','gerant'] pour restreindre une page
export default function ProtectedRoute({ children, roles }) {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  // Profil actif obligatoire (profil absent = compte supprimé ou non lisible)
  if (!session || !profile?.actif) return <Navigate to="/admin/login" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/admin/dashboard" replace />;

  return children;
}

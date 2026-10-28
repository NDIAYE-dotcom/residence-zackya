import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// roles (optionnel) : ex. ['admin','gerant'] pour restreindre une page
export default function ProtectedRoute({ children, roles }) {
  const { session, profile, loading } = useAuth();

  if (loading) return null;
  if (!session || (profile && !profile.actif)) return <Navigate to="/admin/login" replace />;
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/admin/dashboard" replace />;

  return children;
}

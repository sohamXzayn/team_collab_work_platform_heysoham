import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ adminOnly = false, bypassOrgCheck = false }) {
  const { currentUser, userData } = useAuth();

  if (!currentUser) {
    // Not logged in -> kick to login page
    return <Navigate to="/login" replace />;
  }

  // Check for ban status first
  if (userData && userData.status === 'banned') {
    // Account is suspended/banned -> redirect to an info page
    return <Navigate to="/banned" replace />;
  }

  // Redirect to Organization selection portal if user has no active org
  if (!bypassOrgCheck && userData && !userData.activeOrgId) {
    return <Navigate to="/org-portal" replace />;
  }

  // If route is admin only, check role
  if (adminOnly && userData?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
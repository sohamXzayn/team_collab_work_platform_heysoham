import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrganizationContext';

export default function ProtectedRoute({ adminOnly = false, requireOrg = false }) {
  const { currentUser, userData, loading } = useAuth();
  const { currentOrg, loadingOrgs } = useOrg();

  // Wait for context evaluations to complete safely
  if (loading || (currentUser && loadingOrgs)) {
    return <div className="loading-screen">Loading secure session...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && userData?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Only redirect if an organization is explicitly required for this route bundle
  if (requireOrg && !currentOrg) {
    return <Navigate to="/organizations" replace />;
  }

  return <Outlet />;
}
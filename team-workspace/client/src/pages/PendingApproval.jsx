import { useAuth } from '../context/AuthContext';
import './neumorphism.css';

export default function PendingApproval() {
  const { logout } = useAuth();

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🚫</div>
        <h2 className="auth-title">Account Suspended</h2>
        <p className="text-gray-muted mb-8" style={{ fontSize: '0.9rem' }}>
          Your access to this workspace has been revoked by an administrator. If you believe this is a mistake, please contact support.
        </p>
        <button onClick={logout} className="btn-outline">
          Log Out
        </button>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './neumorphism.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="brand-logo-container">
          <div className="brand-logo">📂</div>
        </div>

        <h2 className="auth-title">Welcome Back</h2>
        
        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="name@company.com" />
          </div>
          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="••••••••" />
          </div>
          
          <div className="auth-options">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" style={{ marginRight: '0.5rem', width: '1rem', height: '1rem', accentColor: 'var(--nm-accent)' }} />
              Remember me
            </label>
            <Link to="/forgot-password" title="Feature coming soon" className="auth-link">
              Forgot password?
            </Link>
          </div>

          <button disabled={loading} type="submit" className="btn-primary">
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="divider">Or continue with</div>

        <button type="button" className="btn-outline" onClick={() => alert('Social auth coming soon!')}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" style={{ width: '1.25rem', height: '1.25rem' }} alt="Google" />
          <span>Google</span>
        </button>

        <div className="auth-footer">
          New to the workspace? <Link to="/register" className="auth-link">Create an Account</Link>
        </div>
      </div>
    </div>
  );
}
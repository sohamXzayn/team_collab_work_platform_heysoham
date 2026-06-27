import { useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './neumorphism.css';
import sadLogo from '../assets/sad.png';



export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await signup(email, password, name);
      navigate('/');
    } catch (err) {
      setError('Failed to create an account. Email might already be in use.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="brand-logo-container">
          <div className="brand-logo" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={sadLogo}
              alt="CollabWorkspace logo"
              style={{ width: '48px', height: '48px', objectFit: 'contain', display: 'block' }}
            />
          </div>


        </div>

        <h2 className="auth-title">Join Workspace</h2>
        
        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label className="auth-label">Full Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Soham H." />
          </div>
          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="name@company.com" />
          </div>
          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="At least 6 characters" />
          </div>

          <button disabled={loading} type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
            {loading ? 'Creating Account...' : 'Get Started'}
          </button>
        </form>

        <div className="divider">Or register with</div>

        <button type="button" className="btn-outline" onClick={() => alert('Social auth coming soon!')}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" style={{ width: '1.25rem', height: '1.25rem' }} alt="Google" />
          <span>Google</span>
        </button>

        <div className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
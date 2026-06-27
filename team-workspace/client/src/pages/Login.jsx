import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import './neumorphism.css';
import sadLogo from '../assets/sad.png';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle standard Email & Password submission forms
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

  // Handle native Firebase Google Identity Sign-In Popups
  async function handleGoogleSignIn() {
    try {
      setError('');
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if real-time profile path exists; provision a document node if blank
      const userRef = ref(db, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      if (!snapshot.exists()) {
        await set(userRef, {
          name: user.displayName || 'Google User',
          email: user.email,
          role: 'member', // Default fallback authorization level 
          createdAt: Date.now()
        });
      }
      
      navigate('/');
    } catch (err) {
      setError('Google authenticating failed. Try once more.');
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

        <h2 className="auth-title" style={{ color: 'var(--nm-text)' }}>Welcome Back</h2>
        <p className="text-xs text-gray-muted text-center" style={{ marginTop: '-0.75rem', marginBottom: '1.5rem' }}>
          Connect to your enterprise workspace portal securely.
        </p>
        
        {error && (
          <div className="error-alert flex items-center gap-2" style={{ borderRadius: '1rem', padding: '0.75rem 1rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label className="auth-label">Email Address</label>
            <div className="input-group">
              <span className="material-symbols-outlined input-icon" style={{ color: 'var(--gray-500)' }}>mail</span>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="input-field" 
                placeholder="name@company.com" 
              />
            </div>
          </div>
          
          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <div className="input-group">
              <span className="material-symbols-outlined input-icon" style={{ color: 'var(--gray-500)' }}>lock</span>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="input-field" 
                placeholder="••••••••" 
              />
            </div>
          </div>
          
          <div className="auth-options" style={{ fontSize: '0.825rem', color: 'var(--nm-text)' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.25rem' }}>
              <input type="checkbox" style={{ width: '1rem', height: '1rem', accentColor: 'var(--nm-accent)' }} />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" title="Feature coming soon" className="auth-link" style={{ fontSize: '0.825rem' }}>
              Forgot password?
            </Link>
          </div>

          <button disabled={loading} type="submit" className="btn-primary w-full" style={{ borderRadius: '1rem', marginTop: '0.5rem' }}>
            {loading ? 'Processing transaction...' : 'Sign In'}
          </button>
        </form>

        <div className="divider" style={{ margin: '1.5rem 0', color: 'var(--gray-500)' }}>Or continue with</div>

        <button 
          disabled={loading}
          type="button" 
          className="btn-outline w-full flex items-center justify-center" 
          onClick={handleGoogleSignIn}
          style={{ borderRadius: '1rem', gap: '0.75rem', padding: '0.75rem' }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" style={{ width: '1.2rem', height: '1.2rem' }} alt="Google Identity Gateway" />
          <span className="font-bold text-sm" style={{ color: 'var(--nm-text)' }}>Authorize with Google</span>
        </button>

        <div className="auth-footer" style={{ color: 'var(--gray-500)', fontSize: '0.85rem', marginTop: '1.5rem' }}>
          New to the workspace? <Link to="/register" className="auth-link">Create an Account</Link>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { ref, push, set, update, get, query, orderByChild, equalTo } from 'firebase/database';
import './neumorphism.css';

export default function OrgPortal() {
  const { currentUser, userData } = useAuth();
  const [tab, setTab] = useState('join'); // 'join' or 'create'
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Helper to generate a random 6-character Invite Code
  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'ORG-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError('Please provide an organization name.');
      return;
    }

    try {
      setError('');
      setLoading(true);

      const code = generateInviteCode();
      const orgsRef = ref(db, 'organizations');
      const newOrgRef = push(orgsRef);
      const orgId = newOrgRef.key;

      // 1. Create Organization profile
      await set(ref(db, `organizations/${orgId}`), {
        name: orgName.trim(),
        owner: currentUser.uid,
        code: code,
        timestamp: Date.now()
      });

      // 2. Update user profile membership & activeOrgId
      const userUpdates = {};
      userUpdates[`users/${currentUser.uid}/orgs/${orgId}`] = true;
      userUpdates[`users/${currentUser.uid}/activeOrgId`] = orgId;
      await update(ref(db), userUpdates);

      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Failed to create organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrg = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Please input an invite code.');
      return;
    }

    try {
      setError('');
      setLoading(true);

      // Query database for an organization matching this invite code
      const orgsQuery = query(
        ref(db, 'organizations'),
        orderByChild('code'),
        equalTo(inviteCode.trim().toUpperCase())
      );

      const snapshot = await get(orgsQuery);
      const data = snapshot.val();

      if (!data) {
        setError('Invalid organization invite code. Please check and try again.');
        return;
      }

      const orgId = Object.keys(data)[0];

      // Update user profile membership & activeOrgId
      const userUpdates = {};
      userUpdates[`users/${currentUser.uid}/orgs/${orgId}`] = true;
      userUpdates[`users/${currentUser.uid}/activeOrgId`] = orgId;
      await update(ref(db), userUpdates);

      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Failed to join organization. Please verify your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '32rem' }}>
        <div className="brand-logo-container">
          <div className="brand-logo" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--nm-accent)' }}>🏢</div>
        </div>

        <h2 className="auth-title" style={{ marginBottom: '1.5rem' }}>Welcome to CollabWorkspace</h2>
        <p className="text-sm text-gray-muted text-center mb-6">
          To get started, please join an existing organization using an invite code or create a new organization for your team.
        </p>

        {/* Tab Header Selector */}
        <div className="flex gap-2 mb-6" style={{ borderBottom: '1px solid var(--nm-shadow-dark)', paddingBottom: '0.75rem' }}>
          <button
            onClick={() => { setTab('join'); setError(''); }}
            className="flex-1 py-2 font-bold text-xs rounded-lg transition"
            style={{
              border: 'none',
              cursor: 'pointer',
              backgroundColor: tab === 'join' ? 'var(--nm-accent)' : 'transparent',
              color: tab === 'join' ? 'white' : 'var(--nm-text)'
            }}
          >
            Join Organization
          </button>
          <button
            onClick={() => { setTab('create'); setError(''); }}
            className="flex-1 py-2 font-bold text-xs rounded-lg transition"
            style={{
              border: 'none',
              cursor: 'pointer',
              backgroundColor: tab === 'create' ? 'var(--nm-accent)' : 'transparent',
              color: tab === 'create' ? 'white' : 'var(--nm-text)'
            }}
          >
            Create Organization
          </button>
        </div>

        {error && <div className="error-alert">{error}</div>}

        {tab === 'join' ? (
          <form onSubmit={handleJoinOrg} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-label">Invite Code</label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="input-field"
                placeholder="e.g. ORG-AB12CD"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <button disabled={loading} type="submit" className="btn-primary" style={{ margin: 0 }}>
              {loading ? 'Joining Org...' : 'Join Workspace'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateOrg} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-label">Organization Name</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="input-field"
                placeholder="e.g. Acme Corporation"
              />
            </div>
            <button disabled={loading} type="submit" className="btn-primary" style={{ margin: 0 }}>
              {loading ? 'Creating Org...' : 'Create & Setup Workspace'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

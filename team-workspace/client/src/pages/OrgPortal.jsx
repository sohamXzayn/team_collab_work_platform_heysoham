import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { ref, push, set, update, get, query, orderByChild, equalTo, onValue } from 'firebase/database';
import './neumorphism.css';

export default function OrgPortal() {
  const { currentUser, userData } = useAuth();
  const [tab, setTab] = useState('join'); // 'join', 'create', or 'manage'
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  
  // Track active organization ID and data directly from database snapshots
  const [currentOrgId, setCurrentOrgId] = useState('');
  const [activeOrgData, setActiveOrgData] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // BULLETPROOF FIX: Listen directly to the user's database node for real-time changes
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Stream the activeOrgId directly from the user path to bypass context delays
    const userActiveOrgRef = ref(db, `users/${currentUser.uid}/activeOrgId`);
    
    const unsubscribe = onValue(userActiveOrgRef, async (snapshot) => {
      const activeOrgId = snapshot.val();
      if (activeOrgId) {
        setCurrentOrgId(activeOrgId);
        try {
          const orgSnapshot = await get(ref(db, `organizations/${activeOrgId}`));
          if (orgSnapshot.exists()) {
            const data = orgSnapshot.val();
            setActiveOrgData(data);
            setEditName(data.name || '');
            setEditLogo(data.logo || '🏢');
          }
        } catch (err) {
          console.error("Direct DB fetch error:", err);
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

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
      setSuccess('');
      setLoading(true);

      const code = generateInviteCode();
      const orgsRef = ref(db, 'organizations');
      const newOrgRef = push(orgsRef);
      const orgId = newOrgRef.key;

      const newOrgPayload = {
        name: orgName.trim(),
        createdBy: currentUser.uid,
        ownerName: userData?.name || 'Soham',
        code: code,
        logo: '🏢',
        createdAt: Date.now(),
        members: {
          [currentUser.uid]: {
            email: currentUser.email || '',
            joinedAt: Date.now(),
            name: userData?.name || 'Soham',
            role: 'owner'
          }
        }
      };

      await set(ref(db, `organizations/${orgId}`), newOrgPayload);

      const userUpdates = {};
      userUpdates[`users/${currentUser.uid}/orgs/${orgId}`] = true;
      userUpdates[`users/${currentUser.uid}/activeOrgId`] = orgId;
      await update(ref(db), userUpdates);

      setSuccess('Organization setup complete!');
      setTab('manage'); // Automatically open the settings panel to customize logo
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
      setSuccess('');
      setLoading(true);

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

      const updates = {};
      updates[`users/${currentUser.uid}/orgs/${orgId}`] = true;
      updates[`users/${currentUser.uid}/activeOrgId`] = orgId;
      updates[`organizations/${orgId}/members/${currentUser.uid}`] = {
        email: currentUser.email || '',
        joinedAt: Date.now(),
        name: userData?.name || 'Teammate',
        role: 'member'
      };

      await update(ref(db), updates);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Failed to join organization. Please verify your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrgDetails = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setError('Organization name cannot be blank.');
      return;
    }

    const targetOrgId = currentOrgId || userData?.activeOrgId;
    if (!targetOrgId) {
      setError('No active workspace target discovered.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const updates = {};
      const nextName = editName.trim();
      const nextLogo = editLogo.trim();

      updates[`organizations/${targetOrgId}/name`] = nextName;
      updates[`organizations/${targetOrgId}/logo`] = nextLogo;

      // Keep user's org list entry in sync for immediate UI updates elsewhere
      // (used by OrgSelectPage / sidebar org switch)
      if (currentUser?.uid) {
        updates[`users/${currentUser.uid}/organizations/${targetOrgId}/name`] = nextName;
      }

      await update(ref(db), updates);
      setSuccess('Organization details updated successfully!');

      setActiveOrgData(prev => ({ ...prev, name: nextName, logo: nextLogo }));

    } catch (err) {
      console.error(err);
      setError('Failed to update organization records.');
    } finally {
      setLoading(false);
    }
  };

  // Ownership: prefer the membership record stored on the user node.
  // This is more reliable than depending on organization snapshot shape.
  const isOwner =
    !!(currentUser?.uid &&
      activeOrgData?.createdBy === currentUser?.uid);

  // If org snapshot doesn't include member roles, fall back to the safer membership field.
  // (We don't have that data in this component unless organization snapshot contains it,
  //  so we keep a second check for org snapshot member role.)
  const isOwnerByOrgMembers =
    !!(activeOrgData?.members &&
      activeOrgData?.members?.[currentUser?.uid]?.role === 'owner');

  const canEditOrgDetails = isOwner || isOwnerByOrgMembers;


  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: '32rem' }}>
        <div className="brand-logo-container">
          <div className="brand-logo" style={{ background: 'rgba(79, 70, 229, 0.1)', color: 'var(--nm-accent)', fontSize: '1.75rem' }}>
            {editLogo || '🏢'}
          </div>
        </div>

        <h2 className="auth-title" style={{ marginBottom: '1.5rem' }}>
          {tab === 'manage' && activeOrgData ? `Manage ${activeOrgData.name}` : 'Welcome to CollabWorkspace'}
        </h2>
        
        <p className="text-sm text-gray-muted text-center mb-6">
          {tab === 'manage' 
            ? 'Modify your workspace parameters, branding labels, and icon aesthetics below.'
            : 'To get started, please join an existing organization using an invite code or create a new organization for your team.'}
        </p>

        {/* Tab Header Selector */}
        <div className="flex gap-2 mb-6" style={{ borderBottom: '1px solid var(--nm-shadow-dark)', paddingBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={() => { setTab('join'); setError(''); setSuccess(''); }}
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
            type="button"
            onClick={() => { setTab('create'); setError(''); setSuccess(''); }}
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
          
          {/* Settings tab now unlocks smoothly without context delays */}
          {canEditOrgDetails && (

            <button
              type="button"
              onClick={() => { setTab('manage'); setError(''); setSuccess(''); }}
              className="flex-1 py-2 font-bold text-xs rounded-lg transition"
              style={{
                border: 'none',
                cursor: 'pointer',
                backgroundColor: tab === 'manage' ? 'var(--nm-theme-error, #f43f5e)' : 'transparent',
                color: tab === 'manage' ? 'white' : 'var(--nm-text)'
              }}
            >
              ⚙️ Settings
            </button>
          )}
        </div>

        {error && <div className="error-alert" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="success-alert" style={{ marginBottom: '1rem', color: 'var(--emerald)', fontWeight: 'bold', fontSize: '0.85rem', textAlign: 'center' }}>{success}</div>}

        {tab === 'join' && (
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
        )}

        {tab === 'create' && (
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

        {tab === 'manage' && isOwner && (
          <form onSubmit={handleUpdateOrgDetails} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-label">Workspace Branding Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input-field"
                placeholder="Organization Name"
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Workspace Icon / Logo Symbol</label>
              <input
                type="text"
                required
                value={editLogo}
                onChange={(e) => setEditLogo(e.target.value)}
                className="input-field"
                placeholder="e.g. 🏢, 🚀, 💻 or an image URL string"
              />
            </div>

            <div className="auth-input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="auth-label" style={{ opacity: 0.6 }}>Active System Invite Code</label>
              <input
                type="text"
                disabled
                value={activeOrgData?.code || ''}
                className="input-field"
                style={{ cursor: 'not-allowed', opacity: 0.5, fontWeight: 'bold', letterSpacing: '0.05em' }}
              />
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => navigate('/')} 
                className="btn-primary" 
                style={{ margin: 0, backgroundColor: 'transparent', color: 'var(--nm-text)', border: '1px solid var(--border-color)' }}
              >
                Exit to Home
              </button>
              <button disabled={loading} type="submit" className="btn-primary" style={{ margin: 0, flex: 2 }}>
                {loading ? 'Saving Changes...' : 'Save Workspace Configurations'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
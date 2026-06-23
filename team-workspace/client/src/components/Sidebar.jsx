import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrganizationContext';
import { db } from '../services/firebase';
import { ref, onValue, push } from 'firebase/database';

export default function Sidebar() {
  const { userData, logout } = useAuth();
  const { currentOrg, myOrganizations, switchOrganization } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();
  const [channels, setChannels] = useState([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  // Handle building new interactive real-time multi-tenant text streams
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || !currentOrg?.id) return;
    try {
      const channelsRef = ref(db, `organizations/${currentOrg.id}/channels`);
      await push(channelsRef, {
        name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        createdAt: Date.now()
      });
      setNewChannelName('');
      setShowCreateChannel(false);
    } catch (err) {
      console.error("Failed to append tenant channel directory item:", err);
    }
  };

  // Synchronize realtime channel maps dynamically scoped under the chosen organization instance
  useEffect(() => {
    if (!currentOrg?.id) return;
    
    const channelsRef = ref(db, `organizations/${currentOrg.id}/channels`);
    const unsubscribe = onValue(channelsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setChannels(list);
      } else {
        setChannels([]);
      }
    });
    return () => unsubscribe();
  }, [currentOrg]);

  const handleOrgSwitch = (e) => {
    const targetId = e.target.value;
    const found = myOrganizations.find(o => o.id === targetId);
    if (found) {
      switchOrganization(found);
      navigate('/');
    }
  };

  return (
    <div className="sidebar-container">
      {/* Brand Workspace Header Context */}
      <div className="sidebar-header">
        <h1 className="sidebar-brand-title">Workspace Hub</h1>
        {userData?.role === 'admin' && (
          <Link to="/admin" className="admin-badge">Admin</Link>
        )}
      </div>

      {/* Modern Multi-Tenant Organization Switcher Switch */}
      <div className="org-switcher-section">
        <label className="sidebar-section-label">Active Organization</label>
        <div className="select-wrapper nm-inset">
          <select 
            value={currentOrg?.id || ''} 
            onChange={handleOrgSwitch}
            className="sidebar-select"
          >
            {!currentOrg && <option value="">Select Workspace...</option>}
            {myOrganizations.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <span className="material-symbols-outlined select-arrow-icon">unfold_more</span>
        </div>
      </div>

      {/* Workspace App Navigation Streams */}
      <div className="sidebar-scrollable-body">
        
        {/* Dynamic Multi-Tenant Channel Subsystem Directory */}
        <div className="nav-group-section">
          <div className="nav-group-header">
            <p className="sidebar-section-label">💬 Channels</p>
            <button 
              onClick={() => setShowCreateChannel(prev => !prev)} 
              className="add-channel-action-btn"
              title="Create Channel"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>

          {showCreateChannel && (
            <form onSubmit={handleCreateChannel} className="create-channel-inline-form">
              <input 
                type="text" 
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="new-channel"
                className="inline-channel-input nm-inset"
                autoFocus
              />
              <button type="submit" className="inline-channel-submit-btn">OK</button>
            </form>
          )}

          <div className="nav-links-stack">
            {channels.map(ch => {
              const isActive = location.pathname === `/chat/${ch.id}`;
              return (
                <Link 
                  key={ch.id} 
                  to={`/chat/${ch.id}`}
                  className={`sidebar-nav-item ${isActive ? 'active-nav-item' : ''}`}
                >
                  <span className="nav-item-hash">#</span>
                  <span className="nav-item-text">{ch.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Distributed Toolkit Utilities Map Links */}
        <div className="nav-group-section" style={{ marginTop: '1.5rem' }}>
          <p className="sidebar-section-label">🛠️ Collaboration</p>
          <div className="nav-links-stack">
            {[
              { path: '/tasks', label: 'Task Board', icon: 'splitscreen' },
              { path: '/files', label: 'Shared Files', icon: 'folder_open' },
              { path: '/notes', label: 'Notes & Polls', icon: 'description' },
              { path: '/code', label: 'Code Room', icon: 'terminal' }
            ].map(tool => {
              const isActive = location.pathname.startsWith(tool.path);
              return (
                <Link 
                  key={tool.path} 
                  to={tool.path} 
                  className={`sidebar-nav-item ${isActive ? 'active-nav-item' : ''}`}
                >
                  <span className="material-symbols-outlined nav-item-icon">{tool.icon}</span>
                  <span className="nav-item-text">{tool.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

      </div>

      {/* Account Profile Control Footer Context */}
      <div className="sidebar-footer">
        <div className="user-profile-meta-block">
          <p className="user-profile-display-name">{userData?.name || currentUser?.email}</p>
          <p className="user-profile-display-role">{userData?.role || 'Teammate'}</p>
        </div>
        <button 
          onClick={() => logout().then(() => navigate('/login'))} 
          className="sidebar-logout-btn"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   LOCAL COMPONENT NEUMORPHIC STYLESHEET 
   ========================================================================== */
const styles = `
.sidebar-container {
  width: 16.5rem;
  background-color: var(--nm-bg, #e0e8f6);
  display: flex;
  flex-direction: column;
  height: 100vh;
  border-right: var(--nm-border, 1px solid rgba(255, 255, 255, 0.6));
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.02);
  user-select: none;
}

.sidebar-header {
  height: 4.5rem;
  padding: 0 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: var(--nm-border, 1px solid rgba(255, 255, 255, 0.6));
}

.sidebar-brand-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--nm-text, #2c3a57);
  letter-spacing: -0.02em;
}

.admin-badge {
  text-decoration: none;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #ffffff;
  background-color: var(--nm-accent, #4f46e5);
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
}

.org-switcher-section {
  padding: 1.25rem;
  border-bottom: var(--nm-border, 1px solid rgba(255, 255, 255, 0.6));
}

.sidebar-section-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--nm-text-muted, #6b7c96);
  margin-bottom: 0.5rem;
  padding: 0 0.25rem;
}

.select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 0.85rem;
}

.sidebar-select {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--nm-text, #2c3a57);
  padding: 0.65rem 2rem 0.65rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 700;
  outline: none;
  cursor: pointer;
  appearance: none;
}

.select-arrow-icon {
  position: absolute;
  right: 0.75rem;
  color: var(--nm-text-muted, #6b7c96);
  pointer-events: none;
  font-size: 1.1rem;
}

.sidebar-scrollable-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 0.75rem;
}

.nav-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add-channel-action-btn {
  background: none;
  border: none;
  color: var(--nm-text-muted, #6b7c96);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0;
  margin-top: -0.35rem;
  transition: color 0.2s ease;
}
.add-channel-action-btn:hover { color: var(--nm-accent, #4f46e5); }
.add-channel-action-btn span { font-size: 1.15rem; }

.create-channel-inline-form {
  display: flex;
  gap: 0.35rem;
  padding: 0 0.25rem 0.5rem 0.25rem;
}

.inline-channel-input {
  flex: 1;
  background: var(--nm-bg, #e0e8f6);
  border: none;
  color: var(--nm-text, #2c3a57);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.45rem 0.75rem;
  border-radius: 0.65rem;
  outline: none;
}

.inline-channel-submit-btn {
  border: none;
  background-color: var(--nm-accent, #4f46e5);
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0 0.65rem;
  border-radius: 0.65rem;
  cursor: pointer;
}

.nav-links-stack {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  text-decoration: none;
  padding: 0.65rem 0.75rem;
  border-radius: 0.85rem;
  color: var(--nm-text, #2c3a57);
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s ease;
}
.sidebar-nav-item:hover {
  background-color: rgba(255, 255, 255, 0.4);
}

.active-nav-item {
  box-shadow: var(--nm-shadow-inset, inset 4px 4px 8px #b8c4d9, inset -4px -4px 8px #ffffff);
  color: var(--nm-accent, #4f46e5);
  font-weight: 700;
  background-color: transparent !important;
}

.nav-item-hash {
  font-size: 1.1rem;
  font-weight: 300;
  margin-right: 0.5rem;
  color: var(--nm-text-muted, #6b7c96);
  width: 1rem;
  text-align: center;
}
.active-nav-item .nav-item-hash { color: var(--nm-accent, #4f46e5); font-weight: 700; }

.nav-item-icon {
  font-size: 1.1rem;
  margin-right: 0.5rem;
  color: var(--nm-text-muted, #6b7c96);
}
.active-nav-item .nav-item-icon { color: var(--nm-accent, #4f46e5); }

.nav-item-text {
  truncate: overflow;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  padding: 1rem 1.25rem;
  border-top: var(--nm-border, 1px solid rgba(255, 255, 255, 0.6));
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(255, 255, 255, 0.1);
}

.user-profile-meta-block {
  max-w: 70%;
}

.user-profile-display-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--nm-text, #2c3a57);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-profile-display-role {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--nm-text-muted, #6b7c96);
  text-transform: capitalize;
  margin: 0;
}

.sidebar-logout-btn {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem;
  border-radius: 0.65rem;
  transition: all 0.2s ease;
}
.sidebar-logout-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
}
.sidebar-logout-btn span { font-size: 1.2rem; }
`;

if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);
}
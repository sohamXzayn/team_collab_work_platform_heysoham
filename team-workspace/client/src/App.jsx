/* eslint-disable react-hooks/purity */
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrganizationProvider, useOrg } from './context/OrganizationContext'; 
import { db } from './services/firebase';
import { ref, onValue, update } from 'firebase/database';
import Login from './pages/Login';
import Register from './pages/Register';
import PendingApproval from './pages/PendingApproval';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import FilesPage from './pages/FilesPage';
import ChatPage from './pages/ChatPage';
import TasksPage from './pages/TasksPage';
import NotesAndPollsPage from './pages/NotesAndPollsPage';
import CodeRoomPage from './pages/CodeRoomPage';
import WhiteboardPage from './pages/WhiteboardPage'; 
import OrgSelectPage from './pages/OrgSelectPage'; 
import NotificationToast from './components/NotificationToast';
import sadLogo from './assets/sad.png';


// Redesigned premium Dashboard component
function Dashboard() {
  const { currentUser, userData, logout } = useAuth();
  const { currentOrg } = useOrg(); 

  // Static snapshot for debugging Firebase activity rendering
  // (helps confirm whether currentOrg is set and listeners fire)
  const [debug, setDebug] = useState({ orgId: null, tasks: 0, files: 0, activities: 0 });

  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [channelsCount, setChannelsCount] = useState(0);

  // States for Editing Profile Modal Subsystem
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editDpEmoji, setEditDpEmoji] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);


  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
      setEditBio(userData.bio || '');
      setEditDpEmoji(userData.dpEmoji || '');
    }

  }, [userData]);

  useEffect(() => {
    if (!currentUser || !currentOrg) {
      setTasks([]);
      setFiles([]);
      setUsersCount(0);
      setChannelsCount(0);
      return;
    }

    // 1. Fetch Organization-Specific Tasks
    const tasksRef = ref(db, `organizations/${currentOrg.id}/tasks`);
    const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTasks(Object.keys(data).map(key => ({ id: key, ...data[key] })));
      } else {
        setTasks([]);
      }
    });

    // 2. Fetch Organization-Specific Files
    const filesRef = ref(db, `organizations/${currentOrg.id}/files`);
    const unsubscribeFiles = onValue(filesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setFiles(Object.keys(data).map(key => ({ id: key, ...data[key] })));
      } else {
        setFiles([]);
      }
    });

    // 3. Fetch Organization Member Registry count
    const membersRef = ref(db, `organizations/${currentOrg.id}/members`);
    const unsubscribeUsers = onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUsersCount(Object.keys(data).length);
      } else {
        setUsersCount(0);
      }
    });

    // 4. Fetch Organization Channels count
    const channelsRef = ref(db, `organizations/${currentOrg.id}/channels`);
    const unsubscribeChannels = onValue(channelsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setChannelsCount(Object.keys(data).length);
      } else {
        setChannelsCount(0);
      }
    });

    return () => {
      unsubscribeTasks();
      unsubscribeFiles();
      unsubscribeUsers();
      unsubscribeChannels();
    };
  }, [currentUser, currentOrg]);

  // Handle saving modified user profile metadata back to global path reference
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid || !editName.trim()) return;
    setIsSavingProfile(true);

    try {
      const updates = {
        [`users/${currentUser.uid}/name`]: editName.trim(),
        [`users/${currentUser.uid}/bio`]: editBio.trim(),
        [`users/${currentUser.uid}/dpEmoji`]: (editDpEmoji || '').trim()
      };


      // Synchronize changes inside active membership lists if context available
      if (currentOrg?.id) {
        updates[`organizations/${currentOrg.id}/members/${currentUser.uid}/name`] = editName.trim();
      }

      await update(ref(db), updates);
      setIsProfileModalOpen(false);
    } catch (err) {
      console.error("Failed to update account profile parameters:", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Derived calculations
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'Completed').length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const totalKB = files.reduce((acc, f) => acc + (parseFloat(f.fileSize) || 0), 0);
  const storageDisplay = totalKB > 1024 ? (totalKB / 1024).toFixed(1) + " MB" : totalKB.toFixed(1) + " KB";
  const storagePercent = Math.min(Math.round((totalKB / (50 * 1024)) * 100), 100);

  const myPendingTasks = tasks.filter(t => t.assignedTo === currentUser?.uid && t.status !== 'Completed');

  const handleUpdateTaskStatus = async (taskId, currentStatus) => {
    if (!currentOrg) return;
    let nextStatus = 'Pending';
    if (currentStatus === 'Pending') nextStatus = 'In Progress';
    else if (currentStatus === 'In Progress') nextStatus = 'Completed';
    else if (currentStatus === 'Completed') nextStatus = 'Pending';

    try {
      await update(ref(db, `organizations/${currentOrg.id}/tasks/${taskId}`), { status: nextStatus });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Build Recent Activity Feed
  const dynamicActivities = [];
  files.forEach(f => {
    dynamicActivities.push({
      id: `file-${f.id}`,
      user: f.uploadedBy || 'Teammate',
      action: 'uploaded file',
      target: f.fileName,
      timestamp: f.timestamp || Date.now(),
      initial: (f.uploadedBy || 'T').substring(0, 2).toUpperCase()
    });
  });

  tasks.forEach(t => {
    dynamicActivities.push({
      id: `task-${t.id}`,
      user: t.assignedName || 'Teammate',
      action: `updated task to ${t.status}`,
      target: t.title,
      timestamp: Date.now() - 3600000,
      initial: (t.assignedName || 'T').substring(0, 2).toUpperCase()
    });
  });

  const defaultActivities = [
    { id: 'mock-1', user: 'Sarah Jenkins', action: 'completed task', target: 'Auth Redesign', timestamp: Date.now() - 600000, initial: 'SJ' },
    { id: 'mock-2', user: 'James Miller', action: 'uploaded file', target: 'marketing_assets.zip', timestamp: Date.now() - 3600000, initial: 'JM' }
  ];

  const sortedActivities = [...dynamicActivities]
    .sort((a, b) => b.timestamp - a.timestamp)
    .concat(dynamicActivities.length ? [] : defaultActivities)
    .slice(0, 4);


  return (
    <div className="grid-dash-layout">
      {/* Left Sidebar Panel */}
      <aside className="dashboard-sidebar-panel">
        <div>
          <div className="brand-logo-container" style={{ marginBottom: '2rem', justifyContent: 'flex-start' }}>
            <div className="brand-logo" style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={sadLogo}


                alt="CollabWorkspace logo"
                style={{ width: '48px', height: '48px', objectFit: 'contain', display: 'block' }}
              />
            </div>

            <span className="font-bold text-lg" style={{ marginLeft: '1rem', alignSelf: 'center', color: 'var(--nm-text)' }}>TeamCoWorkspace</span>
          </div>

          <div className="profile-section-dash">
            <div className="profile-avatar-large" aria-label="User DP">
              {userData?.dpEmoji ? userData.dpEmoji : (userData?.name ? userData.name.substring(0, 2).toUpperCase() : 'U')}
            </div>

            <h3 className="font-bold text-base mb-1" style={{ color: 'var(--nm-text)' }}>{userData?.name || 'Workspace Member'}</h3>
            <span className="text-xs font-semibold px-3 py-1 rounded-full capitalize" style={{
              backgroundColor: userData?.role === 'admin' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(100, 116, 139, 0.15)',
              color: userData?.role === 'admin' ? 'var(--nm-accent)' : 'var(--gray-500)'
            }}>
              {userData?.role || 'member'}
            </span>
            {userData?.bio && <p className="profile-bio-text">{userData.bio}</p>}
            <p className="text-xs text-gray-muted mt-2 truncate w-full" style={{ maxWidth: '200px' }}>{currentUser?.email}</p>
            
            {/* Trigger Profile Customization Subsystem */}
            <button 
              onClick={() => setIsProfileModalOpen(true)} 
              className="btn-profile-edit nm-raised"
            >
              <span className="material-symbols-outlined">edit_note</span>
              <span>Edit Profile</span>
            </button>
          </div>

          <nav className="flex flex-col gap-2">
            <Link to="/organizations" className="btn-outline" style={{ justifyContent: 'flex-start', padding: '0.75rem 1.25rem', borderRadius: '1rem', fontSize: '0.875rem', backgroundColor: 'rgba(79, 70, 229, 0.05)', border: '1px solid rgba(79, 70, 229, 0.15)' }}>
              <span className="material-symbols-outlined text-indigo" style={{ fontSize: '20px' }}>domain</span>
              <span className="font-bold">Switch Workspace</span>
            </Link>
            
            <Link to="/chat" className="btn-outline" style={{ justifyContent: 'flex-start', padding: '0.75rem 1.25rem', borderRadius: '1rem', fontSize: '0.875rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>forum</span>
              <span>Access Chat</span>
            </Link>
            <Link to="/files" className="btn-outline" style={{ justifyContent: 'flex-start', padding: '0.75rem 1.25rem', borderRadius: '1rem', fontSize: '0.875rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>folder_open</span>
              <span>Shared Storage</span>
            </Link>
            <Link to="/tasks" className="btn-outline" style={{ justifyContent: 'flex-start', padding: '0.75rem 1.25rem', borderRadius: '1rem', fontSize: '0.875rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>assignment</span>
              <span>Task Board</span>
            </Link>
            <Link to="/notes" className="btn-outline" style={{ justifyContent: 'flex-start', padding: '0.75rem 1.25rem', borderRadius: '1rem', fontSize: '0.875rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
              <span>Notes & Polls</span>
            </Link>
            <Link to="/code" className="btn-outline" style={{ justifyContent: 'flex-start', padding: '0.75rem 1.25rem', borderRadius: '1rem', fontSize: '0.875rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>code</span>
              <span>Code Room</span>
            </Link>
            <Link to="/canvas" className="btn-outline" style={{ justifyContent: 'flex-start', padding: '0.75rem 1.25rem', borderRadius: '1rem', fontSize: '0.875rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>gesture</span>
              <span>Design Canvas</span>
            </Link>
            {userData?.role === 'admin' && (
              <Link to="/admin" className="btn-outline" style={{ justifyContent: 'flex-start', padding: '0.75rem 1.25rem', borderRadius: '1rem', fontSize: '0.875rem', border: '1px dashed var(--nm-accent)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>shield_person</span>
                <span>Admin Center</span>
              </Link>
            )}
          </nav>
        </div>

        <button onClick={logout} className="btn-danger w-full flex items-center justify-center" style={{ marginTop: '2rem', gap: '0.5rem', borderRadius: '1rem', padding: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
          Log Out
        </button>
      </aside>

      {/* Main Workspace Stream Panel */}
      <main className="dashboard-main-panel">
        <header className="dash-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Standardized Neumorphic Back Navigation Mechanism */}
            <button 
              onClick={() => navigate(-1)} 
              className="nm-back-action-btn"
              title="Navigate Back"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <span className="text-xs font-semibold text-indigo uppercase tracking-wider">
                {currentOrg ? `Active Organization: ${currentOrg.name}` : 'Multi-Tenant Sandbox'}
              </span>
              <h1 className="font-bold text-2xl mt-0.5" style={{ color: 'var(--nm-text)' }}>Welcome back, {userData?.name || 'Teammate'}!</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="text-xs text-gray-muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
        </header>

        {!currentOrg ? (
          <div className="section-card text-center py-12 flex flex-col items-center justify-center" style={{ minHeight: '300px' }}>
            <span className="material-symbols-outlined text-indigo text-5xl mb-3 animate-pulse">domain_disabled</span>
            <h2 className="font-bold text-lg mb-2" style={{ color: 'var(--nm-text)' }}>No Active Organization Context Selected</h2>
            <p className="text-xs text-gray-muted mb-6 max-w-sm">
              To look at streaming data events, log files, design structures, or team chat logs, establish or switch to a registered corporate node first.
            </p>
            <Link to="/organizations" className="btn-outline text-xs font-bold py-2.5 px-6" style={{ width: 'auto' }}>
              Open Organization Hub &rarr;
            </Link>
          </div>
        ) : (
          <>
            <div className="dash-banner">
              <h2 className="dash-banner-title">{currentOrg.name} Workspace</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem', fontWeight: 500 }}>
                Co-ordinate schedules, dispatch tasks, exchange code snippets, and review analytics instantly inside your workspace.
              </p>
            </div>

            <section className="grid-metrics">

              <div className="stats-card-premium">
                <div className="stats-icon-wrapper" style={{ backgroundColor: 'rgba(79, 70, 229, 0.12)', color: 'var(--nm-accent)' }}>
                  <span className="material-symbols-outlined">assignment_turned_in</span>
                </div>
                <span className="stats-label">Task Completion</span>
                <h2 className="stats-value">{completionRate}%</h2>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--nm-bg)', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ width: `${completionRate}%`, height: '100%', backgroundColor: 'var(--nm-accent)', borderRadius: '3px' }} />
                </div>
              </div>

              <div className="stats-card-premium">
                <div className="stats-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--emerald-600)' }}>
                  <span className="material-symbols-outlined">cloud_done</span>
                </div>
                <span className="stats-label">Shared Storage</span>
                <h2 className="stats-value">{storageDisplay}</h2>
                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--nm-bg)', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ width: `${storagePercent}%`, height: '100%', backgroundColor: 'var(--emerald-600)', borderRadius: '3px' }} />
                </div>
              </div>

              <div className="stats-card-premium">
                <div className="stats-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
                  <span className="material-symbols-outlined">group</span>
                </div>
                <span className="stats-label">Teammates</span>
                <h2 className="stats-value">{usersCount}</h2>
                <span className="text-xs text-gray-muted mt-1.5">Active inside organization</span>
              </div>

              <div className="stats-card-premium">
                <div className="stats-icon-wrapper" style={{ backgroundColor: 'rgba(236, 72, 153, 0.12)', color: '#db2777' }}>
                  <span className="material-symbols-outlined">forum</span>
                </div>
                <span className="stats-label">Active Channels</span>
                <h2 className="stats-value">{channelsCount}</h2>
                <span className="text-xs text-gray-muted mt-1.5">Discussion rooms</span>
              </div>
            </section>

            <div className="grid-sections">
              <section className="section-card" style={{ padding: '2rem' }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold" style={{ color: 'var(--nm-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined text-indigo">task_alt</span>
                    <span>My Tasks ({myPendingTasks.length})</span>
                  </h3>
                  <Link to="/tasks" className="text-xs font-bold text-indigo" style={{ textDecoration: 'none' }}>View Board &rarr;</Link>
                </div>

                {myPendingTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-muted text-sm">
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '0.5rem', opacity: 0.5 }}>thumb_up</span>
                    <p>You have no pending tasks! Great job.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {myPendingTasks.map(task => (
                      <div key={task.id} className="mini-task-card">
                        <div>
                          <h4 className="font-bold text-sm" style={{ color: 'var(--nm-text)', margin: 0 }}>{task.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block ${
                            task.priority === 'High' ? 'bg-rose-100 text-rose-600' :
                            task.priority === 'Medium' ? 'bg-amber-100 text-amber-600' :
                            'bg-emerald-100 text-emerald-600'
                          }`}>
                            {task.priority || 'Medium'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUpdateTaskStatus(task.id, task.status)}
                          className="btn-outline text-xs"
                          style={{ width: 'auto', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', margin: 0, gap: '0.25rem' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
                          <span>{task.status}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="section-card" style={{ padding: '2rem' }}>
                <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--nm-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined text-indigo">bolt</span>
                  <span>Recent Activity</span>
                </h3>

              <div className="activity-feed-list">
                

                  {sortedActivities.map(act => (

                    <div key={act.id} className="activity-feed-item">
                      <div className="activity-badge">{act.initial}</div>
                      <div className="activity-content">
                        <span className="font-bold" style={{ color: 'var(--nm-text)' }}>{act.user}</span>
                        {" "}{act.action}{" "}
                        <span className="font-semibold" style={{ color: 'var(--nm-accent)' }}>{act.target}</span>
                        <p className="activity-time">{act.timestamp ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : act.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      {/* Modern Neumorphic Profile Modification Modal Section */}
      {isProfileModalOpen && (
        <div className="nm-modal-backdrop">
          <div className="nm-modal-surface">
            <div className="nm-modal-header">
              <h3 className="nm-modal-title">Edit Account Profile</h3>
              <button 
                onClick={() => setIsProfileModalOpen(false)} 
                className="nm-modal-close-btn"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="nm-modal-form">
              <div className="nm-modal-field-group">
                <label className="nm-modal-input-label">Display Name</label>
                <div className="nm-modal-input-wrapper nm-inset">
                  <span className="material-symbols-outlined nm-input-icon">person</span>
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="nm-modal-input"
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>

              <div className="nm-modal-field-group">
                <label className="nm-modal-input-label">DP Emoji</label>
                <div className="nm-modal-input-wrapper nm-inset">
                  <span className="material-symbols-outlined nm-input-icon">sentiment_satisfied</span>
                  <input
                    type="text"
                    value={editDpEmoji}
                    onChange={(e) => setEditDpEmoji(e.target.value)}
                    className="nm-modal-input"
                    placeholder="🙂"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="nm-modal-field-group">
                <label className="nm-modal-input-label">Bio / Status</label>

                <div className="nm-modal-input-wrapper nm-inset">
                  <span className="material-symbols-outlined nm-input-icon">description</span>
                  <textarea 
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="nm-modal-textarea"
                    placeholder="Tell the team about yourself or set your status..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="nm-modal-actions">
                <button 
                  type="button" 
                  onClick={() => setIsProfileModalOpen(false)}
                  className="nm-modal-btn-cancel"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSavingProfile || !editName.trim()}
                  className="nm-modal-btn-save"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <Router>
      <AuthProvider>
        <OrganizationProvider> 
          
          <NotificationToast />

          <button onClick={toggleTheme} className="theme-toggle flex items-center justify-center">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>
          
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/banned" element={<PendingApproval />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/organizations" element={<OrgSelectPage />} /> 
              <Route path="/org-portal" element={<OrgSelectPage />} />   
              <Route path="/files" element={<FilesPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:channelId" element={<ChatPage />} />
              
              <Route path="/tasks" element={<TasksPage teamId="team1" />} />
              <Route path="/notes" element={<NotesAndPollsPage teamId="team1" />} />
              <Route path="/code" element={<CodeRoomPage teamId="team1" />} />
              <Route path="/canvas" element={<WhiteboardPage teamId="team1" />} />
            </Route>

            <Route element={<ProtectedRoute adminOnly={true} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Routes>
          
        </OrganizationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

/* ==========================================================================
   LOCAL COMPONENT NEUMORPHIC STYLESHEET
   ========================================================================== */
const styles = `
/* Dashboard layout + Recent Activity */
.grid-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 1024px) {
  .grid-sections { grid-template-columns: 1fr; }
}

.section-card {
  border-radius: 1.5rem;
}

.activity-feed-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.activity-feed-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.85rem 0.95rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: var(--nm-shadow-inset, inset 4px 4px 8px #b8c4d9, inset -4px -4px 8px #ffffff);
}

.activity-badge {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.9rem;
  background: rgba(79, 70, 229, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  color: var(--nm-accent, #4f46e5);
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-content p,
.activity-content span,
.activity-content h4 { margin: 0; }

.activity-time {
  font-size: 0.75rem;
  color: var(--nm-text-muted, #6b7c96);
  margin-top: 0.35rem;
}

/* End Dashboard layout + Recent Activity */

.nm-back-action-btn {

  height: 2.5rem;
  width: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--nm-bg, #e0e8f6);
  border: none;
  border-radius: 0.85rem;
  color: var(--nm-text, #2c3a57);
  box-shadow: var(--nm-shadow-raised, 6px 6px 12px #b8c4d9, -6px -6px 12px #ffffff);
  cursor: pointer;
  transition: all 0.2s ease;
  border: var(--nm-border, 1px solid rgba(255,255,255,0.6));
}
.nm-back-action-btn:hover {
  transform: translateY(-1px);
  color: var(--nm-accent, #4f46e5);
}
.nm-back-action-btn:active {
  box-shadow: var(--nm-shadow-inset, inset 3px 3px 6px #b8c4d9, inset -3px -3px 6px #ffffff);
  transform: translateY(0);
}

.profile-section-dash {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem 1rem;
  margin-bottom: 2rem;
  border-radius: 1.5rem;
  background: var(--nm-bg, #e0e8f6);
  box-shadow: var(--nm-shadow-inset, inset 4px 4px 8px #b8c4d9, inset -4px -4px 8px #ffffff);
}

.profile-bio-text {
  font-size: 0.75rem;
  color: var(--nm-text-muted, #6b7c96);
  text-align: center;
  margin: 0.75rem 0 0 0;
  line-height: 1.3;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.btn-profile-edit {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1rem;
  padding: 0.45rem 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--nm-accent, #4f46e5);
  background: var(--nm-bg, #e0e8f6);
  border: var(--nm-border, 1px solid rgba(255,255,255,0.6));
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-profile-edit span { font-size: 0.95rem; }
.btn-profile-edit:hover {
  transform: translateY(-1px);
  background-color: rgba(255, 255, 255, 0.3);
}

.nm-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(44, 58, 87, 0.25);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.nm-modal-surface {
  width: 28rem;
  background: var(--nm-bg, #e0e8f6);
  border-radius: 1.75rem;
  padding: 2rem;
  border: var(--nm-border, 1px solid rgba(255,255,255,0.8));
  box-shadow: 20px 20px 40px #b8c4d9, -20px -20px 40px #ffffff;
  animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.nm-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.nm-modal-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--nm-text, #2c3a57);
}

.nm-modal-close-btn {
  background: none;
  border: none;
  color: var(--nm-text-muted, #6b7c96);
  cursor: pointer;
}
.nm-modal-close-btn span { font-size: 1.25rem; }

.nm-modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.nm-modal-field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nm-modal-input-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--nm-text-muted, #6b7c96);
  padding-left: 0.25rem;
}

.nm-modal-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 1rem;
  background: var(--nm-bg, #e0e8f6);
  box-shadow: var(--nm-shadow-inset, inset 4px 4px 8px #b8c4d9, inset -4px -4px 8px #ffffff);
}

.nm-input-icon {
  position: absolute;
  left: 1rem;
  color: var(--nm-text-muted, #6b7c96);
  font-size: 1.15rem;
  pointer-events: none;
}

.nm-modal-input {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.85rem 1rem 0.85rem 2.75rem;
  font-size: 0.9rem;
  color: var(--nm-text, #2c3a57);
  font-weight: 600;
  outline: none;
}

.nm-modal-textarea {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.85rem 1rem 0.85rem 2.75rem;
  font-size: 0.9rem;
  color: var(--nm-text, #2c3a57);
  font-weight: 600;
  outline: none;
  resize: none;
  font-family: inherit;
}

.nm-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.nm-modal-btn-cancel {
  padding: 0.75rem 1.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--nm-text-muted, #6b7c96);
  background: transparent;
  border: none;
  cursor: pointer;
}

.nm-modal-btn-save {
  padding: 0.75rem 1.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #ffffff;
  background: var(--nm-accent, #4f46e5);
  border: none;
  border-radius: 1rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  transition: all 0.2s ease;
}
.nm-modal-btn-save:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}
.nm-modal-btn-save:disabled {
  background: var(--nm-bg, #e0e8f6);
  color: var(--nm-text-muted, #6b7c96);
  box-shadow: none;
  border: var(--nm-border, 1px solid rgba(255,255,255,0.6));
  cursor: not-allowed;
}
`;

if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);
}
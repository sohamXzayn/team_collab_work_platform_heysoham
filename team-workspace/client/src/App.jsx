/* eslint-disable react-hooks/purity */
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrganizationProvider, useOrg } from './context/OrganizationContext'; // Added Organization Context
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
import OrgSelectPage from './pages/OrgSelectPage'; // Added Org Setup Page
import NotificationToast from './components/NotificationToast';
import './pages/neumorphism.css';

// Redesigned premium Dashboard component
function Dashboard() {
  const { currentUser, userData, logout } = useAuth();
  const { currentOrg } = useOrg(); // Grab the active multi-tenant workspace context node
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [channelsCount, setChannelsCount] = useState(0);

  useEffect(() => {
    // Prevent execution if no user is signed in or if no organization is selected yet
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

  // Derived calculations
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'Completed').length;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const totalKB = files.reduce((acc, f) => {
    const sizeNum = parseFloat(f.fileSize) || 0;
    return acc + sizeNum;
  }, 0);
  const storageDisplay = totalKB > 1024 
    ? (totalKB / 1024).toFixed(1) + " MB" 
    : totalKB.toFixed(1) + " KB";
  const storagePercent = Math.min(Math.round((totalKB / (50 * 1024)) * 100), 100);

  const myPendingTasks = tasks.filter(t => t.assignedTo === currentUser?.uid && t.status !== 'Completed');

  // Handle task status progression directly inside scoped organization tree path
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
    { id: 'mock-2', user: 'James Miller', action: 'uploaded file', target: 'marketing_assets.zip', timestamp: Date.now() - 3600000, initial: 'JM' },
    { id: 'mock-3', user: 'Alex Rivera', action: 'created meeting poll', target: 'Product Launch Sync', timestamp: Date.now() - 10800000, initial: 'AR' }
  ];

  const sortedActivities = [...dynamicActivities]
    .sort((a, b) => b.timestamp - a.timestamp)
    .concat(defaultActivities)
    .slice(0, 4);

  return (
    <div className="grid-dash-layout">
      {/* Left Sidebar Panel */}
      <aside className="dashboard-sidebar-panel">
        <div>
          <div className="brand-logo-container" style={{ marginBottom: '2rem', justifyContent: 'flex-start' }}>
            <div className="brand-logo" style={{ width: '48px', height: '48px', fontSize: '1.75rem' }}>🌌</div>
            <span className="font-bold text-lg" style={{ marginLeft: '1rem', alignSelf: 'center', color: 'var(--nm-text)' }}>CollabWorkspace</span>
          </div>

          <div className="profile-section-dash">
            <div className="profile-avatar-large">
              {userData?.name ? userData.name.substring(0, 2).toUpperCase() : 'U'}
            </div>
            <h3 className="font-bold text-base mb-1" style={{ color: 'var(--nm-text)' }}>{userData?.name || 'Workspace Member'}</h3>
            <span className="text-xs font-semibold px-3 py-1 rounded-full capitalize" style={{
              backgroundColor: userData?.role === 'admin' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(100, 116, 139, 0.15)',
              color: userData?.role === 'admin' ? 'var(--nm-accent)' : 'var(--gray-500)'
            }}>
              {userData?.role || 'member'}
            </span>
            <p className="text-xs text-gray-muted mt-2 truncate w-full" style={{ maxWidth: '200px' }}>{currentUser?.email}</p>
          </div>

          <nav className="flex flex-col gap-2">
            {/* Added Workspace Swapping Selector Entry Point Link */}
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
          <div>
            <span className="text-xs font-semibold text-indigo uppercase tracking-wider">
              {currentOrg ? `Organization Context: ${currentOrg.name}` : 'Multi-Tenant Sandbox'}
            </span>
            <h1 className="font-bold text-2xl mt-0.5" style={{ color: 'var(--nm-text)' }}>Welcome back, {userData?.name || 'Teammate'}!</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="text-xs text-gray-muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
        </header>

        {/* Conditional rendering based on whether an organization environment is active */}
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
            {/* Hero Banner Component */}
            <div className="dash-banner">
              <h2 className="dash-banner-title">{currentOrg.name} Hub Workspace</h2>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '0.95rem', fontWeight: 500 }}>
                Co-ordinate schedules, dispatch tasks, exchange code snippets, and review analytics instantly inside your workspace.
              </p>
            </div>

            {/* Metrics Indicators Grid */}
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

            {/* Two-Pane Detailed Section */}
            <div className="grid-sections">
              {/* Left Column: Personal Pending Tasks */}
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

              {/* Right Column: Live Team Activity Stream */}
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
        <OrganizationProvider> {/* Core Multi-tenant Context Integration Wrapper */}
          
          <NotificationToast />

          <button onClick={toggleTheme} className="theme-toggle flex items-center justify-center">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>
          
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/banned" element={<PendingApproval />} />

            {/* Fully Protected Member Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/organizations" element={<OrgSelectPage />} /> {/* Dedicated Workspace Hub Route */}
              <Route path="/org-portal" element={<OrgSelectPage />} />   {/* Fallback alias protection route */}
              <Route path="/files" element={<FilesPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:channelId" element={<ChatPage />} />
              
              {/* Feature components dynamically handle parameters or inherit OrgContext */}
              <Route path="/tasks" element={<TasksPage teamId="team1" />} />
              <Route path="/notes" element={<NotesAndPollsPage teamId="team1" />} />
              <Route path="/code" element={<CodeRoomPage teamId="team1" />} />
              <Route path="/canvas" element={<WhiteboardPage teamId="team1" />} />
            </Route>

            {/* Admin Only Routes */}
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
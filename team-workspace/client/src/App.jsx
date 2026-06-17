import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import PendingApproval from './pages/PendingApproval';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import FilesPage from './pages/FilesPage';
import ChatPage from './pages/ChatPage';
import TasksPage from './pages/TasksPage';
import NotesAndPollsPage from './pages/NotesAndPollsPage';
import NotificationToast from './components/NotificationToast';
import './pages/neumorphism.css';

// Dashboard with premium Material Symbols layout
function Dashboard() {
  const { userData, logout } = useAuth();
  return (
    <div className="page-container">
      <div className="content-max-width section-card text-center">
        <h1 className="auth-title mb-2">Workspace Dashboard</h1>
        <p className="text-gray-muted mb-8">Hello, <span className="font-bold text-indigo">{userData?.name}</span>!</p>
        
        <div className="grid-dashboard">
          <Link to="/chat" className="btn-outline flex flex-col items-center justify-center" style={{ height: 'auto', padding: '2rem' }}>
            <span className="material-symbols-outlined mb-2 text-indigo" style={{ fontSize: '36px' }}>forum</span>
            Access Chat
          </Link>
          
          <Link to="/files" className="btn-outline flex flex-col items-center justify-center" style={{ height: 'auto', padding: '2rem' }}>
            <span className="material-symbols-outlined mb-2 text-indigo" style={{ fontSize: '36px' }}>folder_open</span>
            Access Files
          </Link>
          
          <Link to="/tasks" className="btn-outline flex flex-col items-center justify-center" style={{ height: 'auto', padding: '2rem' }}>
            <span className="material-symbols-outlined mb-2 text-indigo" style={{ fontSize: '36px' }}>assignment</span>
            Access Tasks
          </Link>

          <Link to="/notes" className="btn-outline flex flex-col items-center justify-center" style={{ height: 'auto', padding: '2rem' }}>
            <span className="material-symbols-outlined mb-2 text-indigo" style={{ fontSize: '36px' }}>description</span>
            Notes & Polls
          </Link>
          
          {userData?.role === 'admin' && (
            <Link to="/admin" className="btn-outline flex flex-col items-center justify-center" style={{ height: 'auto', padding: '2rem' }}>
              <span className="material-symbols-outlined mb-2 text-indigo" style={{ fontSize: '36px' }}>shield_person</span>
              Admin Panel
            </Link>
          )}
        </div>

        <button onClick={logout} className="btn-danger flex items-center justify-center mx-auto" style={{ marginTop: '2rem', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
          Log Out
        </button>
      </div>
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
        {/* Real-time Toast placed inside AuthProvider so it can hook into useAuth() */}
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
            <Route path="/files" element={<FilesPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:channelId" element={<ChatPage />} />
            <Route path="/tasks" element={<TasksPage teamId="team1" />} />
            <Route path="/notes" element={<NotesAndPollsPage teamId="team1" />} />
          </Route>

          {/* Admin Only Routes */}
          <Route element={<ProtectedRoute adminOnly={true} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
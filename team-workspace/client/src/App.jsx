import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import PendingApproval from './pages/PendingApproval';
import ProtectedRoute from './components/ProtectedRoute';
import AdminDashboard from './pages/AdminDashboard';
import FilesPage from './pages/FilesPage';
import './pages/neumorphism.css';

// Basic Placeholder for Workspace Dashboard
function Dashboard() {
  const { userData, logout } = useAuth();
  return (
    <div className="page-container">
      <div className="content-max-width section-card text-center">
        <h1 className="auth-title mb-2">Workspace Dashboard</h1>
        <p className="text-gray-muted mb-8">Hello, <span className="font-bold text-indigo">{userData?.name}</span>!</p>
        
        <div className="grid-dashboard">
          <Link to="/files" className="btn-outline" style={{ height: 'auto', padding: '2rem', flexDirection: 'column' }}>📁 Access Files</Link>
          {userData?.role === 'admin' && (
            <Link to="/admin" className="btn-outline" style={{ height: 'auto', padding: '2rem', flexDirection: 'column' }}>🛡️ Admin Panel</Link>
          )}
        </div>

        <button onClick={logout} className="btn-danger" style={{ marginTop: '1rem' }}>
          Log Out
        </button>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  // Simplified to Light mode by default for the 'Undo'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <Router>
      <button onClick={toggleTheme} className="theme-toggle">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/banned" element={<PendingApproval />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/files" element={<FilesPage />} />
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
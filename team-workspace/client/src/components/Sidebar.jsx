import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { ref, onValue } from 'firebase/database';

export default function Sidebar() {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState('team1'); // Defaulting to team1 for blueprint setup

  // Fetch all teams the user belongs to
  useEffect(() => {
    const teamsRef = ref(db, 'teams');
    const unsubscribe = onValue(teamsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setTeams(list);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch channels for the active team
  useEffect(() => {
    if (!activeTeamId) return;
    const channelsRef = ref(db, 'channels');
    const unsubscribe = onValue(channelsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(ch => ch.teamId === activeTeamId);
        setChannels(list);
      } else {
        setChannels([]);
      }
    });
    return () => unsubscribe();
  }, [activeTeamId]);

  return (
    <div className="w-64 bg-gray-900 text-gray-300 flex flex-col h-screen border-r border-gray-800">
      {/* Brand Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h1 className="font-bold text-white text-lg tracking-wide truncate">Workspace Hub</h1>
        {userData?.role === 'admin' && (
          <Link to="/admin" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded font-bold transition">
            Admin
          </Link>
        )}
      </div>

      {/* Team Selection Dropdown */}
      <div className="p-4">
        <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-1.5">Active Workspace</label>
        <select 
          value={activeTeamId} 
          onChange={(e) => setActiveTeamId(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded p-2 text-sm focus:outline-none focus:border-indigo-500"
        >
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Navigation Channels Stream */}
      <div className="flex-1 overflow-y-auto px-2 space-y-6">
        <div>
          <p className="px-2 text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">💬 Channels</p>
          <div className="space-y-0.5">
            {channels.map(ch => (
              <Link 
                key={ch.id} 
                to={`/chat/${ch.id}`}
                className="flex items-center px-2 py-1.5 rounded text-sm font-medium hover:bg-gray-800 hover:text-white transition group"
              >
                <span className="text-gray-500 mr-2 font-light">#</span>
                <span className="truncate">{ch.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Global Tools links */}
        <div>
          <p className="px-2 text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">🛠️ Collaboration</p>
          <div className="space-y-0.5 text-sm font-medium">
            <Link to="/tasks" className="flex items-center px-2 py-1.5 rounded hover:bg-gray-800 hover:text-white transition">📋 Task Board</Link>
            <Link to="/files" className="flex items-center px-2 py-1.5 rounded hover:bg-gray-800 hover:text-white transition">📁 Shared Files</Link>
            <Link to="/notes" className="flex items-center px-2 py-1.5 rounded hover:bg-gray-800 hover:text-white transition">📝 Collaborative Notes</Link>
            <Link to="/code" className="flex items-center px-2 py-1.5 rounded hover:bg-gray-800 hover:text-white transition">💻 Code Room</Link>
          </div>
        </div>
      </div>

      {/* User Footer Context Profiles */}
      <div className="p-4 border-t border-gray-800 bg-gray-950 flex items-center justify-between">
        <div className="truncate max-w-[140px]">
          <p className="text-sm font-semibold text-white truncate">{userData?.name}</p>
          <p className="text-xs text-gray-500 truncate capitalize">{userData?.role}</p>
        </div>
        <button onClick={() => logout().then(() => navigate('/login'))} className="text-xs text-red-400 hover:text-red-300 font-semibold transition">
          Log Out
        </button>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, update, remove } from 'firebase/database';
import './neumorphism.css';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    // Fetch Users
    const usersRef = ref(db, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userList = Object.keys(data).map(uid => ({ uid, ...data[uid] }));
        setUsers(userList);
      }
    });

    // Fetch Reports
    const reportsRef = ref(db, 'reports');
    const unsubscribeReports = onValue(reportsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const reportList = Object.keys(data).map(id => ({ id, ...data[id] }));
        // Sort newest reports first
        setReports(reportList.sort((a, b) => b.timestamp - a.timestamp));
      } else {
        setReports([]);
      }
    });

    return () => {
      unsubscribeUsers();
      unsubscribeReports();
    };
  }, []);

  const toggleUserStatus = (uid, currentStatus) => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    update(ref(db, `users/${uid}`), { status: newStatus });
  };

  const dismissReport = (id) => {
    remove(ref(db, `reports/${id}`));
  };

  return (
    <div className="page-container">
      <h1 className="auth-title" style={{ textAlign: 'left' }}>Admin Control Center</h1>

      <div className="admin-grid">
        {/* User Management */}
        <section className="section-card">
          <h2 className="mb-8 font-bold" style={{ borderBottom: '1px solid var(--nm-text-muted)', paddingBottom: '0.5rem' }}>User Moderation</h2>
          <div>
            {users.map(user => (
              <div key={user.uid} className="user-item">
                <div>
                  <p className="font-bold">{user.name} <span className="text-xs text-gray-muted">({user.role})</span></p>
                  <p className="text-gray-muted" style={{ fontSize: '0.8rem' }}>{user.email}</p>
                </div>
                <button
                  onClick={() => toggleUserStatus(user.uid, user.status)}
                  className={user.status === 'banned' ? 'btn-success' : 'btn-danger'}
                  style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
                >
                  {user.status === 'banned' ? 'Unban' : 'Ban User'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Content Reports */}
        <section className="section-card">
          <h2 className="mb-8 font-bold" style={{ borderBottom: '1px solid var(--nm-text-muted)', paddingBottom: '0.5rem' }}>Active Reports</h2>
          {reports.length === 0 ? (
            <p className="text-gray-muted text-center">No pending reports.</p>
          ) : (
            <div>
              {reports.map(report => (
                <div key={report.id} className="report-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p className="font-bold" style={{ color: 'var(--nm-error)' }}>Reported: {report.fileName}</p>
                    <button 
                      onClick={() => dismissReport(report.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--nm-text-muted)' }}
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ margin: '0.5rem 0' }}>Reason: {report.reason}</p>
                  <p className="text-gray-muted" style={{ fontSize: '0.75rem' }}>By: {report.reportedBy}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
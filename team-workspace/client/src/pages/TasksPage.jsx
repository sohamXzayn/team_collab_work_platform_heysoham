import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, push, onValue, update } from 'firebase/database';
import { useAuth } from '../context/AuthContext';

export default function TasksPage({ teamId = "team1" }) {
  const { userData, currentUser } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Form States
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [error, setError] = useState('');

  // 1. Fetch all system users for the Assignment dropdown selector
  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ uid: key, ...data[key] }));
        setUsers(list.filter(u => u.status === 'approved')); // Only assign to approved users
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Fetch all tasks assigned to this team
  useEffect(() => {
    const tasksRef = ref(db, 'tasks');
    const unsubscribe = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(t => t.teamId === teamId);
        setTasks(list);
      } else {
        setTasks([]);
      }
    });
    return () => unsubscribe();
  }, [teamId]);

  // 3. Handle Creating a Task + Pushing Notification
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim() || !assignedTo) {
      setError('Please fill in the task description and assign it to a teammate.');
      return;
    }

    try {
      setError('');
      const tasksRef = ref(db, 'tasks');
      
      // Target assigned user profile info to display name
      const targetUser = users.find(u => u.uid === assignedTo);

      const taskPayload = {
        teamId: teamId,
        title: title.trim(),
        assignedTo: assignedTo,
        assignedName: targetUser?.name || 'Teammate',
        priority: priority,
        status: 'Pending' // Default status defined by blueprint
      };

      // Push task to database
      await push(tasksRef, taskPayload);

      // Trigger Notification payload to assignedTo target node
      const notifRef = ref(db, `notifications/${assignedTo}`);
      await push(notifRef, {
        message: `New Task Assigned: "${title.trim()}" by ${userData?.name || currentUser.email}`,
        timestamp: Date.now(),
        read: false
      });

      // Reset Form fields
      setTitle('');
      setAssignedTo('');
      setPriority('Medium');
    } catch (err) {
      console.error("Task assignment pipeline failed", err);
      setError('Failed to deploy task allocation.');
    }
  };

  // 4. Update Task Status Change (Pending -> In Progress -> Completed)
  const handleUpdateStatus = async (taskId, currentStatus) => {
    let nextStatus = 'Pending';
    if (currentStatus === 'Pending') nextStatus = 'In Progress';
    else if (currentStatus === 'In Progress') nextStatus = 'Completed';
    else if (currentStatus === 'Completed') nextStatus = 'Pending';

    try {
      await update(ref(db, `tasks/${taskId}`), { status: nextStatus });
    } catch (err) {
      console.error("Failed to update status tree state", err);
    }
  };

  return (
    <div className="page-container">
      <div className="content-max-width">
        <h2 className="auth-title text-center mb-6">📋 Task Board & Assignments</h2>

        {error && <div className="text-center text-red-500 mb-4 font-semibold text-sm">{error}</div>}

        {/* Task Creation Form Panel */}
        <div className="section-card mb-8">
          <h3 className="text-xl font-bold mb-4 text-indigo">Create & Allocate Task</h3>
          <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-gray-muted text-xs font-bold mb-1 uppercase">Task Title</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Create Login Page UI" 
                className="w-full input-field"
              />
            </div>
            <div>
              <label className="block text-gray-muted text-xs font-bold mb-1 uppercase">Assign To</label>
              <select 
                value={assignedTo} 
                onChange={(e) => setAssignedTo(e.target.value)} 
                className="w-full input-field"
                style={{ padding: '0.65rem' }}
              >
                <option value="">Select Member</option>
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-muted text-xs font-bold mb-1 uppercase">Priority</label>
              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)} 
                className="w-full input-field"
                style={{ padding: '0.65rem' }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <button type="submit" className="btn-outline w-full text-center font-bold">
              Assign Task
            </button>
          </form>
        </div>

        {/* Task Iteration Stream Board */}
        <div className="section-card">
          <h3 className="text-xl font-bold mb-4 text-indigo">Active Sprint Pipeline ({tasks.length})</h3>
          
          {tasks.length === 0 ? (
            <p className="text-gray-muted text-center py-6">No tasks currently deployed on this workspace deck.</p>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="grid grid-cols-1 md:grid-cols-3 items-center justify-between p-4 rounded-xl shadow-inner bg-opacity-40 border border-gray-200">
                  <div>
                    <h4 className="font-bold text-gray-800 text-base">{task.title}</h4>
                    <p className="text-xs text-gray-muted mt-0.5">
                      Assigned to: <span className="text-indigo font-semibold">{task.assignedName}</span>
                      {" | "}
                      Priority: <span className={`font-semibold ${
                        task.priority === 'High' ? 'text-rose-600' :
                        task.priority === 'Medium' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>{task.priority || 'Medium'}</span>
                    </p>
                  </div>
                  
                  <div className="text-center py-2 md:py-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide ${
                      task.status === 'Completed' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' :
                      task.status === 'In Progress' ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                      'bg-rose-100 text-rose-600 border border-rose-200'
                    }`}>
                      {task.status}
                    </span>
                  </div>

                  <div className="text-right">
                    <button 
                      onClick={() => handleUpdateStatus(task.id, task.status)}
                      className="btn-outline text-xs px-3 py-1.5"
                    >
                      🔄 Advance Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
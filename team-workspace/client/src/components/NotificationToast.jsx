import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, remove } from 'firebase/database';
import { useAuth } from '../context/AuthContext';

export default function NotificationToast() {
  const { currentUser } = useAuth();
  const [activeNotification, setActiveNotification] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const notifRef = ref(db, `notifications/${currentUser.uid}`);
    const unsubscribe = onValue(notifRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Grab the most recent notification entry added to the profile array
        const keys = Object.keys(data);
        const latestKey = keys[keys.length - 1];
        const latestNotif = data[latestKey];

        setActiveNotification({ id: latestKey, ...latestNotif });
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleDismiss = () => {
    if (activeNotification && currentUser) {
      // Cleanly clear the data item off the user profile node real-time sync stream
      remove(ref(db, `notifications/${currentUser.uid}/${activeNotification.id}`));
      setActiveNotification(null);
    }
  };

  if (!activeNotification) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-white border-l-4 border-indigo-600 rounded-lg shadow-xl p-4 transition-all duration-300 transform translate-y-0 flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-bold uppercase text-indigo tracking-wider">🔔 Workspace Alert</p>
        <p className="text-sm text-gray-700 mt-1">{activeNotification.message}</p>
      </div>
      <button 
        onClick={handleDismiss} 
        className="ml-4 text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { ref, set, onValue } from 'firebase/database';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign Up function
  async function signup(email, password, name) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create the user profile in Realtime Database with default pending status
    await set(ref(db, `users/${user.uid}`), {
      name: name,
      email: email,
      role: 'member',
      status: 'active' // Users can access the workspace immediately
    });
    return userCredential;
  }

  // Login function
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout function
  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    let unsubscribeUserData;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeUserData) unsubscribeUserData();

      if (user) {
        setCurrentUser(user);
        const userRef = ref(db, `users/${user.uid}`);
        unsubscribeUserData = onValue(userRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setUserData(data);
            setLoading(false);
          } else {
            // If profile doesn't exist yet, we keep loading to avoid 
            // flashing an incomplete UI or bypassing protection logic
            setUserData(null);
          }
        });
      } else {
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserData) unsubscribeUserData();
    };
  }, []);

  const value = {
    currentUser,
    userData,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
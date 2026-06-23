import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, push, update } from 'firebase/database';
import { useAuth } from './AuthContext';

const OrganizationContext = createContext(null);

export function OrganizationProvider({ children }) {
  const { currentUser, userData } = useAuth();
  const [myOrganizations, setMyOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Effect 1: Stream all organizations this user belongs to
  useEffect(() => {
    if (!currentUser) {
      setMyOrganizations([]);
      setLoadingOrgs(false);
      return;
    }

    const userOrgsRef = ref(db, `users/${currentUser.uid}/organizations`);
    const unsubscribe = onValue(userOrgsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orgList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setMyOrganizations(orgList);
      } else {
        setMyOrganizations([]);
      }
      setLoadingOrgs(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Effect 2: Handle auto-selection safely without closure loops
  useEffect(() => {
    if (myOrganizations.length > 0 && !currentOrg) {
      const savedOrgId = localStorage.getItem('currentOrgId');
      const matchedOrg = myOrganizations.find(o => o.id === savedOrgId) || myOrganizations[0];
      setCurrentOrg(matchedOrg);
      localStorage.setItem('currentOrgId', matchedOrg.id);
    }
  }, [myOrganizations, currentOrg]);

  const switchOrganization = (org) => {
    setCurrentOrg(org);
    localStorage.setItem('currentOrgId', org.id);
  };

  const createOrganization = async (orgName) => {
    if (!currentUser || !orgName.trim()) return null;

    const orgsRef = ref(db, 'organizations');
    const newOrgRef = push(orgsRef);
    const orgId = newOrgRef.key;
    const timestamp = Date.now();

    const updates = {};
    
    // --- FLATTENED ROOT FIELDS TO PREVENT ANCESTOR PATH OVERLAP ERRORS ---
    updates[`organizations/${orgId}/name`] = orgName.trim();
    updates[`organizations/${orgId}/createdBy`] = currentUser.uid;
    updates[`organizations/${orgId}/ownerName`] = userData?.name || 'Unknown Owner';
    updates[`organizations/${orgId}/createdAt`] = timestamp;

    // --- SEPARATED AT NESTED LEAF NODES ---
    updates[`organizations/${orgId}/members/${currentUser.uid}`] = {
      name: userData?.name || 'Owner',
      email: currentUser.email,
      role: 'owner',
      joinedAt: timestamp
    };

    // --- ASSOCIATE WORKSPACE PATH WITHIN USER RECORD ---
    updates[`users/${currentUser.uid}/organizations/${orgId}`] = {
      name: orgName.trim(),
      role: 'owner'
    };

    // Multi-path write execution
    await update(ref(db), updates);
    
    const newOrgObj = { id: orgId, name: orgName.trim(), role: 'owner' };
    setCurrentOrg(newOrgObj);
    localStorage.setItem('currentOrgId', orgId);
    
    return orgId;
  };

  const inviteUserByEmail = async (emailTarget) => {
    if (!currentOrg) throw new Error("No active organization selected");
    
    return new Promise((resolve, reject) => {
      const usersRef = ref(db, 'users');
      onValue(usersRef, async (snapshot) => {
        const users = snapshot.val();
        if (!users) return reject("No system users found");

        const matchEntry = Object.entries(users).find(([uid, profile]) => 
          profile.email === emailTarget.trim().toLowerCase()
        );
        if (!matchEntry) return reject("User email profile not found");

        const [targetUid, targetProfile] = matchEntry;

        const updates = {};
        updates[`organizations/${currentOrg.id}/members/${targetUid}`] = {
          name: targetProfile.name,
          email: targetProfile.email,
          role: 'member',
          joinedAt: Date.now()
        };
        updates[`users/${targetUid}/organizations/${currentOrg.id}`] = {
          name: currentOrg.name,
          role: 'member'
        };

        try {
          await update(ref(db), updates);
          resolve();
        } catch (err) {
          reject(err.message);
        }
      }, { onlyOnce: true });
    });
  };

  return (
    <OrganizationContext.Provider value={{
      myOrganizations,
      currentOrg,
      loadingOrgs,
      switchOrganization,
      createOrganization,
      inviteUserByEmail
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrganizationContext);
}
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../context/OrganizationContext';

export default function OrgSelectPage() {
  const { currentUser, userData } = useAuth();
  const { myOrganizations, currentOrg, switchOrganization, createOrganization, inviteUserByEmail, updateOrganizationDetails } = useOrg();
  const [newOrgName, setNewOrgName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState({ type: '', msg: '' });
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const navigate = useNavigate();

  // Populate edit fields when currentOrg changes
  useEffect(() => {
    if (currentOrg) {
      setEditName(currentOrg.name || '');
      setEditLogo(currentOrg.logo || '🏢');
    }
  }, [currentOrg]);

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    if (!currentOrg) return;
    try {
      await updateOrganizationDetails(currentOrg.id, { name: editName.trim(), logo: editLogo.trim() });
      setInviteStatus({ type: 'success', msg: 'Organization updated.' });
    } catch (err) {
      setInviteStatus({ type: 'error', msg: err.message || 'Update failed.' });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      await createOrganization(newOrgName);
      setNewOrgName('');
    } catch (err) {
      console.error("Organization execution build failed", err);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteStatus({ type: 'info', msg: 'Searching database records...' });
    
    try {
      await inviteUserByEmail(inviteEmail);
      setInviteStatus({ type: 'success', msg: 'Teammate securely granted entry to organization!' });
      setInviteEmail('');
    } catch (err) {
      setInviteStatus({ type: 'error', msg: err || 'Invitation process rejected.' });
    }
  };

  return (
    <div className="page-container">
      <div className="content-max-width grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Side: Select / Switch Workspace */}
        <div className="md:col-span-7 flex flex-col space-y-6">
          <div className="section-card">
            
            {/* Header Layout Stack featuring Context Navigation */}
            <div className="flex items-center gap-3 mb-4">
              <button 
                onClick={() => navigate(-1)} 
                className="p-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-600 transition-all flex items-center justify-center shadow-sm"
                title="Go Back"
              >
                <span className="material-symbols-outlined text-lg" style={{ fontSize: '18px' }}>arrow_back</span>
              </button>
              <div>
                <h2 className="auth-title text-left text-xl flex items-center gap-2 m-0 p-0">
                  <span className="material-symbols-outlined text-indigo">domain</span>
                  Your Multi-Tenant Organizations
                </h2>
              </div>
            </div>
            
            <p className="text-xs text-gray-muted mb-6">Switch contexts to review alternative company branches, channels, and logs instantly.</p>
            
            {myOrganizations.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <span className="material-symbols-outlined text-gray-muted text-3xl mb-1">corporate_fare</span>
                <p className="text-xs text-gray-muted">You do not belong to any workspace networks yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {myOrganizations.map((org) => {
                  const isActive = currentOrg?.id === org.id;
                  return (
                    <div 
                      key={org.id} 
                      onClick={() => switchOrganization(org)}
                      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                        isActive 
                          ? 'bg-indigo-50/60 border-indigo-200 shadow-sm' 
                          : 'bg-white border-gray-100 hover:border-gray-300 shadow-inner'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg font-bold text-sm flex items-center justify-center ${isActive ? 'bg-indigo text-white' : 'bg-gray-100 text-gray-600'}`}>
                          {org.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-800">{org.name}</h4>
                          <span className="text-[10px] text-gray-muted uppercase tracking-wider font-semibold">{org.role}</span>
                        </div>
                      </div>
                      {isActive && (
                        <span className="material-symbols-outlined text-indigo text-xl">check_circle</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {currentOrg && (
              <button 
                onClick={() => navigate('/')} 
                className="w-full btn-outline text-xs mt-6 py-2.5 font-bold flex items-center justify-center gap-1"
              >
                Enter Active Dashboard <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Operations Panel (Create & Invite) */}
        <div className="md:col-span-5 flex flex-col space-y-6">
          
          {/* Create Form */}
          <div className="section-card">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-indigo" style={{ fontSize: '18px' }}>add_business</span>
              Establish New Organization
            </h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Company or Workspace Name"
                className="input-field text-xs py-2.5"
                required
              />
              <button type="submit" className="w-full btn-outline text-xs py-2 font-bold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>schema</span> Instantiate Node
              </button>
            </form>
          </div>

          {/* Invitation Utility (Only active if an organization is loaded) */}
          {currentOrg && (
            <div className="section-card">
              {myOrganizations.find(o => o.id === currentOrg?.id)?.role === 'owner' ? (
                <>
                  <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo" style={{ fontSize: '18px' }}>edit</span>
                    Edit {currentOrg.name}
                  </h3>
                  <form onSubmit={handleUpdateDetails} className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Organization Name"
                      className="input-field text-xs py-2.5"
                      required
                    />
                    <input
                      type="text"
                      value={editLogo}
                      onChange={(e) => setEditLogo(e.target.value)}
                      placeholder="Logo (emoji or URL)"
                      className="input-field text-xs py-2.5"
                      required
                    />
                    <button type="submit" className="w-full btn-outline text-xs py-2 font-bold flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>save</span> Save Changes
                    </button>
                  </form>
                  {inviteStatus.msg && (
                    <div className={`mt-3 p-2.5 rounded-lg text-[11px] font-medium border text-center ${
                      inviteStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      inviteStatus.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                      'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                      {inviteStatus.msg}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo" style={{ fontSize: '18px' }}>person_add</span>
                    Invite to {currentOrg.name}
                  </h3>
                  <p className="text-[11px] text-gray-muted mb-4">Type the exact registry registration email of the peer you wish to invite.</p>
                  <form onSubmit={handleInvite} className="space-y-3">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@company.com"
                      className="input-field text-xs py-2.5"
                      required
                    />
                    <button type="submit" className="w-full btn-outline text-xs py-2 font-bold flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>send</span> Dispatch Invite
                    </button>
                  </form>
                  {inviteStatus.msg && (
                    <div className={`mt-3 p-2.5 rounded-lg text-[11px] font-medium border text-center ${
                      inviteStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      inviteStatus.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                      'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                      {inviteStatus.msg}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
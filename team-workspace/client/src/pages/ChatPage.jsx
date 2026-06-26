import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { ref, push, onValue } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import { useOrg } from '../context/OrganizationContext';
import Sidebar from '../components/Sidebar';
import BackButton from '../components/BackButton';

export default function ChatPage() {
  const { channelId } = useParams(); 
  const { userData, currentUser } = useAuth();
  const { currentOrg } = useOrg();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [channelName, setChannelName] = useState('general');
  const [loading, setLoading] = useState(true);
  const messageEndRef = useRef(null);

  // 1. Listen for Active Channel Profile Meta Data (Isolated by tenant)
  useEffect(() => {
    if (!channelId || !currentOrg?.id) return;
    
    const channelMetaRef = ref(db, `organizations/${currentOrg.id}/channels/${channelId}`);
    const unsubscribe = onValue(channelMetaRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setChannelName(data.name);
    });

    return () => unsubscribe();
  }, [channelId, currentOrg]);

  // 2. Stream Live Multi-Tenant Channel Messages
  useEffect(() => {
    if (!channelId || !currentOrg?.id) return;
    setLoading(true);

    const msgRef = ref(db, `organizations/${currentOrg.id}/messages/${channelId}`);
    const unsubscribe = onValue(msgRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const textStream = Object.keys(data).map((key) => ({
        id: key,
        ...data[key]
      }));

      // Stable ordering: by timestamp (undefined timestamps go last)
      textStream.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

      setMessages(textStream);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [channelId, currentOrg?.id]);

  // 3. Auto Scroll View Window Engine
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Handle Discharging Outbound Chat Entries
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !channelId || !currentOrg?.id) return;

    try {
      const messagePayload = {
        sender: userData?.name || currentUser?.email || 'Anonymous',
        senderUid: currentUser?.uid,
        text: newMessage.trim(),
        timestamp: Date.now()
      };

      await push(
        ref(db, `organizations/${currentOrg.id}/messages/${channelId}`),
        messagePayload
      );
      setNewMessage('');
    } catch (err) {
      console.error("Message broadcast error fail sequence:", err);
    }
  };

  return (
    <div className="workspace-container">
      <Sidebar />

      <div className="chat-main-pipeline">
        {!currentOrg?.id || !channelId ? (
          <div className="chat-empty-state">
            <span className="material-symbols-outlined text-indigo text-5xl mb-3" style={{ opacity: 0.8 }}>domain_disabled</span>
            <p style={{ marginTop: '0.75rem' }}>
              Select an organization and a channel to start chatting.
            </p>
          </div>
        ) : null}
        {/* Top Header Navigation Meta Info Panel */}
        <div className="chat-header">
          <div style={{ marginRight: '0.75rem' }}>
            <BackButton label="Back" />
          </div>
          <div className="chat-title-area">
            <span className="chat-hash">#</span>
            <span className="chat-channel-name">{channelName}</span>
          </div>
          <div className="chat-org-badge">
            <span className="material-symbols-outlined">hub</span>
            <span>{currentOrg?.name || 'Workspace'}</span>
          </div>
        </div>

        {/* Dynamic Interactive Message Thread Layout Container */}
        <div className="chat-thread-container" style={{ display: (!currentOrg?.id || !channelId) ? 'none' : 'flex' }}>
          {loading ? (
            <div className="chat-empty-state">
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '32px', color: 'var(--nm-accent)' }}>sync</span>
              <p style={{ marginTop: '0.75rem' }}>Loading workspace transcripts...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty-state">
              <span className="empty-icon">💬</span>
              <p>Welcome to the beginning of the #{channelName} channel.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderUid === currentUser?.uid || msg.sender === (userData?.name || currentUser?.email);
              return (
                <div key={msg.id} className={`message-row ${isMe ? 'msg-me' : 'msg-them'}`}>
                  <div className="message-meta">
                    <span className="message-sender">{msg.sender}</span>
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`message-bubble ${isMe ? 'bubble-me' : 'bubble-them'}`}>
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messageEndRef} />
        </div>

        {/* Lower Messaging Form Box Frame Controls */}
        <div className="chat-input-bar">
          <form onSubmit={handleSendMessage} className="chat-form-element">
            <div className="chat-input-wrapper">
              <span className="material-symbols-outlined chat-input-icon">chat_bubble</span>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                }}
                placeholder={`Message #${channelName}...`}
                className="chat-input-field"
              />
            </div>
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!newMessage.trim() || !currentOrg?.id || !channelId}
              title={!currentOrg?.id ? 'Select an organization' : !channelId ? 'Select a channel' : ''}
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

/* ==========================================================================
   LOCAL COMPONENT NEUMORPHIC STYLESHEET
   ========================================================================== */
const styles = `
.workspace-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: var(--nm-bg, #e0e8f6);
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
}

.chat-main-pipeline {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--nm-bg, #e0e8f6);
}

.chat-header {
  height: 4.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  border-bottom: var(--nm-border, 1px solid rgba(255,255,255,0.6));
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.01);
}

.chat-title-area {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.chat-hash {
  color: var(--nm-accent, #4f46e5);
  font-weight: 300;
  font-size: 1.5rem;
}

.chat-channel-name {
  font-weight: 800;
  color: var(--nm-text, #2c3a57);
  font-size: 1.15rem;
  letter-spacing: -0.01em;
}

.chat-org-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--nm-text-muted, #6b7c96);
  box-shadow: var(--nm-shadow-raised, 6px 6px 12px #b8c4d9, -6px -6px 12px #ffffff);
  border: var(--nm-border, 1px solid rgba(255,255,255,0.6));
}

.chat-org-badge span {
  font-size: 1rem;
}

.chat-thread-container {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.chat-empty-state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--nm-text-muted, #6b7c96);
  font-weight: 500;
  font-size: 0.9rem;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.message-row {
  display: flex;
  flex-direction: column;
  width: 100%;
  animation: fadeInMsg 0.25s ease-out forwards;
}

@keyframes fadeInMsg {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.msg-me { align-items: flex-end; }
.msg-them { align-items: flex-start; }

.message-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  padding: 0 0.25rem;
}

.message-sender {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--nm-text-muted, #6b7c96);
}

.message-time {
  font-size: 0.65rem;
  color: var(--nm-text-muted, #6b7c96);
  opacity: 0.7;
}

.message-bubble {
  max-w: 65%;
  padding: 0.85rem 1.2rem;
  font-size: 0.925rem;
  line-height: 1.4;
  border-radius: 1.25rem;
  border: var(--nm-border, 1px solid rgba(255,255,255,0.6));
}

.bubble-me {
  background-color: var(--nm-accent, #4f46e5);
  color: #ffffff;
  border-bottom-right-radius: 0.25rem;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
}

.bubble-them {
  background-color: var(--nm-bg, #e0e8f6);
  color: var(--nm-text, #2c3a57);
  border-bottom-left-radius: 0.25rem;
  box-shadow: var(--nm-shadow-raised, 6px 6px 12px #b8c4d9, -6px -6px 12px #ffffff);
}

.chat-input-bar {
  padding: 1.5rem 2rem;
  border-top: var(--nm-border, 1px solid rgba(255,255,255,0.6));
  background-color: var(--nm-bg, #e0e8f6);
}

.chat-form-element {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.chat-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
}

.chat-input-icon {
  position: absolute;
  left: 1.25rem;
  color: var(--nm-text-muted, #6b7c96);
  pointer-events: none;
  font-size: 1.15rem;
}

.chat-input-field {
  width: 100%;
  padding: 0.85rem 1.25rem 0.85rem 3rem;
  font-size: 0.95rem;
  color: var(--nm-text, #2c3a57);
  background-color: var(--nm-bg, #e0e8f6);
  border: none;
  border-radius: 1.25rem;
  box-shadow: var(--nm-shadow-inset, inset 4px 4px 8px #b8c4d9, inset -4px -4px 8px #ffffff);
  outline: none;
  transition: box-shadow 0.25s ease;
}

.chat-send-btn {
  height: 2.85rem;
  width: 2.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--nm-accent, #4f46e5);
  color: #ffffff;
  border: none;
  border-radius: 1.15rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  transition: all 0.2s ease;
}

.chat-send-btn:hover:not(:disabled) {
  opacity: 0.95;
  transform: translateY(-1px);
}

.chat-send-btn:disabled {
  background-color: var(--nm-bg, #e0e8f6);
  color: var(--nm-text-muted, #6b7c96);
  box-shadow: var(--nm-shadow-raised, 6px 6px 12px #b8c4d9, -6px -6px 12px #ffffff);
  cursor: not-allowed;
  border: var(--nm-border, 1px solid rgba(255,255,255,0.6));
}
`;

if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);
}
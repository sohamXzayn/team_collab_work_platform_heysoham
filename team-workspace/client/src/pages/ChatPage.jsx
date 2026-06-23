import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { ref, push, onValue } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import './neumorphism.css';

export default function ChatPage() {
  const { channelId } = useParams(); 
  const { userData, currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [channelName, setChannelName] = useState('general');
  const messageEndRef = useRef(null);

  // 1. Listen for Active Channel Profile Meta Data
  useEffect(() => {
    if (!channelId) return;
    const channelMetaRef = ref(db, `channels/${channelId}`);
    onValue(channelMetaRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setChannelName(data.name);
    });
  }, [channelId]);

  // 2. Stream Live Stream Channels Messages
  useEffect(() => {
    if (!channelId) return;
    const msgRef = ref(db, `messages/${channelId}`);
    
    const unsubscribe = onValue(msgRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const textStream = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setMessages(textStream);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [channelId]);

  // 3. Auto Scroll View Window Engine
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Handle Discharging Outbound Chat Entries
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const messagePayload = {
        sender: userData?.name || currentUser?.email,
        text: newMessage.trim(),
        timestamp: Date.now() 
      };

      await push(ref(db, `messages/${channelId}`), messagePayload);
      setNewMessage('');
    } catch (err) {
      console.error("Message broadcast error fail sequence", err);
    }
  };

  return (
    <div className="workspace-container">
      {/* Component Sidebar Shell Integration */}
      <Sidebar />

      {/* Main Chat Activity Pipeline Component Frame */}
      <div className="chat-main-pipeline">
        
        {/* Top Header Navigation Meta Info Panel */}
        <div className="chat-header">
          <div className="chat-title-area">
            <span className="chat-hash">#</span>
            <span className="chat-channel-name">{channelName}</span>
          </div>
        </div>

        {/* Dynamic Interactive Message Thread Layout Container */}
        <div className="chat-thread-container">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <span className="empty-icon">💬</span>
              <p>Welcome to the beginning of the #{channelName} channel.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender === (userData?.name || currentUser?.email);
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
            <div className="input-group nm-inset" style={{ flex: 1 }}>
              <span className="material-symbols-outlined input-icon">chat_bubble</span>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message #${channelName}...`}
                className="input-field"
                style={{ boxShadow: 'none' }}
              />
            </div>
            <button type="submit" className="btn-primary chat-send-btn">
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/firebase';
import { ref, push, onValue } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';

export default function ChatPage() {
  const { channelId } = useParams(); // Grabs active channel ID dynamically from route URL
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
        timestamp: Date.now() // Matches blueprint architecture schema
      };

      await push(ref(db, `messages/${channelId}`), messagePayload);
      setNewMessage('');
    } catch (err) {
      console.error("Message broadcast error fail sequence", err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Component Sidebar Shell Integration */}
      <Sidebar />

      {/* Main Chat Activity Pipeline Component Frame */}
      <div className="flex-1 flex flex-col bg-gray-800 text-white h-full">
        {/* Top Header Navigation Meta Info Panel */}
        <div className="h-14 border-b border-gray-700 flex items-center px-6 bg-gray-850 justify-between">
          <div>
            <span className="text-gray-400 font-light text-xl mr-1">#</span>
            <span className="font-bold text-white tracking-wide">{channelName}</span>
          </div>
        </div>

        {/* Dynamic Interactive Message Thread Layout Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
              <span className="text-3xl mb-1">💬</span>
              <p>Welcome to the beginning of the #{channelName} channel.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender === (userData?.name || currentUser?.email);
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center space-x-2 mb-0.5">
                    <span className="text-xs font-bold text-indigo-400">{msg.sender}</span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`max-w-md p-3 rounded-xl text-sm shadow ${
                    isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-700 text-gray-100 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messageEndRef} />
        </div>

        {/* Lower Messaging Form Box Frame Controls */}
        <div className="p-4 bg-gray-850 border-t border-gray-700">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${channelName}...`}
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2.5 text-sm border border-gray-600 focus:outline-none focus:border-indigo-500 transition placeholder-gray-500"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-5 rounded-lg text-sm font-bold tracking-wide transition shadow">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
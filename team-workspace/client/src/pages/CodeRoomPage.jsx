import { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, set, push } from 'firebase/database';
import { useAuth } from '../context/AuthContext';

export default function CodeRoomPage({ teamId = "team1" }) {
  const { userData } = useAuth();
  
  // Live Scratchpad States
  const [scratchpadMode, setScratchpadMode] = useState('javascript');
  const [scratchpadCode, setScratchpadCode] = useState('');
  const [syncStatus, setSyncStatus] = useState('Synced');
  
  // Real-time synchronization cursor preservation layout elements
  const textareaRef = useRef(null);
  const isIncomingSyncRef = useRef(false);
  const debounceTimeoutRef = useRef(null);

  // Snippet Vault States
  const [snippets, setSnippets] = useState([]);
  const [title, setTitle] = useState('');
  const [codeBlock, setCodeBlock] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [copiedId, setCopiedId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');

  // 1. Stream Live Scratchpad Data with selection state tracking
  useEffect(() => {
    const scratchRef = ref(db, `codeRooms/${teamId}/scratchpad`);
    const unsubscribe = onValue(scratchRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        isIncomingSyncRef.current = true;

        // Preserve typing selection offset positions
        const textarea = textareaRef.current;
        const startPos = textarea ? textarea.selectionStart : 0;
        const endPos = textarea ? textarea.selectionEnd : 0;

        setScratchpadCode(data.code || '');
        setScratchpadMode(data.language || 'javascript');

        // Restore cursor selection array values on next execution frame
        requestAnimationFrame(() => {
          if (textarea && document.activeElement === textarea) {
            textarea.setSelectionRange(startPos, endPos);
          }
          isIncomingSyncRef.current = false;
        });
      } else {
        isIncomingSyncRef.current = false;
      }
    });
    return () => unsubscribe();
  }, [teamId]);

  // 2. Transmit delta updates to database registry
  const handleScratchpadChange = (text, currentLang) => {
    setScratchpadCode(text);
    
    // Prevent reflecting modifications back up if triggered by remote user events
    if (isIncomingSyncRef.current) return;

    setSyncStatus('Typing...');
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    debounceTimeoutRef.current = setTimeout(() => {
      setSyncStatus('Syncing...');
      set(ref(db, `codeRooms/${teamId}/scratchpad`), {
        code: text,
        language: currentLang,
        lastEditedBy: userData?.name || 'Teammate',
        updatedAt: Date.now()
      })
      .then(() => setSyncStatus('Synced'))
      .catch(() => setSyncStatus('Sync Error'));
    }, 450); 
  };

  // 3. Stream Shared Snippet Vault Array
  useEffect(() => {
    const vaultRef = ref(db, `codeRooms/${teamId}/snippets`);
    const unsubscribe = onValue(vaultRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setSnippets(list.reverse());
      } else {
        setSnippets([]);
      }
    });
    return () => unsubscribe();
  }, [teamId]);

  // 4. Commit a Snippet to the Absolute Repository Vault
  const handleSaveSnippet = async (e) => {
    e.preventDefault();
    if (!title.trim() || !codeBlock.trim()) return;

    const snippetPayload = {
      title: title.trim(),
      code: codeBlock.trim(),
      language,
      author: userData?.name || 'Developer',
      timestamp: Date.now()
    };

    try {
      await push(ref(db, `codeRooms/${teamId}/snippets`), snippetPayload);
      setTitle('');
      setCodeBlock('');
    } catch (err) {
      console.error("Snippet failed to store safely inside database vault", err);
    }
  };

  // 5. Execution Hook Engine
  const handleRunCode = async () => {
    setIsRunning(true);
    setConsoleOutput("Running...");
    
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE_URL = isLocal ? "http://localhost:5000" : "https://team-collab-work-platform-heysoham.onrender.com";

  try {
    const response = await fetch(`${API_BASE_URL}/api/sandbox/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: scratchpadCode, language: scratchpadMode })
    });

    const data = await response.json();
    
    if (data.error) {
      setConsoleOutput(`Backend Error: ${data.error}`);
      return;
    }

    // Safe Base64 Decoding Function
    const decode = (str) => {
      if (!str) return "";
      try {
        return decodeURIComponent(atob(str).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
      } catch (e) {
        try { return atob(str); } catch (err) { return "Decoding error: " + str; }
      }
    };

    const stdout = decode(data.stdout);
    const stderr = decode(data.stderr);
    const compileError = decode(data.compile_output);

    if (compileError) {
      setConsoleOutput(`Compilation Error:\n${compileError}`);
    } else if (stderr) {
      setConsoleOutput(`Runtime Error:\n${stderr}`);
    } else if (stdout) {
      setConsoleOutput(stdout);
    } else {
      setConsoleOutput("Code executed successfully (no stdout produced).");
    }
  } catch (err) {
    setConsoleOutput("Execution Hook Connection Failure: " + err.message);
  } finally {
    setIsRunning(false);
  }
};

  // 6. Native Clipboard Transfer Engine
  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Helper helper to dynamically color terminal logs
  const getConsoleTextColor = () => {
    if (consoleOutput.startsWith("Error:") || consoleOutput.includes("Error:\n")) return "text-red-400";
    if (consoleOutput === "Running...") return "text-amber-400";
    if (consoleOutput.startsWith("Code executed successfully")) return "text-emerald-400";
    return "text-slate-200";
  };

  // Helper helper to get dynamic badge colors based on sync status
  const getSyncBadgeStyles = () => {
    switch (syncStatus) {
      case 'Synced': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Typing...': return 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse';
      case 'Syncing...': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default: return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Multi-User Scratchpad Deck */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[780px] overflow-hidden">
          
          {/* Header Panel */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <span className="material-symbols-outlined block text-xl">terminal</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Pair Playground</h3>
                <p className="text-xs text-slate-500">Real-time code synchronization</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select 
                value={scratchpadMode} 
                onChange={(e) => {
                  setScratchpadMode(e.target.value);
                  handleScratchpadChange(scratchpadCode, e.target.value);
                }}
                className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-1.5 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="htmlcss">HTML/CSS</option>
                <option value="sql">SQL / Database</option>
              </select>
              
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 transition-all duration-200 ${getSyncBadgeStyles()}`}>
                <span className="material-symbols-outlined text-sm" style={{ fontSize: '14px' }}>
                  {syncStatus === 'Synced' ? 'cloud_done' : 'sync'}
                </span>
                {syncStatus}
              </span>
            </div>
          </div>
          
          {/* Code Editor Body */}
          <div className="flex-1 relative bg-slate-950 p-1">
            <textarea
              ref={textareaRef}
              value={scratchpadCode}
              onChange={(e) => handleScratchpadChange(e.target.value, scratchpadMode)}
              placeholder="// Paste code arrays, debug API payloads, or collaborate on algorithmic setups here live..."
              className="w-full h-full bg-slate-950 text-slate-100 font-mono text-sm p-4 focus:outline-none resize-none leading-relaxed tracking-wide placeholder-slate-600 custom-scrollbar"
            />
          </div>
          
          {/* Controls Bar */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className={`text-xs py-2 px-4 rounded-lg font-semibold flex items-center gap-1.5 shadow-sm transition-all duration-150 ${
                isRunning 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.98]'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {isRunning ? 'hourglass_empty' : 'play_arrow'}
              </span>
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
            <span className="text-xs text-slate-400 font-medium">Sandbox runtime supports JS & Python</span>
          </div>

          {/* Console Output Block */}
          <div className="border-t border-slate-200 bg-slate-900 flex flex-col h-[240px]">
            <div className="px-4 py-2 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
              <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                Sandbox Console Output
              </label>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            </div>
            <pre className={`p-4 flex-1 font-mono text-xs overflow-y-auto whitespace-pre-wrap leading-relaxed select-all custom-scrollbar ${getConsoleTextColor()}`}>
              {consoleOutput || 'Console is clean. Run your Javascript or Python code above to view output.'}
            </pre>
          </div>
        </div>

        {/* Right Column: Snippet Preservation Form & Feed Vault */}
        <div className="lg:col-span-5 flex flex-col space-y-6 h-[780px]">
          
          {/* Vault Push Form Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <span className="material-symbols-outlined block text-xl">integration_instructions</span>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Vault New Snippet</h3>
                <p className="text-xs text-slate-500">Archive utility logic for your team</p>
              </div>
            </div>

            <form onSubmit={handleSaveSnippet} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Snippet Hook Title"
                  className="col-span-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all placeholder-slate-400"
                />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="javascript">JS</option>
                  <option value="python">Python</option>
                  <option value="htmlcss">CSS/HTML</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              
              <textarea
                value={codeBlock}
                onChange={(e) => setCodeBlock(e.target.value)}
                placeholder="/* Paste permanent component hooks, configurations, or utilities here to archive them for the team */"
                className="w-full h-28 bg-slate-50 border border-slate-200 text-slate-800 font-mono text-xs p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all resize-none placeholder-slate-400"
              />
              
              <button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs py-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99] transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span> 
                Archive to Vault
              </button>
            </form>
          </div>

          {/* Shared Repositories Stream */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved Repositories Vault</span>
              <span className="text-[11px] bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                {snippets.length} Items
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar pb-4">
              {snippets.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200/60 p-8 text-center border-dashed">
                  <span className="material-symbols-outlined text-slate-300 text-3xl mb-1.5 block">inventory_2</span>
                  <p className="text-slate-400 text-xs font-medium">The system snippet vault is empty.</p>
                </div>
              ) : (
                snippets.map((snip) => (
                  <div key={snip.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden group relative transition-all duration-200 hover:border-slate-300">
                    
                    {/* Snippet Card Top Deck */}
                    <div className="flex items-start justify-between px-4 py-3 bg-slate-50/60 border-b border-slate-100">
                      <div>
                        <h4 className="font-semibold text-slate-800 text-xs tracking-tight">{snip.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Shared by <span className="text-indigo-600 font-semibold">{snip.author}</span>
                        </p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 font-bold rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                        {snip.language}
                      </span>
                    </div>

                    {/* Code Container */}
                    <div className="relative bg-slate-900">
                      <pre className="p-3.5 overflow-x-auto font-mono text-[11px] text-slate-200 leading-relaxed custom-scrollbar max-h-48">
                        {snip.code}
                      </pre>
                      
                      {/* Interactive Float Copy Button */}
                      <button
                        onClick={() => copyToClipboard(snip.code, snip.id)}
                        className={`absolute top-2.5 right-2.5 p-1.5 rounded-md border backdrop-blur-sm shadow-sm transition-all duration-150 ${
                          copiedId === snip.id 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 opacity-100' 
                            : 'bg-slate-800/40 text-slate-400 border-slate-700/50 opacity-0 group-hover:opacity-100 hover:bg-slate-700/60 hover:text-slate-200'
                        }`}
                        title="Copy Code Block"
                      >
                        <span className="material-symbols-outlined block" style={{ fontSize: '15px' }}>
                          {copiedId === snip.id ? 'check_circle' : 'content_copy'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  ); 
}
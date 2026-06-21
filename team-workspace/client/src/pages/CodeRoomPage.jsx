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
  const debounceTimeoutRef = useRef(null);

  // Snippet Vault States
  const [snippets, setSnippets] = useState([]);
  const [title, setTitle] = useState('');
  const [codeBlock, setCodeBlock] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [copiedId, setCopiedId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('');

  // 1. Stream Live Scratchpad Data
  useEffect(() => {
    const scratchRef = ref(db, `codeRooms/${teamId}/scratchpad`);
    const unsubscribe = onValue(scratchRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setScratchpadCode(data.code || '');
        setScratchpadMode(data.language || 'javascript');
      }
    });
    return () => unsubscribe();
  }, [teamId]);

  // 2. Debounced Real-time Sync for Scratchpad
  const handleScratchpadChange = (text, currentLang) => {
    setScratchpadCode(text);
    setSyncStatus('Typing...');

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    debounceTimeoutRef.current = setTimeout(() => {
      setSyncStatus('Syncing...');
      set(ref(db, `codeRooms/${teamId}/scratchpad`), {
        code: text,
        language: currentLang,
        lastEditedBy: userData?.name || 'Teammate'
      })
      .then(() => setSyncStatus('Synced'))
      .catch(() => setSyncStatus('Sync Error'));
    }, 1000);
  };

  // 3. Stream Shared Snippet Vault Array
  useEffect(() => {
    const vaultRef = ref(db, `codeRooms/${teamId}/snippets`);
    const unsubscribe = onValue(vaultRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setSnippets(list.reverse()); // Keep fresh code snippets at top
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

  // Sandbox API code execution service
  const handleRunCode = async () => {
    if (scratchpadMode !== 'javascript' && scratchpadMode !== 'python') {
      setConsoleOutput("Code execution is only supported for JavaScript and Python languages in this environment.");
      return;
    }
    setIsRunning(true);
    setConsoleOutput("Executing your code in sandbox...\n");
    try {
      const response = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: scratchpadMode,
          version: scratchpadMode === 'javascript' ? '18.15.0' : '3.10.0',
          files: [{ content: scratchpadCode }]
        })
      });
      const data = await response.json();
      if (data && data.run) {
        const output = data.run.stdout || data.run.stderr || "Code executed successfully (no output generated).";
        setConsoleOutput(output);
      } else {
        setConsoleOutput("Execution Error: Failed to receive response from execution engine.");
      }
    } catch (err) {
      setConsoleOutput("Execution Failed: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // 5. Native Clipboard Transfer Engine
  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="page-container">
      <div className="content-max-width grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Multi-User Scratchpad Deck */}
        <div className="lg:col-span-7 section-card flex flex-col h-[650px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-indigo flex items-center gap-2">
              <span className="material-symbols-outlined">terminal</span>
              Pair Playground
            </h3>
            <div className="flex items-center gap-3">
              <select 
                value={scratchpadMode} 
                onChange={(e) => {
                  setScratchpadMode(e.target.value);
                  handleScratchpadChange(scratchpadCode, e.target.value);
                }}
                className="input-field text-xs py-1 px-2"
                style={{ width: 'auto', marginBottom: 0 }}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="htmlcss">HTML/CSS</option>
                <option value="sql">SQL / Database</option>
              </select>
              <span className="text-xs text-gray-muted flex items-center gap-1">
                <span className="material-symbols-outlined text-xs" style={{ fontSize: '14px' }}>
                  {syncStatus === 'Synced' ? 'cloud_done' : 'sync'}
                </span>
                {syncStatus}
              </span>
            </div>
          </div>
          <textarea
            value={scratchpadCode}
            onChange={(e) => handleScratchpadChange(e.target.value, scratchpadMode)}
            placeholder="// Paste code arrays, debug API payloads, or collaborate on algorithmic setups here live..."
            className="w-full flex-1 input-field font-mono text-xs p-4 bg-gray-900 text-green-400 border-none rounded-xl focus:ring-1 focus:ring-indigo-500 overflow-y-auto leading-relaxed resize-none shadow-inner"
            style={{ minHeight: '180px' }}
          />
          
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="btn-success text-xs py-2 px-4 rounded-lg font-bold flex items-center gap-1.5"
              style={{ width: 'max-content', margin: 0 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>play_arrow</span>
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
            <span className="text-xs text-gray-muted">Sandbox runtime supports JS & Python</span>
          </div>

          <div className="mt-3 flex-1 flex flex-col min-h-[140px] max-h-[220px]">
            <label className="block text-gray-muted text-xs font-bold mb-1 uppercase">Sandbox Console Output</label>
            <pre className="w-full flex-1 p-3 rounded-xl bg-gray-950 text-white font-mono text-[10px] overflow-y-auto leading-normal shadow-inner whitespace-pre-wrap select-all">
              {consoleOutput || 'Console is clean. Run your Javascript or Python code above to view output.'}
            </pre>
          </div>
        </div>

        {/* Right Column: Snippet Preservation Form & Feed Vault */}
        <div className="lg:col-span-5 flex flex-col space-y-6 h-[620px] overflow-y-auto pr-1">
          
          {/* Vault Push Form */}
          <div className="section-card">
            <h3 className="text-lg font-bold mb-3 text-indigo flex items-center gap-2">
              <span className="material-symbols-outlined">integration_instructions</span>
              Vault New Snippet
            </h3>
            <form onSubmit={handleSaveSnippet} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Snippet Hook Title"
                  className="col-span-2 input-field text-xs py-2"
                />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="input-field text-xs py-2"
                  style={{ padding: '0.45rem' }}
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
                placeholder="/* Paste permanent component hooks, configurations, or utilities here */"
                className="w-full h-24 input-field font-mono text-xs p-3 resize-none"
              />
              <button type="submit" className="w-full btn-outline text-xs py-2 font-bold flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>save</span> Archive to Vault
              </button>
            </form>
          </div>

          {/* Locked Repositories Stream */}
          <div className="space-y-4 flex-1">
            {snippets.length === 0 ? (
              <p className="text-gray-muted text-xs text-center py-8">The system snippet vault is currently empty.</p>
            ) : (
              snippets.map((snip) => (
                <div key={snip.id} className="section-card relative group p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm tracking-tight">{snip.title}</h4>
                      <p className="text-[10px] text-gray-muted mt-0.5">
                        Shared by <span className="text-indigo font-semibold">{snip.author}</span>
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-indigo-50 text-indigo rounded border border-indigo-100">
                      {snip.language}
                    </span>
                  </div>
                  <div className="relative">
                    <pre className="p-3 bg-gray-50 border border-gray-100 rounded-lg overflow-x-auto text-[11px] font-mono text-gray-700 leading-normal max-h-36 shadow-inner">
                      {snip.code}
                    </pre>
                    <button
                      onClick={() => copyToClipboard(snip.code, snip.id)}
                      className="absolute top-2 right-2 p-1 bg-white border border-gray-200 text-gray-500 hover:text-indigo rounded-md shadow-sm transition-all duration-200 flex items-center justify-center cursor-pointer"
                      title="Copy Code Block"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
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
  );
}
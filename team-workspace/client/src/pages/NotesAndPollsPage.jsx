import { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, set, update, push } from 'firebase/database';
import { useAuth } from '../context/AuthContext';

export default function NotesAndPollsPage({ teamId = "team1" }) {
  const { userData } = useAuth();
  
  // Real-time Note States
  const [noteText, setNoteText] = useState('');
  const [savingStatus, setSavingStatus] = useState('All changes saved');
  const debounceTimeoutRef = useRef(null);

  // Poll States
  const [polls, setPolls] = useState([]);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // 1. Sync Collaborative Notepad with Database
  useEffect(() => {
    const noteRef = ref(db, `notes/${teamId}`);
    const unsubscribe = onValue(noteRef, (snapshot) => {
      const data = snapshot.val();
      if (data !== null && data !== undefined) {
        setNoteText(data);
      }
    });
    return () => unsubscribe();
  }, [teamId]);

  // 2. Debounced Auto-Save Mechanism
  const handleNoteChange = (e) => {
    const text = e.target.value;
    setNoteText(text);
    setSavingStatus('Typing...');

    // Clear previous pending write timer
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    // Set up new 1.5-second debounce cycle
    debounceTimeoutRef.current = setTimeout(() => {
      setSavingStatus('Saving to Firebase...');
      set(ref(db, `notes/${teamId}`), text)
        .then(() => setSavingStatus('All changes saved'))
        .catch(() => setSavingStatus('Error saving changes'));
    }, 1500);
  };

  // 3. Stream Live Team Polls
  useEffect(() => {
    const pollsRef = ref(db, 'polls');
    const unsubscribe = onValue(pollsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(p => p.teamId === teamId);
        setPolls(list.reverse());
      } else {
        setPolls([]);
      }
    });
    return () => unsubscribe();
  }, [teamId]);

  // 4. Submit New Live Team Poll
  const handleCreatePoll = async (e) => {
    e.preventDefault();
    const activeOptions = pollOptions.filter(opt => opt.trim() !== '');
    if (!pollQuestion.trim() || activeOptions.length < 2) return;

    // Build standard poll structural options blueprint array map
    const formattedOptions = {};
    activeOptions.forEach((opt, index) => {
      formattedOptions[`opt_${index}`] = { text: opt, votes: 0 };
    });

    const pollPayload = {
      teamId,
      question: pollQuestion.trim(),
      options: formattedOptions,
      creator: userData?.name || 'Teammate',
      timestamp: Date.now()
    };

    await push(ref(db, 'polls'), pollPayload);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  // 5. cast vote logic
  const handleCastVote = async (pollId, optionKey, currentVotes) => {
    try {
      await update(ref(db, `polls/${pollId}/options/${optionKey}`), {
        votes: currentVotes + 1
      });
    } catch (err) {
      console.error("Failed to commit vote transaction matrix", err);
    }
  };

  return (
    <div className="page-container">
      <div className="content-max-width grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Hand: Collaborative Document Node */}
        <div className="section-card flex flex-col h-[550px]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-indigo flex items-center gap-2">
              <span className="material-symbols-outlined">edit_note</span> 
              Shared Notepad
            </h3>
            <span className="text-xs text-gray-muted flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {savingStatus.includes('saved') ? 'cloud_done' : 'sync'}
              </span>
              {savingStatus}
            </span>
          </div>
          <textarea
            value={noteText}
            onChange={handleNoteChange}
            placeholder="Start typing project briefs, script workflows, or architecture endpoints. Anyone on the team can edit live..."
            className="w-full flex-1 input-field resize-none font-mono text-sm p-4 leading-relaxed"
          />
        </div>

        {/* Right Hand: Interactive Poll Core Node */}
        <div className="flex flex-col space-y-6 h-[550px] overflow-y-auto pr-1">
          
          {/* Create Poll Box */}
          <div className="section-card">
            <h3 className="text-xl font-bold mb-4 text-indigo flex items-center gap-2">
              <span className="material-symbols-outlined">poll</span> 
              Launch Team Poll
            </h3>
            <form onSubmit={handleCreatePoll} className="space-y-3">
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="What should our primary layout color theme be?"
                className="w-full input-field"
              />
              {pollOptions.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions];
                    next[i] = e.target.value;
                    setPollOptions(next);
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="w-full input-field text-xs py-2"
                />
              ))}
              <div className="flex justify-between items-center pt-1">
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-xs text-indigo font-bold flex items-center gap-1 hover:underline"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_circle</span> Add Option
                </button>
                <button type="submit" className="btn-outline text-xs px-4 py-2 font-bold">Launch</button>
              </div>
            </form>
          </div>

          {/* Real-time Poll Feed */}
          <div className="space-y-4 flex-1">
            {polls.map((poll) => (
              <div key={poll.id} className="section-card">
                <p className="font-bold text-gray-800 text-sm mb-3 flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-indigo" style={{ fontSize: '18px' }}>quiz</span>
                  {poll.question}
                </p>
                <div className="space-y-2">
                  {Object.keys(poll.options || {}).map((optKey) => {
                    const opt = poll.options[optKey];
                    return (
                      <button
                        key={optKey}
                        onClick={() => handleCastVote(poll.id, optKey, opt.votes)}
                        className="w-full text-left p-2.5 text-xs rounded-lg border border-gray-100 hover:bg-gray-50 flex justify-between items-center transition shadow-inner"
                      >
                        <span className="font-medium text-gray-700">{opt.text}</span>
                        <span className="bg-indigo-50 text-indigo px-2 py-0.5 rounded-md font-bold">{opt.votes} votes</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
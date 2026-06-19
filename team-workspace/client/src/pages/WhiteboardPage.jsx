import React, { useRef, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { useAuth } from '../context/AuthContext';

export default function WhiteboardPage({ teamId = "team1" }) {
  const { userData } = useAuth();
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#6366f1'); // Default Indigo
  const [lineWidth, setLineWidth] = useState('5');
  const [tool, setTool] = useState('draw'); // draw or erase

  // 1. Initialize and configure Canvas board context
  useEffect(() => {
    const canvas = canvasRef.current;
    // Set display sizing support for high-res monitors
    canvas.width = canvas.parentElement.offsetWidth * 2;
    canvas.height = 500 * 2;
    canvas.style.width = `${canvas.parentElement.offsetWidth}px`;
    canvas.style.height = `500px`;

    const context = canvas.getContext('2d');
    context.scale(2, 2);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;
  }, []);

  // 2. Stream drawing strokes from Firebase Realtime DB matrix
  useEffect(() => {
    if (!contextRef.current) return;
    
    const boardRef = ref(db, `whiteboards/${teamId}/strokes`);
    const unsubscribe = onValue(boardRef, (snapshot) => {
      const data = snapshot.val();
      
      // Clear canvas before full redraw stack iteration
      const canvas = canvasRef.current;
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height);

      if (data) {
        Object.values(data).forEach((stroke) => {
          if (!stroke.points || stroke.points.length === 0) return;
          
          contextRef.current.beginPath();
          contextRef.current.strokeStyle = stroke.tool === 'erase' ? '#ffffff' : stroke.color;
          contextRef.current.lineWidth = stroke.lineWidth;

          const startPoint = stroke.points[0];
          contextRef.current.moveTo(startPoint.x, startPoint.y);

          for (let i = 1; i < stroke.points.length; i++) {
            contextRef.current.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          contextRef.current.stroke();
        });
      }
    });

    return () => unsubscribe();
  }, [teamId]);

  // Current stroke cache vector
  let currentStrokePoints = [];
  let currentStrokeId = null;

  // 3. User interaction: Pointer Down
  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setIsDrawing(true);

    const point = { x: offsetX, y: offsetY };
    currentStrokePoints = [point];

    // Generate unique slot on database coordinate array
    const strokeListRef = ref(db, `whiteboards/${teamId}/strokes`);
    const newStrokeRef = push(strokeListRef);
    currentStrokeId = newStrokeRef.key;

    set(newStrokeRef, {
      points: currentStrokePoints,
      color: color,
      lineWidth: parseInt(lineWidth),
      tool: tool,
      user: userData?.name || 'Teammate'
    });
  };

  // 4. User interaction: Pointer Move (with active validation)
  const draw = ({ nativeEvent }) => {
    if (!isDrawing || !currentStrokeId) return;
    const { offsetX, offsetY } = nativeEvent;

    const point = { x: offsetX, y: offsetY };
    currentStrokePoints.push(point);

    // Update the stroke point array vector sequentially in DB
    set(ref(db, `whiteboards/${teamId}/strokes/${currentStrokeId}/points`), currentStrokePoints);
  };

  // 5. User interaction: Pointer Release / Exit
  const stopDrawing = () => {
    setIsDrawing(false);
    currentStrokeId = null;
    currentStrokePoints = [];
  };

  // 6. Clear Complete Multiuser Canvas System
  const handleClearBoard = async () => {
    if (window.confirm("Are you sure you want to completely reset the team canvas board?")) {
      await remove(ref(db, `whiteboards/${teamId}`));
    }
  };

  return (
    <div className="page-container">
      <div className="content-max-width flex flex-col space-y-4">
        
        {/* Whiteboard Controls Navbar */}
        <div className="section-card flex flex-wrap items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-indigo flex items-center gap-1.5 mr-2">
              <span className="material-symbols-outlined">gesture</span>
              Design Canvas
            </h3>
            
            <button 
              onClick={() => setTool('draw')} 
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition ${tool === 'draw' ? 'bg-indigo-50 text-indigo border-indigo-200 shadow-sm' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              <span className="material-symbols-outlined text-sm" style={{ fontSize: '18px' }}>draw</span> Pencil
            </button>
            
            <button 
              onClick={() => setTool('erase')} 
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition ${tool === 'erase' ? 'bg-indigo-50 text-indigo border-indigo-200 shadow-sm' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              <span className="material-symbols-outlined text-sm" style={{ fontSize: '18px' }}>eraser</span> Eraser
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Color Config Palette Picker */}
            {tool === 'draw' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-muted font-medium">Palette:</span>
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 p-0 border-none rounded cursor-pointer bg-transparent"
                />
              </div>
            )}

            {/* Stroke Width Config Slider */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-muted font-medium">Size:</span>
              <input 
                type="range" 
                min="2" 
                max="20" 
                value={lineWidth} 
                onChange={(e) => setLineWidth(e.target.value)}
                className="w-20 accent-indigo"
              />
              <span className="text-xs text-gray-600 font-mono w-4">{lineWidth}px</span>
            </div>

            {/* Clear Action Handle */}
            <button 
              onClick={handleClearBoard}
              className="btn-danger flex items-center gap-1 text-xs py-1.5 px-3"
            >
              <span className="material-symbols-outlined text-sm" style={{ fontSize: '18px' }}>delete_sweep</span> 
              Wipe Board
            </button>
          </div>
        </div>

        {/* Real Interactive Canvas Body Wrapper */}
        <div className="section-card p-2 bg-white rounded-2xl border border-gray-100 shadow-inner overflow-hidden" style={{ height: '518px' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full bg-white block rounded-xl cursor-crosshair touch-none"
          />
        </div>

      </div>
    </div>
  );
}
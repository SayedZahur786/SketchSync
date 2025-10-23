import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DrawingCanvas from './DrawingCanvas';
import UserCursors from './UserCursors';
import { getSocket } from '../socket.js';

const channel = new BroadcastChannel('whiteboard-sync');

const Whiteboard = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(1);
  const [color, setColor] = useState('#FF69B4');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [tool, setTool] = useState('pen');
  const [stickyNotes, setStickyNotes] = useState([]);
  const [textBoxes, setTextBoxes] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const socketRef = useRef(null);
  const hasJoinedRef = useRef(false);

  useEffect(() => {
    socketRef.current = getSocket();

    if (roomId && !hasJoinedRef.current) {
      socketRef.current.emit('join-room', roomId);
      hasJoinedRef.current = true;
    }

    const handleUserCount = (count) => setUserCount(count);
    socketRef.current.on('user-count', handleUserCount);

    return () => {
      socketRef.current.off('user-count', handleUserCount);
    };
  }, [roomId]);

  const handleClearCanvas = () => {
    socketRef.current.emit('clear-canvas', { roomId });
    channel.postMessage({ type: 'clear-canvas' });
    setStickyNotes([]);
    setTextBoxes([]);
  };

  const handleAddStickyNote = () => {
    const newNote = {
      id: Date.now(),
      text: 'I am sticky note',
      x: Math.random() * 60 + 20,
      y: Math.random() * 60 + 20,
      color: '#60A5FA'
    };
    setStickyNotes([...stickyNotes, newNote]);
  };

  const handleAddText = () => {
    const newText = {
      id: Date.now(),
      text: 'Text',
      x: Math.random() * 60 + 20,
      y: Math.random() * 60 + 20,
      color: color
    };
    setTextBoxes([...textBoxes, newText]);
  };

  useEffect(() => {
    channel.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === 'color-change') setColor(data.color);
      if (type === 'stroke-change') setStrokeWidth(data.strokeWidth);
      if (type === 'tool-change') setTool(data.tool);
      if (type === 'clear-canvas') {
        socketRef.current.emit('clear-canvas', { roomId });
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  const tools = [
    { id: 'select', icon: '➤', label: 'Select', svg: 'M3 3l7 7m0 0v-7m0 7H3' },
    { id: 'text', icon: 'T', label: 'Text' },
    { id: 'sticky', icon: '📄', label: 'Sticky Note' },
    { id: 'rectangle', icon: '⬜', label: 'Rectangle' },
    { id: 'circle', icon: '⭕', label: 'Circle' },
    { id: 'pen', icon: '✏️', label: 'Pen' }
  ];

  return (
    <div className="w-screen h-screen flex bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-16 bg-white shadow-lg flex flex-col items-center py-4 gap-3 border-r border-gray-200">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === 'sticky') {
                handleAddStickyNote();
              } else if (t.id === 'text') {
                handleAddText();
              } else {
                setTool(t.id);
                channel.postMessage({ type: 'tool-change', data: { tool: t.id } });
              }
            }}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
              tool === t.id
                ? 'bg-blue-100 text-blue-600 shadow-md'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title={t.label}
          >
            <span className="text-xl">{t.icon}</span>
          </button>
        ))}

        {/* Undo/Redo */}
        <div className="border-t border-gray-200 pt-3 mt-auto space-y-2">
          <button
            onClick={() => {
              /* TODO: Implement undo */
            }}
            className="w-12 h-12 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600"
            title="Undo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={() => {
              /* TODO: Implement redo */
            }}
            className="w-12 h-12 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600"
            title="Redo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">S</span>
              </div>
              <span className="font-semibold text-gray-700">Dashboard</span>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all text-sm font-medium"
            >
              Go To Dashboard
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Untitled
            </span>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-all">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-white">
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(#e5e7eb 1px, transparent 1px),
                linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />

          <DrawingCanvas
            socket={socketRef.current}
            roomId={roomId}
            color={color}
            strokeWidth={strokeWidth}
            tool={tool}
          />
          
          {/* Sticky Notes */}
          {stickyNotes.map((note) => (
            <div
              key={note.id}
              className="absolute cursor-move shadow-lg"
              style={{
                left: `${note.x}%`,
                top: `${note.y}%`,
                backgroundColor: note.color,
                width: '150px',
                height: '150px'
              }}
              draggable
              onDragEnd={(e) => {
                const rect = e.currentTarget.parentElement.getBoundingClientRect();
                const newX = ((e.clientX - rect.left) / rect.width) * 100;
                const newY = ((e.clientY - rect.top) / rect.height) * 100;
                
                setStickyNotes(stickyNotes.map(n => 
                  n.id === note.id ? { ...n, x: newX, y: newY } : n
                ));
              }}
            >
              <div className="p-3 h-full flex flex-col">
                <textarea
                  className="flex-1 bg-transparent text-white text-sm resize-none outline-none"
                  value={note.text}
                  onChange={(e) => {
                    setStickyNotes(stickyNotes.map(n => 
                      n.id === note.id ? { ...n, text: e.target.value } : n
                    ));
                  }}
                  placeholder="Type here..."
                />
              </div>
            </div>
          ))}

          {/* Text Boxes */}
          {textBoxes.map((textBox) => (
            <div
              key={textBox.id}
              className="absolute cursor-move"
              style={{
                left: `${textBox.x}%`,
                top: `${textBox.y}%`,
                color: textBox.color,
                fontSize: '24px',
                fontWeight: '500'
              }}
              draggable
              onDragEnd={(e) => {
                const rect = e.currentTarget.parentElement.getBoundingClientRect();
                const newX = ((e.clientX - rect.left) / rect.width) * 100;
                const newY = ((e.clientY - rect.top) / rect.height) * 100;
                
                setTextBoxes(textBoxes.map(t => 
                  t.id === textBox.id ? { ...t, x: newX, y: newY } : t
                ));
              }}
            >
              <input
                type="text"
                className="bg-transparent outline-none border-b-2 border-current"
                value={textBox.text}
                onChange={(e) => {
                  setTextBoxes(textBoxes.map(t => 
                    t.id === textBox.id ? { ...t, text: e.target.value } : t
                  ));
                }}
                style={{ minWidth: '100px' }}
              />
            </div>
          ))}

          <UserCursors socket={socketRef.current} roomId={roomId} />
        </div>

        {/* Bottom Info Bar */}
        <div className="bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Room: <span className="font-mono font-semibold">{roomId}</span>
            </span>
            <span className="text-gray-600">
              Active users: <span className="font-semibold">{userCount}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearCanvas}
              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-all text-sm"
            >
              Clear Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
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
  const [selectedShape, setSelectedShape] = useState('rectangle');
  const [penType, setPenType] = useState('solid'); // solid, dashed, dotted
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const [stickyNotes, setStickyNotes] = useState([]);
  const [textBoxes, setTextBoxes] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedElementType, setSelectedElementType] = useState(null); // 'sticky' or 'text'
  
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  const socketRef = useRef(null);
  const hasJoinedRef = useRef(false);
  const canvasRef = useRef(null);

  const colors = ['#FF69B4', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#000000'];
  const stickyColors = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#FB923C'];

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

  const saveCanvasState = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current.getCanvas();
      if (canvas) {
        const imageData = canvas.toDataURL();
        const newHistory = canvasHistory.slice(0, historyStep + 1);
        newHistory.push({
          imageData,
          stickyNotes: [...stickyNotes],
          textBoxes: [...textBoxes]
        });
        setCanvasHistory(newHistory);
        setHistoryStep(newHistory.length - 1);
      }
    }
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      const state = canvasHistory[newStep];
      setHistoryStep(newStep);
      
      if (canvasRef.current && state) {
        canvasRef.current.loadFromDataURL(state.imageData);
        setStickyNotes(state.stickyNotes || []);
        setTextBoxes(state.textBoxes || []);
      }
    }
  };

  const handleRedo = () => {
    if (historyStep < canvasHistory.length - 1) {
      const newStep = historyStep + 1;
      const state = canvasHistory[newStep];
      setHistoryStep(newStep);
      
      if (canvasRef.current && state) {
        canvasRef.current.loadFromDataURL(state.imageData);
        setStickyNotes(state.stickyNotes || []);
        setTextBoxes(state.textBoxes || []);
      }
    }
  };

  const handleClearCanvas = () => {
    socketRef.current.emit('clear-canvas', { roomId });
    channel.postMessage({ type: 'clear-canvas' });
    setStickyNotes([]);
    setTextBoxes([]);
    saveCanvasState();
  };

  const handleAddStickyNote = () => {
    const newNote = {
      id: Date.now(),
      text: 'I am sticky note',
      x: Math.random() * 60 + 20,
      y: Math.random() * 60 + 20,
      width: 200,
      height: 200,
      color: '#60A5FA',
      textColor: '#FFFFFF'
    };
    setStickyNotes([...stickyNotes, newNote]);
    saveCanvasState();
  };

  const handleAddText = () => {
    const newText = {
      id: Date.now(),
      text: 'Text',
      x: Math.random() * 60 + 20,
      y: Math.random() * 60 + 20,
      width: 150,
      height: 40,
      fontSize: 24,
      color: color,
      isSelected: true
    };
    setTextBoxes([...textBoxes, newText]);
    setSelectedElement(newText.id);
    setSelectedElementType('text');
    saveCanvasState();
  };

  const handleSelectElement = (id, type) => {
    setSelectedElement(id);
    setSelectedElementType(type);
  };

  const updateStickyNote = (id, updates) => {
    setStickyNotes(stickyNotes.map(note => 
      note.id === id ? { ...note, ...updates } : note
    ));
  };

  const updateTextBox = (id, updates) => {
    setTextBoxes(textBoxes.map(box => 
      box.id === id ? { ...box, ...updates } : box
    ));
  };

  const deleteStickyNote = (id) => {
    setStickyNotes(stickyNotes.filter(note => note.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
      setSelectedElementType(null);
    }
    saveCanvasState();
  };

  const deleteTextBox = (id) => {
    setTextBoxes(textBoxes.filter(box => box.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
      setSelectedElementType(null);
    }
    saveCanvasState();
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

  const shapes = [
    { id: 'rectangle', name: 'Rectangle', icon: '▭' },
    { id: 'circle', name: 'Circle', icon: '○' },
    { id: 'triangle', name: 'Triangle', icon: '△' },
    { id: 'line', name: 'Line', icon: '/' },
    { id: 'arrow', name: 'Arrow', icon: '→' }
  ];

  const tools = [
    { id: 'select', icon: '➤', label: 'Select' },
    { id: 'text', icon: 'T', label: 'Text' },
    { id: 'sticky', icon: '📄', label: 'Sticky Note' },
    { id: 'shapes', icon: '▢', label: 'Shapes' },
    { id: 'pen', icon: '✏️', label: 'Pen' }
  ];

  return (
    <div className="w-screen h-screen flex bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-16 bg-white shadow-lg flex flex-col items-center py-4 gap-3 border-r border-gray-200">
        {tools.map((t) => (
          <div key={t.id} className="relative">
            <button
              onClick={() => {
                if (t.id === 'sticky') {
                  handleAddStickyNote();
                } else if (t.id === 'text') {
                  handleAddText();
                } else if (t.id === 'shapes') {
                  setShowShapesMenu(!showShapesMenu);
                  setTool('shape');
                } else {
                  setTool(t.id);
                  setShowShapesMenu(false);
                  channel.postMessage({ type: 'tool-change', data: { tool: t.id } });
                }
              }}
              className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                tool === t.id || (tool === 'shape' && t.id === 'shapes')
                  ? 'bg-blue-100 text-blue-600 shadow-md'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={t.label}
            >
              <span className="text-xl">{t.icon}</span>
            </button>

            {/* Shapes Dropdown */}
            {t.id === 'shapes' && showShapesMenu && (
              <div className="absolute left-16 top-0 ml-2 bg-white shadow-xl rounded-lg border border-gray-200 p-2 w-40 z-50">
                <div className="text-xs font-semibold text-gray-500 mb-2 px-2">Shapes</div>
                {shapes.map((shape) => (
                  <button
                    key={shape.id}
                    onClick={() => {
                      setSelectedShape(shape.id);
                      setTool('shape');
                      setShowShapesMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 transition-all ${
                      selectedShape === shape.id && tool === 'shape' ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{shape.icon}</span>
                    <span className="text-sm">{shape.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Undo/Redo */}
        <div className="border-t border-gray-200 pt-3 mt-auto space-y-2">
          <button
            onClick={handleUndo}
            disabled={historyStep <= 0}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
              historyStep <= 0 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Undo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={historyStep >= canvasHistory.length - 1}
            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
              historyStep >= canvasHistory.length - 1 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
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
            <span className="text-sm text-gray-600">Untitled</span>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-all">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Customization Toolbar */}
        {(tool === 'pen' || tool === 'shape') && (
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
            {/* Color Picker */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Color:</span>
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 transition-all shadow-sm"
                  style={{ backgroundColor: color }}
                />
                {showColorPicker && (
                  <div className="absolute top-10 left-0 bg-white shadow-xl rounded-lg border border-gray-200 p-3 z-50">
                    <div className="grid grid-cols-5 gap-2">
                      {colors.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setColor(c);
                            setShowColorPicker(false);
                            channel.postMessage({ type: 'color-change', data: { color: c } });
                          }}
                          className={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${
                            color === c ? 'border-blue-500 scale-110' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pen Size */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Size:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => {
                  setStrokeWidth(parseInt(e.target.value));
                  channel.postMessage({ type: 'stroke-change', data: { strokeWidth: parseInt(e.target.value) } });
                }}
                className="w-32"
              />
              <span className="text-sm text-gray-600 w-8">{strokeWidth}px</span>
            </div>

            {/* Pen Type */}
            {tool === 'pen' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Type:</span>
                <div className="flex gap-1">
                  {[
                    { id: 'solid', label: '━━━' },
                    { id: 'dashed', label: '╍╍╍' },
                    { id: 'dotted', label: '···' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setPenType(type.id)}
                      className={`px-3 py-1 rounded text-sm font-mono ${
                        penType === type.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sticky Note/Text Customization Toolbar */}
        {selectedElement && (
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center gap-6">
            <span className="text-sm font-semibold text-blue-900">
              {selectedElementType === 'sticky' ? 'Sticky Note' : 'Text'} Options:
            </span>
            
            {selectedElementType === 'sticky' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Background:</span>
                  <div className="flex gap-2">
                    {stickyColors.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateStickyNote(selectedElement, { color: c })}
                        className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                          stickyNotes.find(n => n.id === selectedElement)?.color === c 
                            ? 'border-blue-600 scale-110' 
                            : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Text Color:</span>
                  <div className="flex gap-2">
                    {['#FFFFFF', '#000000', '#FF6B6B', '#4ECDC4'].map((c) => (
                      <button
                        key={c}
                        onClick={() => updateStickyNote(selectedElement, { textColor: c })}
                        className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                          stickyNotes.find(n => n.id === selectedElement)?.textColor === c 
                            ? 'border-blue-600 scale-110' 
                            : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {selectedElementType === 'text' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Text Color:</span>
                <div className="flex gap-2">
                  {colors.slice(0, 8).map((c) => (
                    <button
                      key={c}
                      onClick={() => updateTextBox(selectedElement, { color: c })}
                      className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                        textBoxes.find(t => t.id === selectedElement)?.color === c 
                          ? 'border-blue-600 scale-110' 
                          : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setSelectedElement(null);
                setSelectedElementType(null);
              }}
              className="ml-auto px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              ✕ Close
            </button>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-white">
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(#e5e7eb 1px, transparent 1px),
                linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />

          <DrawingCanvas
            ref={canvasRef}
            socket={socketRef.current}
            roomId={roomId}
            color={color}
            strokeWidth={strokeWidth}
            tool={tool}
            selectedShape={selectedShape}
            penType={penType}
            onDrawEnd={saveCanvasState}
          />
          
          {/* Sticky Notes */}
          {stickyNotes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              isSelected={selectedElement === note.id}
              onSelect={() => handleSelectElement(note.id, 'sticky')}
              onUpdate={(updates) => updateStickyNote(note.id, updates)}
              onDelete={() => deleteStickyNote(note.id)}
              onBlur={saveCanvasState}
            />
          ))}

          {/* Text Boxes */}
          {textBoxes.map((textBox) => (
            <TextBox
              key={textBox.id}
              textBox={textBox}
              isSelected={selectedElement === textBox.id}
              onSelect={() => handleSelectElement(textBox.id, 'text')}
              onUpdate={(updates) => updateTextBox(textBox.id, updates)}
              onDelete={() => deleteTextBox(textBox.id)}
              onBlur={saveCanvasState}
            />
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

// Sticky Note Component
const StickyNote = ({ note, isSelected, onSelect, onUpdate, onDelete, onBlur }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleDragStart = (e) => {
    if (isResizing) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    onSelect();
  };

  const handleDrag = (e) => {
    if (!isDragging || e.clientX === 0) return;
    
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const newX = note.x + (deltaX / rect.width) * 100;
    const newY = note.y + (deltaY / rect.height) * 100;
    
    onUpdate({ x: newX, y: newY });
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onBlur();
  };

  return (
    <div
      className={`absolute cursor-move shadow-lg ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        left: `${note.x}%`,
        top: `${note.y}%`,
        backgroundColor: note.color,
        width: `${note.width}px`,
        height: `${note.height}px`
      }}
      draggable
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
    >
      <div className="relative p-3 h-full flex flex-col">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-1 right-1 w-5 h-5 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-xs opacity-0 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
        <textarea
          className="flex-1 bg-transparent resize-none outline-none text-sm"
          style={{ color: note.textColor }}
          value={note.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          onBlur={onBlur}
          placeholder="Type here..."
        />
        
        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100"
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsResizing(true);
          }}
        >
          <svg viewBox="0 0 10 10" className="text-white fill-current">
            <path d="M10 10 L10 7 L7 10 Z M10 4 L4 10 L10 10 Z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

// Text Box Component
const TextBox = ({ textBox, isSelected, onSelect, onUpdate, onDelete, onBlur }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleDragStart = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    onSelect();
  };

  const handleDrag = (e) => {
    if (!isDragging || e.clientX === 0) return;
    
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const newX = textBox.x + (deltaX / rect.width) * 100;
    const newY = textBox.y + (deltaY / rect.height) * 100;
    
    onUpdate({ x: newX, y: newY });
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onBlur();
  };

  return (
    <div
      className={`absolute cursor-move ${
        isSelected ? 'border-2 border-blue-500 border-dashed' : 'border-2 border-transparent'
      }`}
      style={{
        left: `${textBox.x}%`,
        top: `${textBox.y}%`,
        minWidth: `${textBox.width}px`,
        padding: '8px'
      }}
      draggable
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onClick={onSelect}
    >
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-md"
        >
          ✕
        </button>
      )}
      <input
        type="text"
        className="bg-transparent outline-none w-full font-medium"
        style={{ 
          color: textBox.color,
          fontSize: `${textBox.fontSize}px`
        }}
        value={textBox.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        onBlur={onBlur}
        autoFocus={isSelected}
      />
    </div>
  );
};

export default Whiteboard;

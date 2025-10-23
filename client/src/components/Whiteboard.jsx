import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DrawingCanvas from './DrawingCanvas';
import UserCursors from './UserCursors';
import { getSocket } from '../socket.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [shapes, setShapes] = useState([]); // Store shapes as resizable objects
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedElementType, setSelectedElementType] = useState(null); // 'sticky', 'text', or 'shape'
  
  // Pages functionality
  const [pages, setPages] = useState([
    { 
      id: 1, 
      canvasData: null, 
      stickyNotes: [], 
      textBoxes: [],
      history: [],
      historyStep: -1
    }
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  const [canvasHistory, setCanvasHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  
  // Click-to-place functionality
  const [pendingElementType, setPendingElementType] = useState(null); // 'sticky' or 'text' when waiting to place

  // Room info
  const [roomInfo, setRoomInfo] = useState({ name: 'Untitled', type: 'collaborative', isCollaborative: true });

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showToolbar, setShowToolbar] = useState(false);

  const socketRef = useRef(null);
  const hasJoinedRef = useRef(false);
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const colors = ['#FF69B4', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#000000'];
  const stickyColors = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#FB923C'];

  // Load room info from localStorage
  useEffect(() => {
    if (roomId) {
      const savedRooms = JSON.parse(localStorage.getItem('sketchsync_rooms') || '[]');
      const room = savedRooms.find(r => r.id === roomId);
      if (room) {
        setRoomInfo({
          name: room.name || 'Untitled',
          type: room.type || 'collaborative',
          isCollaborative: room.isCollaborative !== false
        });
      }
    }
  }, [roomId]);

  // Detect screen size and device type
  useEffect(() => {
    const checkResponsive = () => {
      const width = window.innerWidth;
      const isMobileDevice = width < 1024; // iPad and smaller
      setIsMobile(isMobileDevice);
      
      // Auto-hide sidebars on mobile/tablet
      if (isMobileDevice) {
        setShowLeftSidebar(false);
        setShowRightSidebar(false);
      } else {
        setShowLeftSidebar(true);
        setShowRightSidebar(true);
      }
    };

    checkResponsive();
    window.addEventListener('resize', checkResponsive);
    return () => window.removeEventListener('resize', checkResponsive);
  }, []);

  useEffect(() => {
    socketRef.current = getSocket();

    if (roomId && !hasJoinedRef.current) {
      socketRef.current.emit('join-room', roomId);
      hasJoinedRef.current = true;
    }

    const handleUserCount = (count) => setUserCount(count);
    
    // Clear canvas event handler
    const handleClearCanvasFromServer = () => {
      setStickyNotes([]);
      setTextBoxes([]);
    };
    
    // Sticky note event handlers
    const handleStickyNoteAdd = (data) => {
      setStickyNotes(prev => [...prev, data.note]);
    };
    
    const handleStickyNoteUpdate = (data) => {
      setStickyNotes(prev => prev.map(note => 
        note.id === data.id ? { ...note, ...data.updates } : note
      ));
    };
    
    const handleStickyNoteDelete = (data) => {
      setStickyNotes(prev => prev.filter(note => note.id !== data.id));
    };
    
    // Text box event handlers
    const handleTextBoxAdd = (data) => {
      setTextBoxes(prev => [...prev, data.textBox]);
    };
    
    const handleTextBoxUpdate = (data) => {
      setTextBoxes(prev => prev.map(box => 
        box.id === data.id ? { ...box, ...data.updates } : box
      ));
    };
    
    const handleTextBoxDelete = (data) => {
      setTextBoxes(prev => prev.filter(box => box.id !== data.id));
    };

    socketRef.current.on('user-count', handleUserCount);
    socketRef.current.on('clear-canvas', handleClearCanvasFromServer);
    socketRef.current.on('sticky-note-add', handleStickyNoteAdd);
    socketRef.current.on('sticky-note-update', handleStickyNoteUpdate);
    socketRef.current.on('sticky-note-delete', handleStickyNoteDelete);
    socketRef.current.on('text-box-add', handleTextBoxAdd);
    socketRef.current.on('text-box-update', handleTextBoxUpdate);
    socketRef.current.on('text-box-delete', handleTextBoxDelete);

    return () => {
      socketRef.current.off('user-count', handleUserCount);
      socketRef.current.off('clear-canvas', handleClearCanvasFromServer);
      socketRef.current.off('sticky-note-add', handleStickyNoteAdd);
      socketRef.current.off('sticky-note-update', handleStickyNoteUpdate);
      socketRef.current.off('sticky-note-delete', handleStickyNoteDelete);
      socketRef.current.off('text-box-add', handleTextBoxAdd);
      socketRef.current.off('text-box-update', handleTextBoxUpdate);
      socketRef.current.off('text-box-delete', handleTextBoxDelete);
    };
  }, [roomId]);

  // Load current page data
  useEffect(() => {
    const currentPage = pages[currentPageIndex];
    if (currentPage) {
      setStickyNotes(currentPage.stickyNotes || []);
      setTextBoxes(currentPage.textBoxes || []);
      setCanvasHistory(currentPage.history || []);
      setHistoryStep(currentPage.historyStep || -1);
      
      // Load canvas data
      if (canvasRef.current && currentPage.canvasData) {
        canvasRef.current.loadFromDataURL(currentPage.canvasData);
      } else if (canvasRef.current) {
        // Clear canvas if no data
        const canvas = canvasRef.current.getCanvas();
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [currentPageIndex, pages]);

  // Auto-save current page when elements change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCurrentPageData();
    }, 500); // Debounce save
    
    return () => clearTimeout(timer);
  }, [stickyNotes, textBoxes, canvasHistory, historyStep]);

  // Intersection Observer to detect which page is in view
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const pageIndex = parseInt(entry.target.getAttribute('data-page-index'));
            if (!isNaN(pageIndex) && pageIndex !== currentPageIndex) {
              // Save current page before switching
              saveCurrentPageData();
              setCurrentPageIndex(pageIndex);
              setSelectedElement(null);
              setSelectedElementType(null);
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: [0.5], // Trigger when 50% of page is visible
      }
    );

    const pageElements = scrollContainerRef.current.querySelectorAll('[data-page-index]');
    pageElements.forEach((el) => observer.observe(el));

    return () => {
      pageElements.forEach((el) => observer.unobserve(el));
    };
  }, [pages.length, currentPageIndex]);

  // Save current page data before switching
  const saveCurrentPageData = () => {
    const updatedPages = [...pages];
    const canvas = canvasRef.current?.getCanvas();
    updatedPages[currentPageIndex] = {
      ...updatedPages[currentPageIndex],
      canvasData: canvas ? canvas.toDataURL() : null,
      stickyNotes: [...stickyNotes],
      textBoxes: [...textBoxes],
      history: [...canvasHistory],
      historyStep: historyStep
    };
    setPages(updatedPages);
  };

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

  // Page management functions
  const addNewPage = () => {
    saveCurrentPageData();
    const newPage = {
      id: Date.now(),
      canvasData: null,
      stickyNotes: [],
      textBoxes: [],
      history: [],
      historyStep: -1
    };
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length); // Go to new page
  };

  const goToPage = (index) => {
    if (index >= 0 && index < pages.length) {
      saveCurrentPageData();
      setCurrentPageIndex(index);
      setSelectedElement(null);
      setSelectedElementType(null);
      
      // Scroll to the selected page
      setTimeout(() => {
        if (scrollContainerRef.current) {
          const pageElements = scrollContainerRef.current.querySelectorAll('[data-page-index]');
          const targetPage = pageElements[index];
          if (targetPage) {
            targetPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    }
  };

  const deletePage = (index) => {
    if (pages.length > 1) {
      const updatedPages = pages.filter((_, i) => i !== index);
      setPages(updatedPages);
      if (currentPageIndex >= updatedPages.length) {
        setCurrentPageIndex(updatedPages.length - 1);
      }
    }
  };

  // Download notebook as PDF
  const downloadAsPDF = async () => {
    try {
      // Save current page data first
      saveCurrentPageData();
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageElements = scrollContainerRef.current.querySelectorAll('[data-page-index]');
      
      // Show loading message
      const loadingToast = document.createElement('div');
      loadingToast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-[9999]';
      loadingToast.textContent = 'Generating PDF...';
      document.body.appendChild(loadingToast);
      
      for (let i = 0; i < pageElements.length; i++) {
        const pageElement = pageElements[i];
        
        // Capture the page as canvas
        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Update loading message
        loadingToast.textContent = `Generating PDF... (${i + 1}/${pageElements.length})`;
      }
      
      // Generate filename with date
      const date = new Date().toISOString().split('T')[0];
      const filename = `SketchSync-Notebook-${date}.pdf`;
      
      pdf.save(filename);
      
      // Remove loading message
      loadingToast.textContent = 'PDF Downloaded!';
      setTimeout(() => {
        document.body.removeChild(loadingToast);
      }, 2000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleAddStickyNote = () => {
    // Set pending state instead of immediately adding
    setPendingElementType('sticky');
    setTool('select');
  };

  const handleAddText = () => {
    // Set pending state instead of immediately adding
    setPendingElementType('text');
    setTool('select');
  };
  
  // Handle canvas click to place pending elements
  const handleCanvasClick = (e) => {
    if (!pendingElementType) return;
    
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (pendingElementType === 'sticky') {
      const newNote = {
        id: Date.now(),
        text: 'I am sticky note',
        x: Math.max(0, Math.min(80, x)),
        y: Math.max(0, Math.min(80, y)),
        width: 200,
        height: 200,
        color: '#60A5FA',
        textColor: '#FFFFFF'
      };
      setStickyNotes([...stickyNotes, newNote]);
      
      // Emit to other users
      if (socketRef.current && roomId) {
        socketRef.current.emit('sticky-note-add', {
          roomId,
          note: newNote
        });
      }
      
      saveCanvasState();
    } else if (pendingElementType === 'text') {
      const newText = {
        id: Date.now(),
        text: 'Text',
        x: Math.max(0, Math.min(85, x)),
        y: Math.max(0, Math.min(90, y)),
        width: 150,
        height: 40,
        fontSize: 24,
        color: color,
        isSelected: false
      };
      setTextBoxes([...textBoxes, newText]);
      
      // Emit to other users
      if (socketRef.current && roomId) {
        socketRef.current.emit('text-box-add', {
          roomId,
          textBox: newText
        });
      }
      
      saveCanvasState();
    }
    
    // Clear pending state
    setPendingElementType(null);
  };

  const handleSelectElement = (id, type) => {
    setSelectedElement(id);
    setSelectedElementType(type);
  };

  const updateStickyNote = (id, updates) => {
    setStickyNotes(stickyNotes.map(note => 
      note.id === id ? { ...note, ...updates } : note
    ));
    
    // Emit to other users
    if (socketRef.current && roomId) {
      socketRef.current.emit('sticky-note-update', {
        roomId,
        id,
        updates
      });
    }
  };

  const updateTextBox = (id, updates) => {
    setTextBoxes(textBoxes.map(box => 
      box.id === id ? { ...box, ...updates } : box
    ));
    
    // Emit to other users
    if (socketRef.current && roomId) {
      socketRef.current.emit('text-box-update', {
        roomId,
        id,
        updates
      });
    }
  };

  const deleteStickyNote = (id) => {
    setStickyNotes(stickyNotes.filter(note => note.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
      setSelectedElementType(null);
    }
    
    // Emit to other users
    if (socketRef.current && roomId) {
      socketRef.current.emit('sticky-note-delete', {
        roomId,
        id
      });
    }
    
    saveCanvasState();
  };

  const deleteTextBox = (id) => {
    setTextBoxes(textBoxes.filter(box => box.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
      setSelectedElementType(null);
    }
    
    // Emit to other users
    if (socketRef.current && roomId) {
      socketRef.current.emit('text-box-delete', {
        roomId,
        id
      });
    }
    
    saveCanvasState();
  };

  // Keyboard shortcuts for page navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Arrow keys for page navigation
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentPageIndex > 0) {
          goToPage(currentPageIndex - 1);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentPageIndex < pages.length - 1) {
          goToPage(currentPageIndex + 1);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addNewPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPageIndex, pages.length]);

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

  const shapeTypes = [
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
    { id: 'pen', icon: '✏️', label: 'Pen' },
    { id: 'eraser', icon: '🧽', label: 'Eraser' }
  ];

  return (
    <div className="w-screen h-screen flex bg-gray-50 touch-none">
      {/* Mobile Overlay for Sidebars */}
      {isMobile && (showLeftSidebar || showRightSidebar) && (
        <div 
          onClick={() => {
            setShowLeftSidebar(false);
            setShowRightSidebar(false);
          }}
          className="fixed inset-0 bg-black/50 z-40"
        />
      )}
      
      {/* Mobile Toolbar Toggle Button */}
      {isMobile && (
        <button
          onClick={() => setShowToolbar(!showToolbar)}
          className="fixed bottom-4 right-4 z-[100] w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
        >
          {showToolbar ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          )}
        </button>
      )}

      {/* Left Sidebar */}
      {showLeftSidebar && (
        <div className={`bg-white shadow-lg flex flex-col items-center py-4 gap-3 border-r border-gray-200 ${
          isMobile ? 'fixed left-0 top-0 bottom-0 z-50 w-20' : 'w-16'
        }`}>
        {tools.map((t) => (
          <div key={t.id} className="relative">
            <button
              onClick={() => {
                if (t.id === 'sticky') {
                  // Deselect drawing tools when adding sticky note
                  setTool('select');
                  setShowShapesMenu(false);
                  handleAddStickyNote();
                } else if (t.id === 'text') {
                  // Deselect drawing tools when adding text
                  setTool('select');
                  setShowShapesMenu(false);
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
                {shapeTypes.map((shape) => (
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
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white shadow-sm px-3 md:px-6 py-2 md:py-3 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Hamburger Menu for Mobile */}
            {isMobile && (
              <button
                onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                title="Toggle Menu"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs md:text-sm font-bold">S</span>
              </div>
              {!isMobile && <span className="font-semibold text-gray-700">Dashboard</span>}
            </div>
            
            {!isMobile && (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all text-sm font-medium"
              >
                Go To Dashboard
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Room Title and Type Badge */}
            {!isMobile && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">{roomInfo.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  roomInfo.type === 'normal' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {roomInfo.type === 'normal' ? '📝 Personal' : '👥 Team'}
                </span>
              </div>
            )}
            
            {/* Page Navigation */}
            <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 bg-gray-100 rounded-lg">
              <button
                onClick={() => goToPage(currentPageIndex - 1)}
                disabled={currentPageIndex === 0}
                className={`p-1 rounded transition-all ${
                  currentPageIndex === 0 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'hover:bg-white text-gray-600'
                }`}
                title="Previous Page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <span className="text-xs md:text-sm font-medium text-gray-700 min-w-[60px] md:min-w-[80px] text-center">
                {isMobile ? `${currentPageIndex + 1}/${pages.length}` : `Page ${currentPageIndex + 1} / ${pages.length}`}
              </span>
              
              <button
                onClick={() => goToPage(currentPageIndex + 1)}
                disabled={currentPageIndex === pages.length - 1}
                className={`p-1 rounded transition-all ${
                  currentPageIndex === pages.length - 1 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'hover:bg-white text-gray-600'
                }`}
                title="Next Page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <div className="w-px h-5 bg-gray-300 mx-1"></div>
              
              <button
                onClick={addNewPage}
                className="p-1 hover:bg-white text-blue-600 rounded transition-all"
                title="Add New Page"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              
              {pages.length > 1 && (
                <button
                  onClick={() => {
                    if (window.confirm('Delete this page?')) {
                      deletePage(currentPageIndex);
                    }
                  }}
                  className="p-1 hover:bg-white text-red-600 rounded transition-all"
                  title="Delete Page"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Download PDF Button */}
            <button
              onClick={downloadAsPDF}
              className={`flex items-center gap-2 ${
                isMobile ? 'p-2' : 'px-4 py-2'
              } bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all text-sm font-medium shadow-md hover:shadow-lg`}
              title="Download as PDF"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {!isMobile && <span>Download PDF</span>}
            </button>
            
            {/* Pages Panel Toggle for Mobile */}
            {isMobile && (
              <button
                onClick={() => setShowRightSidebar(!showRightSidebar)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                title="Toggle Pages"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
            
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-all">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </header>

        {/* Customization Toolbar */}
        {(tool === 'pen' || tool === 'shape' || tool === 'eraser') && (
          <div className="bg-white border-b border-gray-200 px-3 md:px-6 py-2 md:py-3 flex flex-wrap items-center gap-3 md:gap-6">
            {/* Color Picker */}
            <div className="flex items-center gap-2">
              {!isMobile && <span className="text-xs md:text-sm font-medium text-gray-700">Color:</span>}
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
              <span className="text-xs md:text-sm font-medium text-gray-700">{isMobile ? 'Size' : 'Size:'}:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => {
                  setStrokeWidth(parseInt(e.target.value));
                  channel.postMessage({ type: 'stroke-change', data: { strokeWidth: parseInt(e.target.value) } });
                }}
                className="w-24 md:w-32"
              />
              <span className="text-xs md:text-sm text-gray-600 w-8">{strokeWidth}px</span>
            </div>

            {/* Pen Type */}
            {tool === 'pen' && (
              <div className="flex items-center gap-2">
                {!isMobile && <span className="text-xs md:text-sm font-medium text-gray-700">Type:</span>}
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

            {/* Eraser Size */}
            {tool === 'eraser' && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Eraser Size:</span>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={strokeWidth}
                  onChange={(e) => {
                    setStrokeWidth(parseInt(e.target.value));
                    channel.postMessage({ type: 'stroke-change', data: { strokeWidth: parseInt(e.target.value) } });
                  }}
                  className="w-32"
                />
                <span className="text-sm text-gray-600 w-8">{strokeWidth}px</span>
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

        {/* Mobile Floating Toolbar */}
        {isMobile && showToolbar && (
          <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[90] bg-white shadow-2xl rounded-2xl border-2 border-gray-200 p-3">
            <div className="flex items-center gap-2">
              {tools.map((t) => (
                <div key={t.id} className="relative">
                  <button
                    onClick={() => {
                      if (t.id === 'sticky') {
                        setTool('select');
                        setShowShapesMenu(false);
                        handleAddStickyNote();
                        setShowToolbar(false);
                      } else if (t.id === 'text') {
                        setTool('select');
                        setShowShapesMenu(false);
                        handleAddText();
                        setShowToolbar(false);
                      } else if (t.id === 'shapes') {
                        setShowShapesMenu(!showShapesMenu);
                        setTool('shape');
                      } else {
                        setTool(t.id);
                        setShowShapesMenu(false);
                        channel.postMessage({ type: 'tool-change', data: { tool: t.id } });
                        setShowToolbar(false);
                      }
                    }}
                    className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
                      tool === t.id || (tool === 'shape' && t.id === 'shapes')
                        ? 'bg-blue-100 text-blue-600 shadow-md'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title={t.label}
                  >
                    <span className="text-2xl">{t.icon}</span>
                  </button>

                  {/* Shapes Dropdown for Mobile */}
                  {t.id === 'shapes' && showShapesMenu && (
                    <div className="absolute bottom-16 left-0 bg-white shadow-xl rounded-lg border border-gray-200 p-2 w-44 z-50">
                      <div className="text-xs font-semibold text-gray-500 mb-2 px-2">Shapes</div>
                      {shapeTypes.map((shape) => (
                        <button
                          key={shape.id}
                          onClick={() => {
                            setSelectedShape(shape.id);
                            setTool('shape');
                            setShowShapesMenu(false);
                            setShowToolbar(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 transition-all ${
                            selectedShape === shape.id && tool === 'shape' ? 'bg-blue-100 text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          <span className="text-xl">{shape.icon}</span>
                          <span className="text-sm">{shape.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Canvas and Pages Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas Area - Scrollable */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100"
            style={{ scrollBehavior: 'smooth' }}
          >
            {/* Pages Container */}
            <div className="py-8 px-4 space-y-8">
              {pages.map((page, index) => (
                <div 
                  key={page.id}
                  data-page-index={index}
                  className={`mx-auto bg-white shadow-lg relative cursor-pointer ${
                    index === currentPageIndex ? 'ring-4 ring-blue-400' : 'hover:ring-2 hover:ring-blue-200'
                  }`}
                  style={{ 
                    width: isMobile ? '100%' : '210mm', // Responsive width
                    minHeight: isMobile ? '80vh' : '297mm', // Responsive height
                    maxWidth: isMobile ? '100%' : '210mm',
                  }}
                  onClick={(e) => {
                    // Only switch page if clicking the page itself, not interactive elements
                    if (e.target === e.currentTarget || e.target.closest('.page-background')) {
                      if (index !== currentPageIndex) {
                        goToPage(index);
                      }
                    }
                  }}
                >
                  {/* Page Number Badge */}
                  <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-3 py-1 rounded-full z-10 pointer-events-none">
                    Page {index + 1}
                  </div>

                  {/* Grid Pattern - Always visible */}
                  <div 
                    className="page-background absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage: `
                        linear-gradient(#e5e7eb 1px, transparent 1px),
                        linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
                      `,
                      backgroundSize: '20px 20px'
                    }}
                  />

                  {/* Render content for current page only */}
                  {index === currentPageIndex && (
                    <>
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
                      
                      {/* Transparent overlay for click-to-place */}
                      {pendingElementType && (
                        <div 
                          className="absolute inset-0 z-40"
                          onClick={handleCanvasClick}
                          style={{ cursor: 'crosshair' }}
                        />
                      )}
                      
                      {/* Click-to-place instruction */}
                      {pendingElementType && (
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 pointer-events-none">
                          <span className="text-sm font-medium">
                            Click anywhere to place {pendingElementType === 'sticky' ? 'sticky note' : 'text box'}
                          </span>
                        </div>
                      )}
                      
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
                    </>
                  )}

                  {/* Saved canvas preview for non-current pages */}
                  {index !== currentPageIndex && page.canvasData && (
                    <img 
                      src={page.canvasData} 
                      alt={`Page ${index + 1} preview`}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />
                  )}

                  {/* Display static sticky notes for non-current pages */}
                  {index !== currentPageIndex && page.stickyNotes && page.stickyNotes.map((note) => (
                    <div
                      key={note.id}
                      className="absolute shadow-lg pointer-events-none"
                      style={{
                        left: `${note.x}%`,
                        top: `${note.y}%`,
                        backgroundColor: note.color,
                        width: `${note.width}px`,
                        height: `${note.height}px`
                      }}
                    >
                      <div className="p-3 h-full flex flex-col">
                        <div 
                          className="flex-1 text-sm overflow-hidden"
                          style={{ color: note.textColor }}
                        >
                          {note.text}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Display static text boxes for non-current pages */}
                  {index !== currentPageIndex && page.textBoxes && page.textBoxes.map((textBox) => (
                    <div
                      key={textBox.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${textBox.x}%`,
                        top: `${textBox.y}%`,
                        width: `${textBox.width || 150}px`,
                        minHeight: `${textBox.height || 40}px`,
                        color: textBox.color,
                        fontSize: `${textBox.fontSize}px`,
                      }}
                    >
                      {textBox.text}
                    </div>
                  ))}
                </div>
              ))}
              
              {/* Add New Page Button */}
              <div 
                className="mx-auto bg-white shadow-lg relative cursor-pointer border-4 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all"
                style={{ 
                  width: '210mm',
                  height: '297mm',
                }}
                onClick={addNewPage}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 transition-colors">
                  <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="text-xl font-semibold">Add New Page</p>
                  <p className="text-sm mt-2">Click here or press Ctrl+N</p>
                </div>
              </div>
            </div>
          </div>

        {/* Right Sidebar - Pages Panel */}
        {showRightSidebar && (
          <div className={`bg-white border-l border-gray-200 overflow-y-auto p-3 ${
            isMobile 
              ? 'fixed right-0 top-0 bottom-0 z-50 w-64 shadow-2xl' 
              : 'w-48'
          }`}>
          <div className="text-xs font-semibold text-gray-500 mb-3 px-2">PAGES</div>
          <div className="space-y-3">
            {pages.map((page, index) => (
              <div
                key={page.id}
                onClick={() => goToPage(index)}
                className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentPageIndex 
                    ? 'border-blue-500 shadow-md' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                {/* Page Preview */}
                <div className="aspect-[8.5/11] bg-white flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="text-xs font-medium">Page {index + 1}</div>
                  </div>
                </div>
                
                {/* Page Number Badge */}
                <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                  {index + 1}
                </div>
                
                {/* Delete button on hover (only if more than 1 page) */}
                {pages.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete page ${index + 1}?`)) {
                        deletePage(index);
                      }
                    }}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete page"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            
            {/* Add Page Button */}
            <button
              onClick={addNewPage}
              className="w-full aspect-[8.5/11] border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center text-gray-400 hover:text-blue-500"
            >
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <div className="text-xs font-medium">Add Page</div>
              </div>
            </button>
          </div>
        </div>
        )}
        </div>
        {/* End Canvas and Pages Container */}

        {/* Bottom Info Bar */}
        {!isMobile && (
          <div className="bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-700 font-medium">{roomInfo.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                roomInfo.type === 'normal' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {roomInfo.type === 'normal' ? '📝 Personal' : '👥 Team'}
              </span>
              {roomInfo.isCollaborative && (
                <span className="text-gray-600">
                  Room Code: <span className="font-mono font-semibold">{roomId}</span>
                </span>
              )}
              {roomInfo.isCollaborative && (
                <span className="text-gray-600">
                  Active users: <span className="font-semibold">{userCount}</span>
                </span>
              )}
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
        )}
      </div>
    </div>
  );
};

// Sticky Note Component
const StickyNote = ({ note, isSelected, onSelect, onUpdate, onDelete, onBlur }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(true);
  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });
  const containerRef = useRef(null);

  const availableColors = [
    '#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#FB923C',
    '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'
  ];
  
  const textColors = ['#FFFFFF', '#000000', '#1F2937', '#374151'];

  // Show color palette when sticky is selected
  useEffect(() => {
    if (isSelected) {
      setShowColorPalette(true);
    }
  }, [isSelected]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing) {
        e.preventDefault();
        const deltaX = e.clientX - resizeStart.current.mouseX;
        const deltaY = e.clientY - resizeStart.current.mouseY;
        
        const newWidth = Math.max(150, resizeStart.current.width + deltaX);
        const newHeight = Math.max(100, resizeStart.current.height + deltaY);
        
        onUpdate({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        onBlur();
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onUpdate, onBlur]);

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setShowColorPalette(false);
    resizeStart.current = {
      width: note.width || 200,
      height: note.height || 200,
      mouseX: e.clientX,
      mouseY: e.clientY
    };
  };

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
      ref={containerRef}
      className={`absolute shadow-lg ${isSelected ? 'ring-2 ring-blue-500 z-50' : 'z-30'}`}
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
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Color Palette Toolbar - Shows when selected */}
      {isSelected && showColorPalette && (
        <div className="absolute -top-20 left-0 bg-white shadow-lg rounded-lg border border-gray-200 p-2 z-[60]">
          <div className="text-xs text-gray-500 mb-1 px-1">Background Color</div>
          <div className="flex items-center gap-1 mb-2">
            {availableColors.map((c) => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ color: c });
                }}
                className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                  note.color === c ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
                title="Change background color"
              />
            ))}
          </div>
          <div className="text-xs text-gray-500 mb-1 px-1">Text Color</div>
          <div className="flex items-center gap-1">
            {textColors.map((c) => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ textColor: c });
                }}
                className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                  note.textColor === c ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
                title="Change text color"
              />
            ))}
            {/* Save Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPalette(false);
              }}
              className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors"
              title="Save and close"
            >
              Save
            </button>
            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="ml-1 w-6 h-6 flex items-center justify-center hover:bg-red-50 text-red-600 rounded transition-all border border-red-200"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <div className="relative p-3 h-full flex flex-col">
        <textarea
          className="flex-1 bg-transparent resize-none outline-none text-sm"
          style={{ color: note.textColor }}
          value={note.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          onBlur={onBlur}
          placeholder="Type here..."
          onClick={(e) => e.stopPropagation()}
        />
        
        {/* Resize Handles - 8 handles like text box */}
        {isSelected && (
          <>
            {/* Corner Handles */}
            <div 
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-[60]"
              onMouseDown={handleResizeStart}
            />
            <div 
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize z-[60]"
              onMouseDown={handleResizeStart}
            />
            <div 
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-[60]"
              onMouseDown={handleResizeStart}
            />
            <div 
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize z-[60]"
              onMouseDown={handleResizeStart}
            />
            
            {/* Middle Handles */}
            <div 
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize z-[60]"
              onMouseDown={handleResizeStart}
            />
            <div 
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize z-[60]"
              onMouseDown={handleResizeStart}
            />
            <div 
              className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize z-[60]"
              onMouseDown={handleResizeStart}
            />
            <div 
              className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize z-[60]"
              onMouseDown={handleResizeStart}
            />
          </>
        )}
      </div>
    </div>
  );
};

// Text Box Component (PowerPoint-style)
const TextBox = ({ textBox, isSelected, onSelect, onUpdate, onDelete, onBlur }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(true); // Show palette when selected
  const dragStart = useRef({ x: 0, y: 0, elemX: 0, elemY: 0 });
  const resizeStart = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });
  const textRef = useRef(null);
  const containerRef = useRef(null);

  const availableColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#000000', '#FF69B4', '#7FFF00', '#FF8C00'
  ];

  // Show color palette when text box is selected
  useEffect(() => {
    if (isSelected && !isEditing) {
      setShowColorPalette(true);
    }
  }, [isSelected, isEditing]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        const container = document.querySelector('.flex-1.relative.overflow-hidden.bg-white');
        if (container) {
          const rect = container.getBoundingClientRect();
          const newX = ((e.clientX - rect.left) / rect.width) * 100;
          const newY = ((e.clientY - rect.top) / rect.height) * 100;
          
          // Constrain within bounds
          const constrainedX = Math.max(0, Math.min(95, newX));
          const constrainedY = Math.max(0, Math.min(95, newY));
          
          onUpdate({ x: constrainedX, y: constrainedY });
        }
      }
      
      if (isResizing) {
        e.preventDefault();
        const deltaX = e.clientX - resizeStart.current.mouseX;
        const deltaY = e.clientY - resizeStart.current.mouseY;
        
        const newWidth = Math.max(100, resizeStart.current.width + deltaX);
        const newHeight = Math.max(30, resizeStart.current.height + deltaY);
        
        onUpdate({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        setIsDragging(false);
        setIsResizing(false);
        onBlur();
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, onUpdate, onBlur]);

  const handleMouseDown = (e) => {
    if (isEditing) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setShowColorPalette(false); // Close color palette when dragging
    onSelect();
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setShowColorPalette(false); // Close color palette when resizing
    resizeStart.current = {
      width: textBox.width || 150,
      height: textBox.height || 40,
      mouseX: e.clientX,
      mouseY: e.clientY
    };
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    setShowColorPalette(false);
    setTimeout(() => {
      if (textRef.current) {
        textRef.current.focus();
        textRef.current.select();
      }
    }, 0);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onBlur();
  };

  return (
    <div
      ref={containerRef}
      className={`absolute ${isSelected && !isEditing ? 'z-50' : 'z-30'}`}
      style={{
        left: `${textBox.x}%`,
        top: `${textBox.y}%`,
        width: `${textBox.width || 150}px`,
        minHeight: `${textBox.height || 40}px`
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isEditing) {
          onSelect();
          // Focus the text input to show cursor
          setTimeout(() => {
            if (textRef.current) {
              textRef.current.focus();
            }
          }, 0);
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Selection Border with Handles */}
      {isSelected && !isEditing && (
        <>
          {/* Blue Border */}
          <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />
          
          {/* Corner Handles - All clickable for resizing */}
          <div 
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-[60]"
            onMouseDown={handleResizeStart}
          />
          <div 
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize z-[60]"
            onMouseDown={handleResizeStart}
          />
          <div 
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize z-[60]"
            onMouseDown={handleResizeStart}
          />
          <div 
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-[60]"
            onMouseDown={handleResizeStart}
          />
          
          {/* Middle Handles */}
          <div 
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize z-[60]"
            onMouseDown={handleResizeStart}
          />
          <div 
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize z-[60]"
            onMouseDown={handleResizeStart}
          />
          <div 
            className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize z-[60]"
            onMouseDown={handleResizeStart}
          />
          <div 
            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize z-[60]"
            onMouseDown={handleResizeStart}
          />
          
          {/* Color Palette Toolbar - Only shows color options */}
          {showColorPalette && (
            <div className="absolute -top-12 left-0 bg-white shadow-lg rounded-lg border border-gray-200 p-2 z-[60]">
              <div className="text-xs text-gray-500 mb-1 px-1">Text Color</div>
              <div className="flex items-center gap-1">
                {availableColors.map((c) => (
                  <button
                    key={c}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({ color: c });
                    }}
                    className={`w-6 h-6 rounded border-2 hover:scale-110 transition-transform ${
                      textBox.color === c ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: c }}
                    title="Change color"
                  />
                ))}
                {/* Save Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColorPalette(false);
                  }}
                  className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors"
                  title="Save and close"
                >
                  Save
                </button>
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="ml-1 w-6 h-6 flex items-center justify-center hover:bg-red-50 text-red-600 rounded transition-all border border-red-200"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {/* Draggable Area */}
          <div 
            className="absolute inset-0 cursor-move"
            onMouseDown={handleMouseDown}
          />
        </>
      )}
      
      {/* Text Input */}
      <input
        ref={textRef}
        type="text"
        className={`w-full h-full bg-transparent outline-none font-medium px-2 py-1 relative ${
          isEditing ? 'cursor-text z-20' : 'pointer-events-none'
        }`}
        style={{ 
          color: textBox.color,
          fontSize: `${textBox.fontSize}px`
        }}
        value={textBox.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            handleBlur();
          }
        }}
        readOnly={!isEditing}
      />
    </div>
  );
};

export default Whiteboard;

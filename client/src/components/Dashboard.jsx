import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import DarkModeToggle from './DarkModeToggle';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isGuest, logout, saveRoom, getUserRooms, convertGuestToUser, loading: authLoading } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [roomCode, setRoomCode] = useState('');
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roomType, setRoomType] = useState(''); // 'normal' or 'collaborative'
  const [noteTitle, setNoteTitle] = useState('');
  const [convertFormData, setConvertFormData] = useState({ name: '', email: '', password: '' });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Refresh rooms when location changes (navigating back to dashboard)
  useEffect(() => {
    setLastRefresh(Date.now());
  }, [location]);

  // Load rooms - check if user is authenticated and load from server, otherwise from localStorage
  useEffect(() => {
    const loadRooms = async () => {
      // Wait for auth to finish loading before fetching rooms
      if (authLoading) {
        return;
      }

      setRoomsLoading(true);
      
      if (user && !isGuest) {
        // Authenticated user - fetch from server
        const serverRooms = await getUserRooms();
        setRooms(serverRooms);
      } else {
        // Guest or no auth - load from localStorage
        const savedRooms = JSON.parse(localStorage.getItem('sketchsync_rooms') || '[]');
        setRooms(savedRooms);
      }
      
      setRoomsLoading(false);
    };
    loadRooms();
  }, [user, isGuest, authLoading, getUserRooms, lastRefresh]);

  // Refresh rooms when returning to dashboard (component focus/visibility)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden && !authLoading) {
        // Page is visible again, refresh rooms
        setRoomsLoading(true);
        
        if (user && !isGuest) {
          const serverRooms = await getUserRooms();
          setRooms(serverRooms);
        } else {
          const savedRooms = JSON.parse(localStorage.getItem('sketchsync_rooms') || '[]');
          setRooms(savedRooms);
        }
        
        setRoomsLoading(false);
      }
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isGuest, authLoading, getUserRooms]);

  // Check if guest should be prompted to convert after 3 rooms
  useEffect(() => {
    if (isGuest && user?.guestRoomCount >= 3 && rooms.length >= 3) {
      // Show conversion prompt
      const hasSeenPrompt = sessionStorage.getItem('guest_conversion_prompt_shown');
      if (!hasSeenPrompt) {
        setTimeout(() => {
          setShowConvertModal(true);
          sessionStorage.setItem('guest_conversion_prompt_shown', 'true');
        }, 1000);
      }
    }
  }, [isGuest, user, rooms]);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const isValidRoomCode = (code) => /^[a-zA-Z0-9]{6,8}$/.test(code);

  const handleCreateRoom = async () => {
    // Validate title
    if (!noteTitle.trim()) {
      setError('Please enter a title for your note');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let newRoomCode;
      let isCollaborative;

      if (roomType === 'normal') {
        // Normal note: use timestamp-based ID (not shareable)
        newRoomCode = `personal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        isCollaborative = false;
      } else {
        // Collaborative note: use shareable 6-character code
        newRoomCode = generateRoomCode();
        isCollaborative = true;
        
        // Call API to create room (only for collaborative)
        await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/v1/rooms/join`, {
          roomId: newRoomCode,
          creatorId: user?.id || user?._id || null, // Pass creator ID if authenticated
          isCreating: true // Flag to indicate this is a room creation, not just joining
        });
      }

      // Create room object
      const newRoom = {
        id: newRoomCode,
        name: noteTitle.trim(),
        type: roomType,
        isCollaborative: isCollaborative,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      };

      // Save to server if authenticated (includes guests)
      if (user) {
        const result = await saveRoom({
          roomId: newRoomCode,
          name: noteTitle.trim(),
          type: roomType,
          isCollaborative: isCollaborative
        });

        // Check if guest should be prompted to upgrade
        if (result?.shouldPromptSignup) {
          setTimeout(() => {
            setShowConvertModal(true);
          }, 500);
        }
      }

      // Also save to localStorage for offline access
      const savedRooms = JSON.parse(localStorage.getItem('sketchsync_rooms') || '[]');
      const updatedRooms = [newRoom, ...savedRooms];
      localStorage.setItem('sketchsync_rooms', JSON.stringify(updatedRooms));
      setRooms(updatedRooms);

      // Navigate to the room
      navigate(`/room/${newRoomCode}`);
    } catch (err) {
      console.error('Error creating room:', err);
      setError('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const trimmedCode = roomCode.trim();

    if (!isValidRoomCode(trimmedCode)) {
      setError('Room code must be 6-8 alphanumeric characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Call API to join/create room
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/v1/rooms/join`, {
        roomId: trimmedCode
      });

      // Don't save to localStorage - collaborative rooms should only be saved for the creator
      // Contributors can access via the room code but it won't appear in their "My Rooms"
      
      // Navigate directly to the room
      navigate(`/room/${trimmedCode}`);
    } catch (err) {
      console.error('Error joining room:', err);
      setError('Failed to join room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRoom = (roomId) => {
    // Update last accessed
    const savedRooms = JSON.parse(localStorage.getItem('sketchsync_rooms') || '[]');
    const updatedRooms = savedRooms.map(room => 
      room.id === roomId 
        ? { ...room, lastAccessed: new Date().toISOString() }
        : room
    );
    localStorage.setItem('sketchsync_rooms', JSON.stringify(updatedRooms));
    
    navigate(`/room/${roomId}`);
  };

  const handleDeleteRoom = (roomId, e) => {
    e.stopPropagation();
    const savedRooms = JSON.parse(localStorage.getItem('sketchsync_rooms') || '[]');
    const updatedRooms = savedRooms.filter(room => room.id !== roomId);
    localStorage.setItem('sketchsync_rooms', JSON.stringify(updatedRooms));
    setRooms(updatedRooms);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:bg-gradient-to-br dark:from-black dark:via-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-black shadow-sm border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">S</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SketchSync
              </h1>
            </div>

            {/* User Menu and Dark Mode Toggle */}
            <div className="flex items-center gap-4">
              <DarkModeToggle />
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-900 px-4 py-2 rounded-xl transition group"
                >
                  <div className="flex items-center gap-3">
                    {/* User Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-lg font-semibold">
                        {user?.name?.charAt(0).toUpperCase() || 'G'}
                      </span>
                    </div>
                    {/* User Name */}
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Hi, {user?.name || 'Guest'}! 👋
                      </p>
                      {isGuest && (
                        <p className="text-xs text-gray-500 dark:text-gray-300">Guest Account</p>
                      )}
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 dark:text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg py-2 z-20 border border-gray-100 dark:border-gray-700">
                    {isGuest && (
                      <>
                        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                          <p className="text-xs text-gray-500 dark:text-gray-300">Saved Rooms: {user?.guestRoomCount || 0}/3</p>
                          <button
                            onClick={() => {
                              setShowUserMenu(false);
                              setShowConvertModal(true);
                            }}
                            className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                          >
                            Upgrade to save more →
                          </button>
                        </div>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                    >
                      <span>🏠</span> Back to Home
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                      <span>🚪</span> Sign Out
                    </button>
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Your Notes {rooms.length > 0 && `(${rooms.length})`}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-200">
            {isGuest 
              ? `Welcome! You can create up to 3 notes as a guest. Upgrade to save unlimited notes.`
              : `Manage your collaborative whiteboards and personal notes`
            }
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Create Normal Note Card */}
          <div
            onClick={() => {
              setRoomType('normal');
              setShowCreateModal(true);
            }}
            className="bg-gradient-to-br from-green-500 to-teal-600 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 text-white"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <span className="text-4xl">📝</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Normal Note</h3>
              <p className="text-green-100 text-sm mb-3">Personal whiteboard</p>
              <p className="text-white/90 text-sm">
                Create a private note just for you. Perfect for personal brainstorming and sketches.
              </p>
            </div>
          </div>

          {/* Create Collaborative Note Card */}
          <div
            onClick={() => {
              setRoomType('collaborative');
              setShowCreateModal(true);
            }}
            className="bg-gradient-to-br from-blue-500 to-purple-600 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 text-white"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <span className="text-4xl">👥</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Collaborative Note</h3>
              <p className="text-blue-100 text-sm mb-3">Team whiteboard</p>
              <p className="text-white/90 text-sm">
                Create a shared room with a code. Invite your team to collaborate in real-time.
              </p>
            </div>
          </div>

          {/* Join Room Card */}
          <div
            onClick={() => setShowJoinModal(true)}
            className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:-translate-y-1 border-2 border-purple-200 dark:border-gray-700"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-gray-800 dark:to-gray-700 rounded-xl flex items-center justify-center mb-4">
                <span className="text-4xl">🚪</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Join Room</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">Enter a room code</p>
              <p className="text-gray-600 dark:text-gray-200 text-sm">
                Have a room code? Join an existing collaborative whiteboard and start working together.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Rooms */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Rooms</h3>
          
          {roomsLoading ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading your rooms...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
              <div className="text-6xl mb-4">📋</div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No rooms yet
              </h4>
              <p className="text-gray-600 dark:text-gray-200 mb-6">
                Create a normal note for personal use or a collaborative note to work with your team
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  onClick={() => {
                    setRoomType('normal');
                    setShowCreateModal(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 transition-all shadow-md"
                >
                  📝 Normal Note
                </button>
                <button
                  onClick={() => {
                    setRoomType('collaborative');
                    setShowCreateModal(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md"
                >
                  👥 Collaborative Note
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-6 py-3 bg-white text-purple-600 border-2 border-purple-600 rounded-lg hover:bg-purple-50 transition-all"
                >
                  🚪 Join Room
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => handleOpenRoom(room.id)}
                  className="bg-white dark:bg-gray-900 rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 p-6 relative group"
                >
                  <button
                    onClick={(e) => handleDeleteRoom(room.id, e)}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  
                  {/* Type Badge */}
                  <div className={`absolute top-4 left-4 px-2 py-1 rounded-full text-xs font-semibold ${
                    room.type === 'normal' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  }`}>
                    {room.type === 'normal' ? '📝 Personal' : '👥 Team'}
                  </div>
                  
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 mt-6 ${
                    room.type === 'normal'
                      ? 'bg-gradient-to-br from-green-500 to-teal-600'
                      : 'bg-gradient-to-br from-blue-500 to-purple-600'
                  }`}>
                    <span className="text-white text-xl">{room.type === 'normal' ? '📝' : '🎨'}</span>
                  </div>
                  
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {room.name}
                  </h4>
                  
                  {room.isCollaborative && (
                    <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
                      <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                        Room Code: <span className="font-mono font-bold">{room.id}</span>
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-400 dark:text-gray-400">
                    Last accessed {formatDate(room.lastAccessed)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all border dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                roomType === 'normal' 
                  ? 'bg-gradient-to-br from-green-500 to-teal-600' 
                  : 'bg-gradient-to-br from-blue-500 to-purple-600'
              }`}>
                <span className="text-2xl">{roomType === 'normal' ? '📝' : '👥'}</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {roomType === 'normal' ? 'Create Normal Note' : 'Create Collaborative Note'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  {roomType === 'normal' ? 'Personal whiteboard' : 'Team whiteboard'}
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Note Title *
              </label>
              <input
                type="text"
                placeholder="e.g., Meeting Notes, Project Ideas..."
                value={noteTitle}
                onChange={(e) => {
                  setNoteTitle(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 dark:bg-gray-800 dark:text-white"
                maxLength={50}
                disabled={loading}
                autoFocus
              />
            </div>

            {roomType === 'collaborative' && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-semibold">ℹ️ Collaborative Note:</span> A unique 6-character room code will be generated. Share it with your team to collaborate in real-time!
                </p>
              </div>
            )}

            {roomType === 'normal' && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <span className="font-semibold">ℹ️ Normal Note:</span> This will be a private note just for you. No room code will be generated.
                </p>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNoteTitle('');
                  setError('');
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={loading || !noteTitle.trim()}
                className={`flex-1 px-6 py-3 text-white rounded-lg transition-all shadow-md disabled:opacity-50 ${
                  roomType === 'normal'
                    ? 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                }`}
              >
                {loading ? 'Creating...' : 'Create Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all border dark:border-gray-700">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Join Room
            </h3>
            <p className="text-gray-600 dark:text-gray-200 mb-6">
              Enter the room code shared by your teammate
            </p>
            
            <input
              type="text"
              placeholder="Enter room code (e.g., ABC123)"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 mb-4 font-mono uppercase dark:bg-gray-800 dark:text-white"
              maxLength={8}
              disabled={loading}
            />

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setRoomCode('');
                  setError('');
                }}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleJoinRoom}
                disabled={loading || !roomCode.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Conversion Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all border dark:border-gray-700">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎉</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                You're on a roll!
              </h3>
              <p className="text-gray-600 dark:text-gray-200">
                You've created {user?.guestRoomCount || 3} notes. Create an account to save unlimited notes and never lose your work!
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Unlimited Notes</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Create as many notes as you need</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">☁️</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Cloud Sync</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Access your notes from anywhere</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Secure Storage</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Your notes are safely backed up</p>
                </div>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!convertFormData.name || !convertFormData.email || !convertFormData.password) {
                return;
              }
              const result = await convertGuestToUser(convertFormData);
              if (result.success) {
                setShowConvertModal(false);
                setConvertFormData({ name: '', email: '', password: '' });
                // Reload rooms from server
                const serverRooms = await getUserRooms();
                setRooms(serverRooms);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={convertFormData.name}
                  onChange={(e) => setConvertFormData({ ...convertFormData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={convertFormData.email}
                  onChange={(e) => setConvertFormData({ ...convertFormData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Password</label>
                <input
                  type="password"
                  placeholder="Create a password"
                  value={convertFormData.password}
                  onChange={(e) => setConvertFormData({ ...convertFormData, password: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowConvertModal(false);
                    setConvertFormData({ name: '', email: '', password: '' });
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Maybe Later
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

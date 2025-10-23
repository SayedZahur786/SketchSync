import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('sketchsync_token'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const savedToken = localStorage.getItem('sketchsync_token');
      if (savedToken) {
        try {
          const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          setUser(response.data.user);
          setToken(savedToken);
        } catch (error) {
          console.error('Error loading user:', error);
          localStorage.removeItem('sketchsync_token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const signup = async (name, email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/v1/auth/signup`, {
        name,
        email,
        password
      });

      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('sketchsync_token', newToken);
      setToken(newToken);
      setUser(newUser);
      
      return { success: true, user: newUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Signup failed'
      };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/v1/auth/login`, {
        email,
        password
      });

      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('sketchsync_token', newToken);
      setToken(newToken);
      setUser(newUser);
      
      // Sync local rooms with server
      await syncLocalRoomsToServer(newToken);
      
      return { success: true, user: newUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const startGuestSession = async () => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/v1/auth/guest`);

      const { token: newToken, user: guestUser } = response.data;
      localStorage.setItem('sketchsync_token', newToken);
      setToken(newToken);
      setUser(guestUser);
      
      return { success: true, user: guestUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to start guest session'
      };
    }
  };

  const convertGuestToUser = async (name, email, password) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/auth/convert-guest`,
        { name, email, password },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('sketchsync_token', newToken);
      setToken(newToken);
      setUser(newUser);
      
      return { success: true, user: newUser, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create account'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('sketchsync_token');
    setToken(null);
    setUser(null);
  };

  const saveRoom = async (roomData) => {
    if (!token) return;
    
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/auth/save-room`,
        roomData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error saving room:', error);
      return null;
    }
  };

  const getUserRooms = useCallback(async () => {
    if (!token) return [];
    
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/v1/auth/rooms`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      return response.data.rooms || [];
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return [];
    }
  }, [token]);

  const syncLocalRoomsToServer = async (authToken) => {
    try {
      const localRooms = JSON.parse(localStorage.getItem('sketchsync_rooms') || '[]');
      
      for (const room of localRooms) {
        await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/v1/auth/save-room`,
          {
            roomId: room.id,
            name: room.name,
            type: room.type,
            isCollaborative: room.isCollaborative
          },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      }
    } catch (error) {
      console.error('Error syncing rooms:', error);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user && !user.isGuest,
    isGuest: user?.isGuest || false,
    signup,
    login,
    logout,
    startGuestSession,
    convertGuestToUser,
    saveRoom,
    getUserRooms
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

import React, { createContext, useContext, useState, useEffect } from 'react';

const DarkModeContext = createContext();

export const useDarkMode = () => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within DarkModeProvider');
  }
  return context;
};

export const DarkModeProvider = ({ children }) => {
  // Initialize from localStorage or default to light mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('sketchsync_dark_mode');
    if (saved !== null) {
      const darkMode = JSON.parse(saved);
      // Apply the class immediately to prevent flash
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return darkMode;
    }
    // Default to light mode (false) instead of system preference
    document.documentElement.classList.remove('dark');
    return false;
  });

  // Update localStorage and document class when dark mode changes
  useEffect(() => {
    console.log('Dark mode changed to:', isDarkMode);
    localStorage.setItem('sketchsync_dark_mode', JSON.stringify(isDarkMode));
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      console.log('Added dark class to document');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class from document');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    console.log('Toggling dark mode from:', isDarkMode, 'to:', !isDarkMode);
    setIsDarkMode(prev => !prev);
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

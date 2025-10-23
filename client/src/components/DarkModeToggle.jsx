import React from 'react';
import { useDarkMode } from '../context/DarkModeContext';

const DarkModeToggle = ({ className = '' }) => {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className={`relative w-16 h-8 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${className}`}
      style={{
        background: isDarkMode 
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
      }}
      aria-label="Toggle dark mode"
    >
      {/* Toggle Circle */}
      <div
        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transform transition-all duration-300 flex items-center justify-center ${
          isDarkMode ? 'translate-x-9' : 'translate-x-1'
        }`}
      >
        {/* Icon inside circle */}
        {isDarkMode ? (
          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Background Icons */}
      <div className="absolute inset-0 flex items-center justify-between px-2">
        <span className="text-xs opacity-70">☀️</span>
        <span className="text-xs opacity-70">🌙</span>
      </div>
    </button>
  );
};

export default DarkModeToggle;

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DarkModeProvider } from './context/DarkModeContext';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import Whiteboard from './components/Whiteboard';

const App = () => {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/room/:roomId" element={<Whiteboard />} />
          </Routes>
        </Router>
      </AuthProvider>
    </DarkModeProvider>
  );
};

export default App;
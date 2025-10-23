import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import AuthModal from './AuthModal';
import DarkModeToggle from './DarkModeToggle';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isGuest } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: '🎨',
      title: 'Real-Time Collaboration',
      description: 'Draw together with your team in real-time. See everyone\'s cursor movements and changes instantly with zero lag.'
    },
    {
      icon: '⚡',
      title: 'Guest Mode Available',
      description: 'Jump right in! Start as a guest or create an account. Choose what works best for you—no barriers to entry.'
    },
    {
      icon: '🛠️',
      title: 'Powerful Drawing Tools',
      description: 'Access professional drawing tools, shapes, text, sticky notes, and color palettes to bring your ideas to life.'
    },
    {
      icon: '🔄',
      title: 'Multi-Device Sync',
      description: 'Open the same room across multiple devices and watch them stay perfectly synchronized in real-time.'
    },
    {
      icon: '👥',
      title: 'Live User Presence',
      description: 'See who\'s actively collaborating with live cursors and user indicators. Know exactly who\'s working on what.'
    },
    {
      icon: '☁️',
      title: 'Cloud Storage',
      description: 'Your whiteboards are automatically saved to the cloud. Access them anytime, anywhere, from any device.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:bg-gradient-to-br dark:from-black dark:via-gray-950 dark:to-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-black/90 backdrop-blur-lg shadow-sm sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">S</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  SketchSync
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-300 -mt-1">Collaborate in Real-Time</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <DarkModeToggle />
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Get Started →
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          {/* Floating Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-800 dark:to-gray-700 rounded-full mb-8 border border-blue-200 dark:border-gray-600 shadow-sm">
            <span className="text-2xl">✨</span>
            <span className="text-sm font-semibold text-gray-800 dark:text-white">Free • Instant Collaborative WhiteBoard</span>
          </div>

          <h2 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
              SketchSync
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-100 font-medium mb-6 max-w-3xl mx-auto">
            The ultimate collaborative whiteboard for teams who create together
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
            Collaborate in real-time with your teammates, brainstorm ideas, sketch diagrams, 
            and bring your creative visions to life—all without leaving your browser.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-2xl transform hover:-translate-y-1 flex items-center gap-2"
            >
              Start Creating Now <span className="text-xl">→</span>
            </button>
            <button
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-white text-lg font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-md hover:shadow-lg border-2 border-gray-200 dark:border-gray-600"
            >
              Learn More
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔒</span>
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <span>Lightning Fast</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌐</span>
              <span>Works Anywhere</span>
            </div>
          </div>
        </div>

        {/* Demo Visual */}
        <div className="mt-20 relative">
          {/* Floating Elements */}
          <div className="absolute -top-4 -left-4 w-20 h-20 bg-blue-400 dark:bg-blue-600/30 rounded-full blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-400 dark:bg-purple-600/30 rounded-full blur-3xl opacity-30 animate-pulse"></div>
          
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 md:p-10 max-w-5xl mx-auto border border-gray-100 dark:border-gray-800 relative overflow-hidden">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
              <div className="flex-1 mx-4 h-7 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center px-3">
                <span className="text-xs text-gray-400 dark:text-gray-500">🔒 sketchsync.app/room/ABC123</span>
              </div>
            </div>
            
            {/* Canvas Preview */}
            <div className="rounded-xl h-80 md:h-96 flex items-center justify-center relative overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* Light Mode: Gradient Background + Blue Grid */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:hidden"></div>
              <div className="absolute inset-0 opacity-10 dark:hidden" style={{
                backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)',
                backgroundSize: '30px 30px'
              }}></div>
              
              {/* Dark Mode: Black Background + White Grid */}
              <div className="hidden dark:block absolute inset-0 bg-black"></div>
              <div className="hidden dark:block absolute inset-0 opacity-20" style={{
                backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                backgroundSize: '30px 30px'
              }}></div>
              
              <div className="text-center relative z-10">
                <div className="text-7xl mb-4 animate-bounce">🎨</div>
                <p className="text-gray-700 dark:text-gray-100 text-xl font-semibold mb-2">Your Creative Canvas Awaits</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Start drawing, sketching, and collaborating</p>
              </div>

              {/* Floating Tool Icons */}
              <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                <span className="text-xl">✏️</span>
              </div>
              <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                <span className="text-xl">🖊️</span>
              </div>
              <div className="absolute bottom-4 left-1/4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                <span className="text-xl">📝</span>
              </div>
              <div className="absolute bottom-4 right-1/4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                <span className="text-xl">🎯</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white dark:bg-black py-24 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-50/50 dark:from-gray-900/50 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-3xl opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-blue-100 dark:bg-gray-800 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-4">
              ✨ FEATURES
            </div>
            <h3 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Seamless Collaboration</span>
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-200 max-w-2xl mx-auto">
              Everything you need to collaborate effectively and bring your ideas to life
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-8 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-400 hover:-translate-y-2 cursor-pointer"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg">
                  <span className="text-3xl">{feature.icon}</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-200 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-black dark:to-gray-900 relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-blue-300 dark:bg-blue-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-purple-300 dark:bg-purple-500 rounded-full blur-3xl opacity-20"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-purple-100 dark:bg-gray-800 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold mb-4">
              🚀 GETTING STARTED
            </div>
            <h3 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-200 max-w-2xl mx-auto">
              Get started in three simple steps—no complicated setup required
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                <span className="text-white text-3xl font-bold">1</span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Create a Room</h4>
                <p className="text-gray-600 dark:text-gray-200 leading-relaxed">
                  Click "Get Started" and create a new room with a unique code or start a personal note
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                <span className="text-white text-3xl font-bold">2</span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Invite Your Team</h4>
                <p className="text-gray-600 dark:text-gray-200 leading-relaxed">
                  Share the room code with your teammates to collaborate together in real-time
                </p>
              </div>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform">
                <span className="text-white text-3xl font-bold">3</span>
              </div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Start Creating</h4>
                <p className="text-gray-600 dark:text-gray-200 leading-relaxed">
                  Draw, sketch, and brainstorm together with powerful tools and real-time sync
                </p>
              </div>
            </div>
          </div>

          {/* Connection Lines (Hidden on mobile) */}
          <div className="hidden md:block absolute top-1/2 left-1/4 right-1/4 h-1 bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 -translate-y-20 opacity-30"></div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-24 relative overflow-hidden border-y border-gray-200 dark:border-gray-800">
        {/* Subtle Background Elements */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-purple-200/20 dark:from-blue-500/5 dark:to-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-purple-200/20 to-pink-200/20 dark:from-purple-500/5 dark:to-pink-500/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h3 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Ready to Start Collaborating?
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto">
            Join SketchSync today and experience seamless real-time collaboration. 
            Start creating together—no credit card required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Get Started for Free
            </button>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Free forever • No credit card</span>
            </div>
          </div>

          {/* Simple Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Real-Time Sync</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Collaborate instantly with your team</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Secure & Private</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Your data is encrypted and protected</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700 transition-colors">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Lightning Fast</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Smooth and instant synchronization</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-16 border-t border-gray-800 dark:border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white text-2xl font-bold">S</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-white">SketchSync</span>
                  <p className="text-sm text-gray-400">Collaborate in Real-Time</p>
                </div>
              </div>
              <p className="text-gray-400 dark:text-gray-300 leading-relaxed mb-6 max-w-sm">
                The ultimate collaborative whiteboard for teams who create together. 
                Draw, sketch, and brainstorm in real-time from anywhere.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#features" className="text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition cursor-pointer flex items-center gap-2">
                    <span className="text-purple-400">→</span>
                    <span>Features</span>
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition cursor-pointer flex items-center gap-2">
                    <span className="text-purple-400">→</span>
                    <span>How It Works</span>
                  </a>
                </li>
                <li>
                  <button onClick={() => setShowAuthModal(true)} className="text-gray-400 dark:text-gray-300 hover:text-white dark:hover:text-white transition cursor-pointer flex items-center gap-2">
                    <span className="text-purple-400">→</span>
                    <span>Get Started</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact & Info */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Connect</h4>
              <p className="text-gray-400 dark:text-gray-300 mb-4 text-sm">
                Have questions or feedback? We'd love to hear from you!
              </p>
              <div className="flex gap-3 mb-4">
                <a href="#" className="w-10 h-10 bg-gray-800 dark:bg-gray-900 hover:bg-gradient-to-br hover:from-blue-500 hover:to-purple-600 rounded-lg flex items-center justify-center cursor-pointer transition">
                  <span>🐦</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 dark:bg-gray-900 hover:bg-gradient-to-br hover:from-blue-500 hover:to-purple-600 rounded-lg flex items-center justify-center cursor-pointer transition">
                  <span>💼</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 dark:bg-gray-900 hover:bg-gradient-to-br hover:from-blue-500 hover:to-purple-600 rounded-lg flex items-center justify-center cursor-pointer transition">
                  <span>📧</span>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-800 dark:border-gray-900">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-gray-400 dark:text-gray-300 text-sm text-center md:text-left">
                © {new Date().getFullYear()} SketchSync. Built with <span className="text-red-500">❤️</span> for creative teams.
              </div>
              <div className="flex gap-6 text-sm text-gray-400 dark:text-gray-300">
                <a href="#" className="hover:text-white dark:hover:text-white transition">Privacy</a>
                <span className="text-gray-600">•</span>
                <a href="#" className="hover:text-white dark:hover:text-white transition">Terms</a>
                <span className="text-gray-600">•</span>
                <a href="#" className="hover:text-white dark:hover:text-white transition">Contact</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { startGuestSession, signup, login } = useAuth();
  const [authMode, setAuthMode] = useState('options'); // 'options', 'signup', 'login'
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGuestMode = async () => {
    setLoading(true);
    setError('');
    
    const result = await startGuestSession();
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await signup(formData.name, formData.email, formData.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Options View */}
        {authMode === 'options' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🎨</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SketchSync</h2>
              <p className="text-gray-600">Choose how you'd like to continue</p>
            </div>

            <div className="space-y-3">
              {/* Guest Mode Button */}
              <button
                onClick={handleGuestMode}
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="text-xl">🚀</span>
                <div className="text-left">
                  <div className="font-semibold">Continue as Guest</div>
                  <div className="text-xs text-green-100">Quick start, no sign-up needed</div>
                </div>
              </button>

              {/* Sign Up Button */}
              <button
                onClick={() => setAuthMode('signup')}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span className="text-xl">✨</span>
                <div className="text-left">
                  <div className="font-semibold">Create Account</div>
                  <div className="text-xs text-blue-100">Save your work permanently</div>
                </div>
              </button>

              {/* Login Button */}
              <button
                onClick={() => setAuthMode('login')}
                className="w-full px-6 py-4 border-2 border-gray-300 hover:border-purple-500 hover:bg-purple-50 text-gray-700 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <span className="text-xl">🔑</span>
                <div className="text-left">
                  <div className="font-semibold">Sign In</div>
                  <div className="text-xs text-gray-500">Already have an account</div>
                </div>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <span>ℹ️</span>
                <div>
                  <p className="font-medium mb-1">Guest Mode:</p>
                  <ul className="text-xs space-y-1">
                    <li>• Full access to all features</li>
                    <li>• Rooms saved for 7 days</li>
                    <li>• Convert to permanent account anytime</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Signup View */}
        {authMode === 'signup' && (
          <div>
            <button
              onClick={() => {
                setAuthMode('options');
                setError('');
              }}
              className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
              <p className="text-gray-600">Save your work across all devices</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 bg-white"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 bg-white"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 bg-white"
                  placeholder="At least 6 characters"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-md disabled:opacity-50 font-semibold"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => {
                  setAuthMode('login');
                  setError('');
                }}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                Sign In
              </button>
            </p>
          </div>
        )}

        {/* Login View */}
        {authMode === 'login' && (
          <div>
            <button
              onClick={() => {
                setAuthMode('options');
                setError('');
              }}
              className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
              <p className="text-gray-600">Sign in to your account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 bg-white"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 bg-white"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg transition-all shadow-md disabled:opacity-50 font-semibold"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setError('');
                }}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                Sign Up
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;

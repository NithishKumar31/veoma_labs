import React, { useState } from 'react';
import { Lock, User as UserIcon, Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../services/api';
import { User } from '../types';

interface LoginModalProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Veoma@Admin2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.login({ username, password });
      localStorage.setItem('veoma_token', res.access_token);
      localStorage.setItem('veoma_user', JSON.stringify(res.user));
      onLoginSuccess(res.user, res.access_token);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const setPresetUser = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-8 text-center text-white relative">
          <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center font-extrabold text-white text-3xl shadow-lg">
            V
          </div>
          <h2 className="text-xl font-bold tracking-tight">VEOMA LABS</h2>
          <p className="text-xs text-cyan-300 font-medium tracking-wide uppercase mt-1">
            Business Management System
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            3D Printing • 3D Designing • 3D Scanning • Training
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {isGitHubPages && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1 text-emerald-900">
              <div className="flex items-center space-x-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Firebase Cloud Active</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-normal">
                Online mode connected to Firebase Firestore (<span className="font-mono font-medium">veoma-labs</span>). Real-time orders, customers, and expenses.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-rose-600" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <UserIcon size={16} />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1 transition cursor-pointer"
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPassword ? 'Hide' : 'Show Password'}</span>
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>

          {/* Quick Preset Button for Super Admin Only */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Super Admin Account
              </p>
              <button
                type="button"
                onClick={() => {
                  setPresetUser('admin', 'Veoma@Admin2026');
                  setShowPassword(true);
                }}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline transition cursor-pointer"
              >
                Auto-fill & View
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPresetUser('admin', 'Veoma@Admin2026')}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-blue-50 hover:border-blue-300 text-slate-800 hover:text-blue-700 rounded-lg text-xs font-medium border border-slate-200 flex items-center justify-between transition cursor-pointer"
            >
              <span className="flex items-center space-x-2">
                <Shield size={14} className="text-blue-600" />
                <span className="font-semibold">Super Admin</span>
              </span>
              <span className="font-mono text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                admin / Veoma@Admin2026
              </span>
            </button>
          </div>
        </form>

        <div className="bg-slate-50 px-8 py-3 text-center border-t border-slate-200">
          <p className="text-[10px] text-slate-500 flex items-center justify-center space-x-1">
            <Shield size={12} className="text-blue-600" />
            <span>Veoma Labs Role-Based Enterprise Security</span>
          </p>
        </div>
      </div>
    </div>
  );
};

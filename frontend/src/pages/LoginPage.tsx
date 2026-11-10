import React, { useState } from 'react';
import { Shield, Lock, Mail, ArrowRight, Sparkles, UserCheck } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@recruitment.internal');
  const [password, setPassword] = useState('Admin@HR2026!');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const user = await api.loginWithCredentials(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoQuickLogin = async (role: 'HR_ADMIN' | 'HIRING_MANAGER') => {
    setError(null);
    setIsLoading(true);
    try {
      const user = await api.demoLogin(role);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            AG
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Antigravity HR Platform</h1>
          <p className="text-xs text-slate-500">
            Sign in with your organizational credentials to access recruitment automation & compliance tools.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleCredentialLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider justify-center">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Demo Accounts (RBAC Verification)</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoQuickLogin('HR_ADMIN')}
              disabled={isLoading}
              className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>HR Admin</span>
              </div>
              <p className="text-[10px] text-blue-700 mt-1">Full CRUD, Calling & Overrides</p>
            </button>

            <button
              type="button"
              onClick={() => handleDemoQuickLogin('HIRING_MANAGER')}
              disabled={isLoading}
              className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hiring Manager</span>
              </div>
              <p className="text-[10px] text-indigo-700 mt-1">Review & Analytics (Read-Only)</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


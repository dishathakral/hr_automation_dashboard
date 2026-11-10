import React from 'react';
import { Search, Shield, ChevronDown, Plus, Upload, Sun, Moon } from 'lucide-react';
import { User, Job } from '../../types';

interface TopNavProps {
  currentUser: User | null;
  onSwitchRole: (targetRole: 'HR_ADMIN' | 'HIRING_MANAGER') => void;
  jobs: Job[];
  selectedJobId: string;
  setSelectedJobId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenCreateJob: () => void;
  onOpenImport: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentUser,
  onSwitchRole,
  jobs,
  selectedJobId,
  setSelectedJobId,
  searchQuery,
  setSearchQuery,
  onOpenCreateJob,
  onOpenImport,
  darkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
      {/* Search & Job Filter */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search candidates, skills, phone numbers, or cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Job Requisition Filter */}
        <div className="relative min-w-[220px]">
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full appearance-none pl-3 pr-8 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 cursor-pointer"
          >
            <option value="">All Job Vacancies ({jobs.length})</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Action Buttons & Role Switcher */}
      <div className="flex items-center gap-3">
        {currentUser?.role === 'HR_ADMIN' && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Import Indeed CSV</span>
            </button>
            <button
              onClick={onOpenCreateJob}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post Vacancy</span>
            </button>
          </div>
        )}

        {/* Demo Role Switcher Pill */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-400" />
            <span>Role:</span>
          </span>
          <button
            onClick={() => onSwitchRole('HR_ADMIN')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              currentUser?.role === 'HR_ADMIN'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            HR Admin
          </button>
          <button
            onClick={() => onSwitchRole('HIRING_MANAGER')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              currentUser?.role === 'HIRING_MANAGER'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hiring Manager
          </button>
        </div>

        {/* Light / Dark Theme Toggle */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};


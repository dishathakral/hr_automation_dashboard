import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  BrainCircuit,
  PhoneCall,
  CalendarCheck2,
  FileSpreadsheet,
  History,
  Bell,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut
} from 'lucide-react';
import { User } from '../../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  currentUser: User | null;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  currentUser,
  onSignOut
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'jobs', label: 'Indeed Postings', icon: Briefcase, badge: 'Task 1' },
    { id: 'applicants', label: 'Applicant Central', icon: Users, badge: 'Task 2' },
    { id: 'screening', label: 'AI Screening Co-Pilot', icon: BrainCircuit, badge: 'Task 3' },
    { id: 'calling', label: 'Calling Hub (+91)', icon: PhoneCall, badge: 'Task 4' },
    { id: 'interviews', label: 'Interview Calendar', icon: CalendarCheck2, badge: 'Task 5' },
    { id: 'reports', label: 'Deliverables & Reports', icon: FileSpreadsheet, badge: 'Exports' },
    { id: 'audit', label: 'Audit Trail & Overrides', icon: History, badge: null },
    { id: 'notifications', label: 'Notification Logs', icon: Bell, badge: null },
    { id: 'settings', label: 'AI & Compliance', icon: Settings, badge: null },
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col justify-between z-20 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm shadow-blue-500/20">
                <span className="text-lg tracking-tighter">AG</span>
              </div>
              <div>
                <h1 className="font-bold text-sm text-slate-900 tracking-tight leading-none">Antigravity HR</h1>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Recruitment Automation</p>
              </div>
            </div>
          )}

          {collapsed && (
            <div className="w-9 h-9 mx-auto rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm shadow-blue-500/20">
              <span className="text-sm tracking-tighter">AG</span>
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/5'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                {!collapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-blue-200 text-blue-800'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-800 truncate">{currentUser?.full_name || 'HR Recruiter'}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">{currentUser?.role?.replace('_', ' ') || 'Role'}</p>
                </div>
              </div>
              {currentUser?.role === 'HR_ADMIN' && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </div>
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md border border-slate-200 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out / Login Page</span>
            </button>
          </>
        ) : (
          <button
            onClick={onSignOut}
            className="w-8 h-8 mx-auto rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs hover:bg-rose-100"
            title={`${currentUser?.full_name || 'User'} (Click to Sign Out)`}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
};


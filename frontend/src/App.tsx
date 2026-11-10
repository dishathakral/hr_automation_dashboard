import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { Job, Application, CallLog, Interview, Notification, AuditLog, KPIOverview, User } from './types';

// Layout
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { StatusBanner } from './components/layout/StatusBanner';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { JobsPage } from './pages/JobsPage';
import { ApplicantsPage } from './pages/ApplicantsPage';
import { ScreeningPage } from './pages/ScreeningPage';
import { CallingPage } from './pages/CallingPage';
import { InterviewsPage } from './pages/InterviewsPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

// Modals
import { CandidateDrawer } from './components/applicants/CandidateDrawer';
import { CreateJobModal } from './components/jobs/CreateJobModal';
import { ManualApplicantModal } from './components/applicants/ManualApplicantModal';
import { ImportModal } from './components/applicants/ImportModal';
import { ScheduleModal } from './components/interviews/ScheduleModal';

export const App: React.FC = () => {
  // Navigation & Layout
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');

  // Core Data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [kpis, setKpis] = useState<KPIOverview | null>(null);

  // Filters
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [manualApplicantOpen, setManualApplicantOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTargetApp, setScheduleTargetApp] = useState<Application | null>(null);

  // Sync dark mode class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Initial Auth & Data Load
  useEffect(() => {
    const initApp = async () => {
      try {
        let user = api.getUser();
        if (user && api.getToken()) {
          try {
            user = await api.getMe();
          } catch {
            api.clearAuth();
            user = null;
          }
        }
        if (!user || !api.getToken()) {
          user = await api.demoLogin('HR_ADMIN');
        }
        setCurrentUser(user);
        await loadAllData();
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };
    initApp();
  }, []);

  const loadAllData = async () => {
    try {
      const [jobsData, appsData, callsData, intvsData, notifsData, auditsData, kpisData] = await Promise.all([
        api.getJobs(),
        api.getApplications({ job_id: selectedJobId || undefined, search: searchQuery || undefined }),
        api.getCallLogs(),
        api.getInterviews(),
        api.getNotifications(),
        api.getAuditLogs(),
        api.getKPIs()
      ]);

      setJobs(jobsData);
      setApplications(appsData);
      setCallLogs(callsData);
      setInterviews(intvsData);
      setNotifications(notifsData);
      setAuditLogs(auditsData);
      setKpis(kpisData);
    } catch (err) {
      console.error('Data reload error:', err);
    }
  };

  useEffect(() => {
    if (!currentUser || showLogin) return;
    const fetchFilteredApps = async () => {
      try {
        const appsData = await api.getApplications({
          job_id: selectedJobId || undefined,
          search: searchQuery || undefined
        });
        setApplications(appsData);
      } catch {
        // ignore
      }
    };
    fetchFilteredApps();
  }, [selectedJobId, searchQuery]);

  useEffect(() => {
    if (!currentUser || showLogin) return;
    loadAllData();
  }, [currentTab]);

  const handleSwitchRole = async (targetRole: 'HR_ADMIN' | 'HIRING_MANAGER') => {
    try {
      const user = await api.demoLogin(targetRole);
      setCurrentUser(user);
      await loadAllData();
    } catch (err: any) {
      alert(`Role switch error: ${err.message}`);
    }
  };

  const handleSignOut = () => {
    api.clearAuth();
    setCurrentUser(null);
    setShowLogin(true);
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    setShowLogin(false);
    await loadAllData();
  };

  const handleOpenCalling = (_app: Application) => {
    setSelectedApp(null);
    setCurrentTab('calling');
  };

  const handleOpenSchedule = (app?: Application) => {
    setSelectedApp(null);
    setScheduleTargetApp(app || null);
    setScheduleModalOpen(true);
  };

  const handleTriggerScreening = async (appId: string) => {
    try {
      await api.evaluateCandidate(appId);
      await loadAllData();
      alert('AI Screening completed!');
    } catch (err: any) {
      alert(`Error screening: ${err.message}`);
    }
  };

  if (showLogin) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        currentUser={currentUser}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav
          currentUser={currentUser}
          onSwitchRole={handleSwitchRole}
          jobs={jobs}
          selectedJobId={selectedJobId}
          setSelectedJobId={setSelectedJobId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenCreateJob={() => setCreateJobOpen(true)}
          onOpenImport={() => setImportOpen(true)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />

        <StatusBanner />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardPage
                kpis={kpis}
                applications={applications}
                callLogs={callLogs}
                auditLogs={auditLogs}
                onNavigate={setCurrentTab}
                onSelectCandidate={setSelectedApp}
                onOpenCalling={handleOpenCalling}
                onOpenSchedule={handleOpenSchedule}
              />
            )}

            {currentTab === 'jobs' && (
              <JobsPage
                jobs={jobs}
                currentUser={currentUser}
                onRefreshJobs={loadAllData}
                onOpenCreateJob={() => setCreateJobOpen(true)}
                onFilterByJob={(jobId) => {
                  setSelectedJobId(jobId);
                  setCurrentTab('applicants');
                }}
              />
            )}

            {currentTab === 'applicants' && (
              <ApplicantsPage
                applications={applications}
                currentUser={currentUser}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                onSelectCandidate={setSelectedApp}
                onOpenCalling={handleOpenCalling}
                onOpenSchedule={handleOpenSchedule}
                onOpenManualEntry={() => setManualApplicantOpen(true)}
                onOpenImport={() => setImportOpen(true)}
                onRefreshApplications={loadAllData}
              />
            )}

            {currentTab === 'screening' && (
              <ScreeningPage
                applications={applications}
                currentUser={currentUser}
                onRefreshApplications={loadAllData}
                onOpenCalling={handleOpenCalling}
                onOpenSchedule={handleOpenSchedule}
              />
            )}

            {currentTab === 'calling' && (
              <CallingPage
                applications={applications}
                callLogs={callLogs}
                currentUser={currentUser}
                onRefreshCallLogs={loadAllData}
                onOpenSchedule={handleOpenSchedule}
              />
            )}

            {currentTab === 'interviews' && (
              <InterviewsPage
                interviews={interviews}
                applications={applications}
                currentUser={currentUser}
                onRefreshInterviews={loadAllData}
                onOpenSchedule={handleOpenSchedule}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsPage
                jobs={jobs}
                applications={applications}
                callLogs={callLogs}
                interviews={interviews}
                kpis={kpis}
              />
            )}

            {currentTab === 'audit' && (
              <AuditPage auditLogs={auditLogs} />
            )}

            {currentTab === 'notifications' && (
              <NotificationsPage notifications={notifications} />
            )}

            {currentTab === 'settings' && (
              <SettingsPage currentUser={currentUser} />
            )}
          </div>
        </main>
      </div>

      <CandidateDrawer
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        currentUser={currentUser}
        onOpenCalling={handleOpenCalling}
        onOpenSchedule={handleOpenSchedule}
        onTriggerScreening={handleTriggerScreening}
      />

      <CreateJobModal
        isOpen={createJobOpen}
        onClose={() => setCreateJobOpen(false)}
        onJobCreated={loadAllData}
      />

      <ManualApplicantModal
        isOpen={manualApplicantOpen}
        onClose={() => setManualApplicantOpen(false)}
        jobs={jobs}
        onApplicantCreated={loadAllData}
      />

      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        jobs={jobs}
        onImportComplete={loadAllData}
      />

      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setScheduleTargetApp(null);
        }}
        applications={applications}
        initialApplication={scheduleTargetApp}
        currentUser={currentUser}
        onInterviewScheduled={loadAllData}
      />
    </div>
  );
};
export default App;

import React from 'react';
import {
  Users,
  Briefcase,
  BrainCircuit,
  PhoneCall,
  CalendarCheck2,
  TrendingUp,
  ArrowRight,
  Sparkles,
  PhoneForwarded,
  CalendarPlus
} from 'lucide-react';
import { KPIOverview, Application, CallLog, AuditLog } from '../types';
import { StatusBadge } from '../components/shared/StatusBadge';
import { ScoreBadge } from '../components/shared/ScoreBadge';

interface DashboardPageProps {
  kpis: KPIOverview | null;
  applications: Application[];
  callLogs?: CallLog[];
  auditLogs?: AuditLog[];
  onNavigate: (tab: string) => void;
  onSelectCandidate: (app: Application) => void;
  onOpenCalling: (app: Application) => void;
  onOpenSchedule: (app: Application) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  kpis,
  applications,
  callLogs = [],
  auditLogs = [],
  onNavigate,
  onSelectCandidate,
  onOpenCalling,
  onOpenSchedule
}) => {
  const pendingScreening = applications.filter(a => a.stage === 'APPLIED').length;
  const readyForCall = applications.filter(a => a.stage === 'SCREENED' && a.screening_status === 'SHORTLISTED' && !a.call_outcome);
  const readyForInterview = applications.filter(a => a.call_outcome === 'ANSWERED_INTERESTED' && a.stage !== 'INTERVIEW_SCHEDULED');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30 mb-3">
            <Sparkles className="w-3 h-3 text-blue-300" />
            <span>Indeed Recruitment Lifecycle Automation</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Recruitment Pipeline Overview</h2>
          <p className="text-slate-300 text-sm mt-1 leading-relaxed">
            Automating candidate intake, 6-tier classification, explainable AI screening with human approval, Indian telecom calling compliance, and interview logistics.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Jobs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Vacancies</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {kpis?.active_jobs_count || 0}
            </span>
            <span className="text-xs font-medium text-slate-500">Indeed Tracked</span>
          </div>
        </div>

        {/* Total Applications */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Applicants</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {kpis?.total_applications_count || 0}
            </span>
            <span className="text-xs font-medium text-emerald-600 font-semibold">6 Tiers Categorised</span>
          </div>
        </div>

        {/* AI Shortlisted */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Shortlisted</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {kpis?.shortlisted_count || 0}
            </span>
            <span className="text-xs font-medium text-slate-500">Score &gt;= 75</span>
          </div>
        </div>

        {/* Confirmed Interviews */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interviews Booked</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {kpis?.interviews_scheduled_count || 0}
            </span>
            <span className="text-xs font-medium text-slate-500">Conversion: {kpis?.conversion_rate_percentage || 0}%</span>
          </div>
        </div>
      </div>

      {/* Recruitment Funnel & Quick Action Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recruitment Funnel Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recruitment Conversion Funnel</h3>
              <p className="text-xs text-slate-500">End-to-end stage progression from application intake to confirmed interview</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View Full Deliverables</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {kpis && Object.entries(kpis.funnel).map(([stageName, count], idx) => {
              const maxVal = Math.max(...Object.values(kpis.funnel), 1);
              const percentage = Math.round((count / maxVal) * 100);
              const colors = [
                'bg-blue-600',
                'bg-indigo-600',
                'bg-cyan-600',
                'bg-emerald-600',
                'bg-amber-600',
                'bg-teal-600',
                'bg-purple-600'
              ];
              const barColor = colors[idx % colors.length];

              return (
                <div key={stageName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-700 font-semibold">{stageName}</span>
                    <span className="text-slate-900 font-bold tabular-nums">
                      {count} <span className="text-slate-400 font-normal">({percentage}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actionable Queues */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recruiter Action Center</h3>
            <p className="text-xs text-slate-500 mb-4">Pending workflow stages requiring action</p>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-900">Pending AI Screening</p>
                  <p className="text-[11px] text-blue-700 font-medium">{pendingScreening} new applications to review</p>
                </div>
                <button
                  onClick={() => onNavigate('screening')}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                >
                  Screen
                </button>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-900">Ready for Screening Call</p>
                  <p className="text-[11px] text-emerald-700 font-medium">{readyForCall.length} shortlisted candidates</p>
                </div>
                <button
                  onClick={() => onNavigate('calling')}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-sm"
                >
                  Call
                </button>
              </div>

              <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-purple-900">Ready for Interview</p>
                  <p className="text-[11px] text-purple-700 font-medium">{readyForInterview.length} interested candidates</p>
                </div>
                <button
                  onClick={() => onNavigate('interviews')}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors shadow-sm"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Audit Rule:</span> Human recruiters hold final decision authority. AI recommendations never auto-reject applicants.
          </div>
        </div>
      </div>

      {/* Category Distribution, Calling Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 6-Tier Category Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Applicant Taxonomy (6 Tiers)</h3>
            <p className="text-xs text-slate-500">Classification breakdown across incoming applications</p>
          </div>
          <div className="space-y-2.5">
            {kpis && Object.entries(kpis.category_counts).map(([cat, count]) => {
              const pct = Math.round((count / Math.max(kpis.total_applications_count, 1)) * 100);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">{cat.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Call Outcome Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Telephony Call Outcomes</h3>
              <p className="text-xs text-slate-500">Contact rate: {kpis?.contact_rate_percentage || 0}%</p>
            </div>
            <PhoneCall className="w-4 h-4 text-blue-600" />
          </div>
          <div className="space-y-2">
            {[
              { key: 'ANSWERED_INTERESTED', label: 'Interested', color: 'bg-emerald-500' },
              { key: 'CALLBACK_REQUESTED', label: 'Callback Requested', color: 'bg-blue-500' },
              { key: 'OPTED_OUT', label: 'Opted Out (DNC)', color: 'bg-rose-500' },
              { key: 'NO_ANSWER', label: 'No Answer / Busy', color: 'bg-amber-500' },
              { key: 'ANSWERED_NOT_INTERESTED', label: 'Not Interested', color: 'bg-slate-400' }
            ].map((item) => {
              const count = item.key === 'NO_ANSWER'
                ? callLogs.filter(c => c.outcome === 'NO_ANSWER' || c.outcome === 'BUSY').length
                : callLogs.filter(c => c.outcome === item.key).length;
              const pct = Math.round((count / Math.max(callLogs.length, 1)) * 100);
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Audit Activity</h3>
              <p className="text-xs text-slate-500">Latest human approvals & system events</p>
            </div>
            <button onClick={() => onNavigate('audit')} className="text-xs font-semibold text-blue-600 hover:underline">
              Full Log
            </button>
          </div>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{log.entity_type} • {log.action}</span>
                  <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">{log.rationale || log.actor_email}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Incoming Applications</h3>
            <p className="text-xs text-slate-500">Verified candidates ingested from Indeed with standardized categorization</p>
          </div>
          <button
            onClick={() => onNavigate('applicants')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View All Applicants ({applications.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Job Role</th>
                <th className="py-3 px-4">Category (6 Tiers)</th>
                <th className="py-3 px-4">AI Score</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.slice(0, 6).map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onSelectCandidate(app)}
                      className="font-semibold text-blue-600 hover:underline text-left"
                    >
                      {app.candidate.full_name}
                    </button>
                    <p className="text-[11px] text-slate-500 font-medium">{app.candidate.current_city} • {app.candidate.phone_normalized}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium truncate max-w-[200px]">
                    {app.job_title}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={app.category} type="category" />
                  </td>
                  <td className="py-3 px-4">
                    <ScoreBadge score={app.suitability_score} />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={app.stage} type="stage" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {app.suitability_score && app.suitability_score >= 70 && !app.call_outcome && (
                        <button
                          onClick={() => onOpenCalling(app)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Simulate Screening Call"
                        >
                          <PhoneForwarded className="w-4 h-4" />
                        </button>
                      )}
                      {app.call_outcome === 'ANSWERED_INTERESTED' && app.stage !== 'INTERVIEW_SCHEDULED' && (
                        <button
                          onClick={() => onOpenSchedule(app)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                          title="Schedule Interview"
                        >
                          <CalendarPlus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onSelectCandidate(app)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded"
                      >
                        Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


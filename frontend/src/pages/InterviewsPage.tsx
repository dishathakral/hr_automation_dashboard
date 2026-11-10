import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  Download,
  CalendarPlus,
  LayoutGrid,
  TableProperties,
  Users
} from 'lucide-react';
import { Interview, Application, User as UserModel } from '../types';
import { StatusBadge } from '../components/shared/StatusBadge';
import { api } from '../api/client';

interface InterviewsPageProps {
  interviews: Interview[];
  applications: Application[];
  currentUser: UserModel | null;
  onRefreshInterviews: () => void;
  onOpenSchedule: (app?: Application) => void;
}

export const InterviewsPage: React.FC<InterviewsPageProps> = ({
  interviews,
  currentUser,
  onRefreshInterviews,
  onOpenSchedule
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards');
  const [selectedInterviewer, setSelectedInterviewer] = useState<string>('');

  const interviewers = Array.from(new Set(interviews.map(i => i.interviewer_name)));
  const filteredInterviews = selectedInterviewer
    ? interviews.filter(i => i.interviewer_name === selectedInterviewer)
    : interviews;

  const groupedByDate = filteredInterviews.reduce<Record<string, Interview[]>>((acc, intv) => {
    const dateKey = new Date(intv.scheduled_at).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(intv);
    return acc;
  }, {});

  const handleUpdateStatus = async (intvId: string, newStatus: string) => {
    try {
      await api.updateInterviewStatus(intvId, newStatus);
      onRefreshInterviews();
    } catch (err: any) {
      alert(`Error updating interview status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Interview Logistics & Confirmation Hub</h2>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">Task 5</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Convert interested applicants into scheduled interviews with meeting links, calendar (.ics) generation, and confirmation tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Calendar Agenda</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => api.downloadDeliverable('interview-schedule', 'Deliverable_5_Interview_Schedule_Master.csv').catch((e) => alert(e.message))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Schedule (CSV)</span>
          </button>

          {currentUser?.role === 'HR_ADMIN' && (
            <button
              onClick={() => onOpenSchedule()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors shadow-sm shadow-purple-500/20"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Schedule Interview</span>
            </button>
          )}
        </div>
      </div>

      {/* Interviewer Availability Filter Strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Users className="w-4 h-4 text-purple-600" />
          <span>Interviewer Availability & Schedule Filter:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedInterviewer('')}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              !selectedInterviewer
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            All Interviewers ({interviews.length})
          </button>
          {interviewers.map((name) => (
            <button
              key={name}
              onClick={() => setSelectedInterviewer(name)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                selectedInterviewer === name
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {name} ({interviews.filter(i => i.interviewer_name === name).length} booked)
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInterviews.map((intv) => (
            <div
              key={intv.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-purple-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <StatusBadge status={intv.confirmation_status} type="interview" />
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {intv.duration_minutes} Mins
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 tracking-tight">
                  {intv.candidate_name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Role: <span className="font-semibold text-slate-800">{intv.job_title}</span>
                </p>

                <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>{new Date(intv.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{new Date(intv.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    {intv.interview_mode === 'IN_PERSON' ? (
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <Video className="w-4 h-4 text-blue-500 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-800">
                      Mode: {intv.interview_mode.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate font-mono pl-6" title={intv.meeting_link_or_venue}>
                    {intv.meeting_link_or_venue}
                  </p>
                </div>

                <div className="mt-3 text-xs text-slate-600 flex items-center gap-2 pl-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Interviewer: <strong>{intv.interviewer_name}</strong></span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => api.downloadInterviewIcs(intv.id, intv.candidate_name).catch((e) => alert(e.message))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg transition-colors"
                  title="Download RFC 5545 .ics Calendar Invite"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-purple-600" />
                  <span>Download .ics</span>
                </button>

                <select
                  value={intv.confirmation_status}
                  onChange={(e) => handleUpdateStatus(intv.id, e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700 font-semibold cursor-pointer"
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="CONFIRMATION_PENDING">Confirmation Pending</option>
                  <option value="RESCHEDULED">Rescheduled</option>
                  <option value="NO_RESPONSE">No Response</option>
                  <option value="DECLINED">Declined</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Calendar Date-Grouped Agenda View */
        <div className="space-y-4">
          {Object.entries(groupedByDate).map(([dateLabel, dayInterviews]) => (
            <div key={dateLabel} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>{dateLabel}</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-500">{dayInterviews.length} slot(s)</span>
              </div>
              <div className="divide-y divide-slate-100">
                {dayInterviews.map((intv) => (
                  <div key={intv.id} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70">
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
                        {new Date(intv.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({intv.duration_minutes}m)
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900">{intv.candidate_name} — <span className="font-medium text-slate-600">{intv.job_title}</span></p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Interviewer: <strong>{intv.interviewer_name}</strong> • Mode: {intv.interview_mode.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={intv.confirmation_status} type="interview" />
                      <button
                        type="button"
                        onClick={() => api.downloadInterviewIcs(intv.id, intv.candidate_name).catch((e) => alert(e.message))}
                        className="px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100"
                      >
                        .ics
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

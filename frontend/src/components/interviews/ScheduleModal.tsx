import React, { useState, useEffect } from 'react';
import { X, CalendarPlus, Video, MapPin, User, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Application, User as UserModel } from '../../types';
import { api } from '../../api/client';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  initialApplication?: Application | null;
  currentUser: UserModel | null;
  onInterviewScheduled: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  applications,
  initialApplication,
  currentUser,
  onInterviewScheduled
}) => {
  const [appId, setAppId] = useState<string>('');
  const [interviewerName, setInterviewerName] = useState('Rahul Verma (Engineering Manager)');
  const [interviewerEmail, setInterviewerEmail] = useState('rahul.verma@recruitment.internal');
  
  // Default to tomorrow 11:00 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(11, 0, 0, 0);
  const defaultDateTime = tomorrow.toISOString().slice(0, 16);

  const [scheduledAt, setScheduledAt] = useState(defaultDateTime);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [interviewMode, setInterviewMode] = useState('GOOGLE_MEET');
  const [venueOrLink, setVenueOrLink] = useState('');
  const [instructions, setInstructions] = useState('Please have your code repository or resume portfolio accessible.');
  
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialApplication) {
      setAppId(initialApplication.id);
    } else if (applications.length > 0 && !appId) {
      setAppId(applications[0].id);
    }
  }, [initialApplication, applications]);

  // Real-time conflict checking
  useEffect(() => {
    if (!interviewerName || !scheduledAt) return;

    const checkConflict = async () => {
      setIsCheckingConflict(true);
      try {
        const res = await api.checkAvailability(interviewerName, new Date(scheduledAt).toISOString(), durationMinutes);
        if (!res.is_available) {
          setConflictWarning(res.conflict_reason);
        } else {
          setConflictWarning(null);
        }
      } catch (err) {
        // ignore
      } finally {
        setIsCheckingConflict(false);
      }
    };

    const timeout = setTimeout(checkConflict, 400);
    return () => clearTimeout(timeout);
  }, [interviewerName, scheduledAt, durationMinutes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) {
      alert('Please select an applicant to schedule an interview with.');
      return;
    }

    if (conflictWarning) {
      if (!confirm(`Warning: ${conflictWarning}\nDo you still want to proceed with double-booking?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.scheduleInterview({
        application_id: appId,
        interviewer_name: interviewerName,
        interviewer_email: interviewerEmail,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: Number(durationMinutes),
        interview_mode: interviewMode,
        meeting_link_or_venue: venueOrLink.trim() || undefined,
        special_instructions: instructions.trim() || undefined
      });

      onInterviewScheduled();
      onClose();
      alert('Interview successfully scheduled and calendar invitation generated!');
    } catch (err: any) {
      alert(`Error scheduling interview: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Schedule Candidate Interview</h3>
              <p className="text-xs text-slate-500">Auto-generates meeting links, calendar (.ics) files, and notifications</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Candidate</label>
            <select
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-semibold"
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.candidate.full_name} ({app.job_title}) - Score: {app.suitability_score || 'N/A'}/100
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Interviewer Name</label>
              <select
                value={interviewerName}
                onChange={(e) => {
                  setInterviewerName(e.target.value);
                  if (e.target.value.includes('Rahul')) {
                    setInterviewerEmail('rahul.verma@recruitment.internal');
                  } else {
                    setInterviewerEmail('priya.sharma@recruitment.internal');
                  }
                }}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              >
                <option value="Rahul Verma (Engineering Manager)">Rahul Verma (Eng Manager)</option>
                <option value="Priya Sharma (HR Lead)">Priya Sharma (HR Lead)</option>
                <option value="Vikram Seth (Product Director)">Vikram Seth (Product Dir)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Interviewer Email</label>
              <input
                type="email"
                value={interviewerEmail}
                onChange={(e) => setInterviewerEmail(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              >
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes (Standard)</option>
                <option value={60}>60 Minutes (Deep Dive)</option>
              </select>
            </div>
          </div>

          {/* Conflict Alert Warning */}
          {conflictWarning && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Interviewer Schedule Collision:</span>
                <p className="mt-0.5 text-amber-800">{conflictWarning}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Interview Mode</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'GOOGLE_MEET', label: 'Google Meet' },
                { id: 'ZOOM', label: 'Zoom' },
                { id: 'MS_TEAMS', label: 'MS Teams' },
                { id: 'IN_PERSON', label: 'In-Person' },
              ].map(m => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setInterviewMode(m.id)}
                  className={`py-2 px-1 text-center text-xs font-semibold rounded-lg border transition-all ${
                    interviewMode === m.id
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Meeting Link or Physical Venue (Leave blank to auto-generate)
            </label>
            <input
              type="text"
              value={venueOrLink}
              onChange={(e) => setVenueOrLink(e.target.value)}
              placeholder="e.g. https://meet.google.com/... or HQ Office 3rd Floor"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Special Instructions for Candidate</label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm & Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


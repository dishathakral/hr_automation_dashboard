import React, { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Calendar,
  Layers,
  FileText,
  Clock,
  Sparkles,
  PhoneCall,
  CalendarPlus,
  History,
  CheckCircle2,
  AlertTriangle,
  Upload
} from 'lucide-react';
import { Application, User, ConsentRecord } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { ScoreBadge } from '../shared/ScoreBadge';
import { api } from '../../api/client';

interface CandidateDrawerProps {
  application: Application | null;
  onClose: () => void;
  currentUser: User | null;
  onOpenCalling: (app: Application) => void;
  onOpenSchedule: (app: Application) => void;
  onTriggerScreening: (appId: string) => void;
}

export const CandidateDrawer: React.FC<CandidateDrawerProps> = ({
  application,
  onClose,
  currentUser,
  onOpenCalling,
  onOpenSchedule,
  onTriggerScreening
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'timeline' | 'resume' | 'consent'>('profile');
  const [history, setHistory] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [resumes, setResumes] = useState<any[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadCandidateDetails = async () => {
    if (!application) return;
    setIsLoading(true);
    try {
      const [histData, timeData, resData, consData] = await Promise.all([
        api.getCandidateHistory(application.candidate_id),
        api.getCandidateTimeline(application.candidate_id),
        api.getResumes(application.candidate_id),
        api.getConsentHistory(application.candidate.phone_normalized)
      ]);
      setHistory(histData.applications || []);
      setTimeline(timeData.events || []);
      setResumes(resData || []);
      setConsents(consData || []);
    } catch (err) {
      console.error('Error loading candidate metadata:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCandidateDetails();
  }, [application]);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !application) return;
    setIsUploadingResume(true);
    try {
      await api.uploadResume(application.candidate_id, file);
      await loadCandidateDetails();
      alert('Resume uploaded and parsed successfully!');
    } catch (err: any) {
      alert(`Resume upload failed: ${err.message}`);
    } finally {
      setIsUploadingResume(false);
    }
  };

  if (!application) return null;
  const cand = application.candidate;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{cand.full_name}</h2>
                <StatusBadge status={application.category} type="category" />
                {cand.is_duplicate && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    Duplicate Applicant
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Applied for <span className="font-semibold text-slate-800">{application.job_title}</span> • Ingested via {application.source}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Contact Bar */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-600 pt-3 border-t border-slate-200/60">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
              <span className="font-mono">{cand.phone_normalized}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{cand.email}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{cand.current_city}</span>
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-5 border-b border-slate-200 overflow-x-auto">
            {[
              { id: 'profile', label: 'Evaluation Profile' },
              { id: 'history', label: `History (${history.length})` },
              { id: 'timeline', label: `Timeline (${timeline.length})` },
              { id: 'resume', label: `Resumes (${resumes.length})` },
              { id: 'consent', label: 'Consent & DND' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Profile & AI Evaluation */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Suitability Score Summary */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Suitability Score</span>
                  <div className="mt-1 flex items-center gap-2">
                    <ScoreBadge score={application.suitability_score} size="lg" />
                    <span className="text-xs font-medium text-slate-600">
                      Recommendation: <strong>{application.screening_status || 'Pending Review'}</strong>
                    </span>
                  </div>
                </div>
                {currentUser?.role === 'HR_ADMIN' && !application.suitability_score && (
                  <button
                    onClick={() => onTriggerScreening(application.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                  >
                    Run AI Screening
                  </button>
                )}
              </div>

              {/* Work & Qualifications */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-slate-100 bg-white">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Experience Tenure</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{cand.total_experience_years} Years</p>
                  <p className="text-xs text-slate-500">{cand.current_title || 'Professional'}</p>
                </div>
                <div className="p-3.5 rounded-lg border border-slate-100 bg-white">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Education Qualification</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{cand.highest_education || 'N/A'}</p>
                  <p className="text-xs text-slate-500">Verified credentials</p>
                </div>
              </div>

              {/* Skills Overlap */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Verified Skillset</h4>
                <div className="flex flex-wrap gap-1.5">
                  {cand.skills && cand.skills.map((skill, i) => (
                    <span key={i} className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md">
                      {skill}
                    </span>
                  ))}
                  {(!cand.skills || cand.skills.length === 0) && (
                    <span className="text-xs text-slate-400">No skills parsed</span>
                  )}
                </div>
              </div>

              {/* Category Reason Box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Classification Rationale</span>
                <p className="text-xs text-slate-700 leading-relaxed">{application.category_reason}</p>
              </div>
            </div>
          )}

          {/* TAB 2: Multi-Job Application History */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                All vacancy applications submitted by <span className="font-semibold text-slate-700">{cand.full_name}</span> across the organization.
              </p>
              <div className="space-y-3">
                {history.map((appItem, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900">{appItem.job_title}</h4>
                      <StatusBadge status={appItem.category} type="category" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>Applied: {new Date(appItem.applied_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Stage: <strong>{appItem.stage}</strong></span>
                      {appItem.suitability_score && (
                        <>
                          <span>•</span>
                          <span>Score: <strong>{appItem.suitability_score}/100</strong></span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                      {appItem.category_reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Activity Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Audit event log of candidate intake, screening runs, outreach calls, and interview booking.
              </p>
              <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timeline.map((evt, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{evt.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(evt.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Resume & Documents */}
          {activeTab === 'resume' && (
            <div className="space-y-4">
              {currentUser?.role === 'HR_ADMIN' && (
                <div className="p-4 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Upload & Parse Candidate Resume</p>
                    <p className="text-[11px] text-slate-500">Supports .txt, .pdf, .doc — automatically extracts matching skills</p>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingResume ? 'Parsing...' : 'Upload Resume'}</span>
                    <input type="file" accept=".txt,.pdf,.doc,.docx,.md" onChange={handleResumeUpload} className="hidden" />
                  </label>
                </div>
              )}

              {resumes.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                  <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No raw resume file attached</p>
                  <p className="text-[11px] text-slate-400 mt-1">Upload a resume above to extract text and skills.</p>
                </div>
              ) : (
                resumes.map((res, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{res.file_name}</p>
                          <p className="text-[10px] text-slate-400">{Math.round(res.file_size_bytes / 1024)} KB • Uploaded {new Date(res.uploaded_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-60 overflow-y-auto font-mono text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {res.parsed_text}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: Consent & DND Compliance */}
          {activeTab === 'consent' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700">Phone Number: <span className="font-mono">{cand.phone_normalized}</span></span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Current Status: <strong>{consents[0]?.consent_status || 'NO_RECORD'}</strong>
                  </p>
                </div>
                {currentUser?.role === 'HR_ADMIN' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await api.recordConsent(cand.phone_normalized, cand.id, 'APPLICATION_FORM');
                        await loadCandidateDetails();
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg"
                    >
                      Grant Consent
                    </button>
                    <button
                      onClick={async () => {
                        await api.optOutPhone(cand.phone_normalized, 'Consent withdrawn by HR/Candidate via Drawer');
                        await loadCandidateDetails();
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg"
                    >
                      Withdraw / Opt-Out
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {consents.map((rec) => (
                  <div key={rec.id} className="p-3 rounded-lg border border-slate-200 bg-white text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{rec.consent_status.replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-slate-500">
                        Channel: {rec.consent_channel} • Terms: {rec.terms_version}
                      </p>
                      {rec.opt_out_reason && <p className="text-[11px] text-rose-600 mt-0.5">{rec.opt_out_reason}</p>}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(rec.opt_out_timestamp || rec.recorded_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          {currentUser?.role === 'HR_ADMIN' && (
            <>
              <button
                onClick={() => onOpenCalling(application)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Simulate Call</span>
              </button>
              <button
                onClick={() => onOpenSchedule(application)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm shadow-purple-500/20"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Schedule Interview</span>
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  PhoneCall,
  CalendarPlus,
  Sliders,
  ChevronDown,
  Layers
} from 'lucide-react';
import { Application, ScreeningResult, User } from '../types';
import { ScoreBadge } from '../components/shared/ScoreBadge';
import { StatusBadge } from '../components/shared/StatusBadge';
import { api } from '../api/client';

interface ScreeningPageProps {
  applications: Application[];
  currentUser: User | null;
  onRefreshApplications: () => void;
  onOpenCalling: (app: Application) => void;
  onOpenSchedule: (app: Application) => void;
}

export const ScreeningPage: React.FC<ScreeningPageProps> = ({
  applications,
  currentUser,
  onRefreshApplications,
  onOpenCalling,
  onOpenSchedule
}) => {
  const [selectedApp, setSelectedApp] = useState<Application | null>(applications[0] || null);
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideDecision, setOverrideDecision] = useState<'SHORTLISTED' | 'ON_HOLD' | 'NOT_SHORTLISTED'>('SHORTLISTED');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  React.useEffect(() => {
    if (!selectedApp && applications.length > 0) {
      setSelectedApp(applications[0]);
    }
  }, [applications, selectedApp]);

  // Load screening result when selected application changes
  React.useEffect(() => {
    if (!selectedApp) return;

    const fetchResult = async () => {
      setIsLoading(true);
      try {
        const res = await api.getScreeningResult(selectedApp.id);
        setScreeningResult(res);
      } catch (e) {
        // If not yet screened
        setScreeningResult(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResult();
  }, [selectedApp]);

  const handleRunScreening = async (appId: string) => {
    setIsLoading(true);
    try {
      const res = await api.evaluateCandidate(appId);
      setScreeningResult(res);
      onRefreshApplications();
    } catch (err: any) {
      alert(`Screening error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchScreen = async () => {
    if (!selectedApp?.job_id) return;
    setIsLoading(true);
    try {
      const res = await api.evaluateBatch(selectedApp.job_id);
      alert(`Batch screening finished! Evaluated ${res.screened_total} applications.`);
      onRefreshApplications();
    } catch (err: any) {
      alert(`Error in batch screening: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDecision = async () => {
    if (!selectedApp) return;
    const aiStatus = screeningResult?.ai_recommended_status;
    const isOverride = aiStatus !== overrideDecision;

    if (isOverride && !overrideReason.trim()) {
      alert('Mandatory Requirement: Please provide a clear recruiter justification for overriding the AI recommendation.');
      return;
    }

    setIsSubmittingDecision(true);
    try {
      await api.recordHRDecision(
        selectedApp.id,
        overrideDecision,
        overrideReason.trim(),
        'HR verified scorecard and confirmed final decision'
      );
      setOverrideModalOpen(false);
      setOverrideReason('');
      const refreshed = await api.getScreeningResult(selectedApp.id);
      setScreeningResult(refreshed);
      onRefreshApplications();
      alert(`Decision recorded! Candidate status updated to ${overrideDecision}.`);
    } catch (err: any) {
      alert(`Error recording decision: ${err.message}`);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Candidate Screening Co-Pilot</h2>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">Task 3</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Explainable 4-pillar scoring engine with mandatory Human-in-the-Loop decision governance. AI never auto-rejects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => api.downloadDeliverable('filtered-database', 'Deliverable_3_Filtered_Candidate_Database.csv').catch((e) => alert(e.message))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Shortlist (CSV)</span>
          </button>

          {currentUser?.role === 'HR_ADMIN' && selectedApp?.job_id && (
            <button
              onClick={handleBatchScreen}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Batch Screen All</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split Grid: Candidate Selector & Detailed Scorecard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Candidate List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[750px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Candidate Pool</span>
            <span className="text-xs font-semibold text-slate-500">{applications.length} candidates</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {applications.map((app) => {
              const isSelected = selectedApp?.id === app.id;
              return (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`w-full p-4 text-left transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-blue-50/80 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {app.candidate.full_name}
                    </span>
                    <ScoreBadge score={app.suitability_score} size="sm" />
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{app.job_title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={app.category} type="category" />
                    <span className="text-[10px] text-slate-400">{app.candidate.total_experience_years} yrs exp</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Explainable AI Scorecard (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between h-[750px] overflow-y-auto">
          {selectedApp ? (
            <div className="space-y-6">
              {/* Scorecard Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-900">{selectedApp.candidate.full_name}</h3>
                    <StatusBadge status={selectedApp.category} type="category" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Requisition: <span className="font-semibold text-slate-800">{selectedApp.job_title}</span> • City: {selectedApp.candidate.current_city}
                  </p>
                </div>

                <div className="text-right">
                  <ScoreBadge score={screeningResult?.suitability_score} size="lg" />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Engine: {screeningResult?.engine_used || 'Local Rule-Based'}
                  </p>
                </div>
              </div>

              {!screeningResult ? (
                <div className="p-12 text-center space-y-3">
                  <BrainCircuit className="w-12 h-12 text-blue-400 mx-auto animate-pulse" />
                  <h4 className="font-bold text-sm text-slate-800">Awaiting AI Evaluation</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Compare qualifications, verified skills, and experience tenure against requisition weights.
                  </p>
                  {currentUser?.role === 'HR_ADMIN' && (
                    <button
                      onClick={() => handleRunScreening(selectedApp.id)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'Screening Candidate...' : 'Execute AI Screening'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 4-Pillar Breakdown Bars */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                      4-Pillar Weighted Score Breakdown
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 space-y-1">
                        <span className="text-[11px] font-semibold text-blue-700">Skills Overlap (40%)</span>
                        <p className="text-lg font-bold text-blue-950 tabular-nums">{screeningResult.skills_score} / 40</p>
                      </div>
                      <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 space-y-1">
                        <span className="text-[11px] font-semibold text-indigo-700">Experience Fit (30%)</span>
                        <p className="text-lg font-bold text-indigo-950 tabular-nums">{screeningResult.experience_score} / 30</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-100 space-y-1">
                        <span className="text-[11px] font-semibold text-purple-700">Education (15%)</span>
                        <p className="text-lg font-bold text-purple-950 tabular-nums">{screeningResult.education_score} / 15</p>
                      </div>
                      <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-100 space-y-1">
                        <span className="text-[11px] font-semibold text-teal-700">Location/Logistics (15%)</span>
                        <p className="text-lg font-bold text-teal-950 tabular-nums">{screeningResult.logistics_score} / 15</p>
                      </div>
                    </div>
                  </div>

                  {/* Clear Explanation */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">AI Evaluation Rationale</span>
                    <p className="text-xs text-slate-800 leading-relaxed">{screeningResult.clear_explanation}</p>
                  </div>

                  {/* Strengths & Missing Skills */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Key Matching Strengths</span>
                      </div>
                      <ul className="text-xs text-emerald-950 space-y-1.5 list-disc pl-4">
                        {screeningResult.matching_strengths.map((str, i) => (
                          <li key={i}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Concerns / Gaps */}
                    <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Potential Concerns / Missing Skills</span>
                      </div>
                      <ul className="text-xs text-amber-950 space-y-1.5 list-disc pl-4">
                        {screeningResult.missing_skills.length > 0 && (
                          <li>Missing Skills: {screeningResult.missing_skills.join(', ')}</li>
                        )}
                        {screeningResult.potential_concerns.map((con, i) => (
                          <li key={i}>{con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Suggested Screening Call Questions */}
                  <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <span>Suggested Interview / Screening Questions</span>
                    </div>
                    <ol className="text-xs text-blue-950 space-y-1 list-decimal pl-4">
                      {screeningResult.suggested_interview_questions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <BrainCircuit className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">Select a candidate to inspect scorecard</p>
            </div>
          )}

          {/* Decision Governance Footer */}
          {selectedApp && screeningResult && (
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-700">
                    AI Recommendation: <strong className="text-blue-700">{screeningResult.ai_recommended_status}</strong>
                  </span>
                  {screeningResult.hr_final_status && (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      screeningResult.is_override
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      HR Decision: {screeningResult.hr_final_status}{screeningResult.is_override ? ' (Override)' : ''}
                    </span>
                  )}
                </div>
                {screeningResult.is_override && screeningResult.override_reason && (
                  <p className="text-[11px] text-amber-800 pl-6">
                    Override Rationale: {screeningResult.override_reason}
                  </p>
                )}
              </div>

              {currentUser?.role === 'HR_ADMIN' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setOverrideDecision(screeningResult.ai_recommended_status);
                      setOverrideModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    Accept Recommendation
                  </button>
                  <button
                    onClick={() => {
                      setOverrideDecision(screeningResult.ai_recommended_status === 'SHORTLISTED' ? 'ON_HOLD' : 'SHORTLISTED');
                      setOverrideModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Review / Override
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Human-in-the-Loop Override Modal */}
      {overrideModalOpen && selectedApp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="font-bold text-base text-slate-900">Record Final Recruiter Decision</h3>
              <p className="text-xs text-slate-500 mt-1">
                Candidate: <span className="font-semibold text-slate-800">{selectedApp.candidate.full_name}</span> (AI Recommended: {screeningResult?.ai_recommended_status})
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Final Status</label>
                <select
                  value={overrideDecision}
                  onChange={(e) => setOverrideDecision(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-semibold"
                >
                  <option value="SHORTLISTED">Shortlisted (Proceed to Call)</option>
                  <option value="ON_HOLD">On Hold (Keep in Pool)</option>
                  <option value="NOT_SHORTLISTED">Not Shortlisted (Archive)</option>
                </select>
              </div>

              {overrideDecision !== screeningResult?.ai_recommended_status && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Override Justification <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Provide mandatory explanation why recruiter decision deviates from the AI score..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    This reason is recorded in the compliance audit trail.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDecision}
                disabled={isSubmittingDecision || (overrideDecision !== screeningResult?.ai_recommended_status && !overrideReason.trim())}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
              >
                {isSubmittingDecision ? 'Saving...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


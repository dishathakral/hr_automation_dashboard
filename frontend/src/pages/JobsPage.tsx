import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  ExternalLink,
  Sliders,
  Calendar,
  MapPin,
  IndianRupee,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  Edit3
} from 'lucide-react';
import { Job, User } from '../types';
import { StatusBadge } from '../components/shared/StatusBadge';
import { api } from '../api/client';

interface JobsPageProps {
  jobs: Job[];
  currentUser: User | null;
  onRefreshJobs: () => void;
  onOpenCreateJob: () => void;
  onFilterByJob: (jobId: string) => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({
  jobs,
  currentUser,
  onRefreshJobs,
  onOpenCreateJob,
  onFilterByJob
}) => {
  const [editingWeightsJob, setEditingWeightsJob] = useState<Job | null>(null);
  const [weights, setWeights] = useState({ skills: 40, experience: 30, education: 15, logistics: 15 });
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [editIndeedUrl, setEditIndeedUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEditJob = (job: Job) => {
    setEditingJob(job);
    setEditStatus(job.status);
    setEditIndeedUrl(job.indeed_post_url || '');
  };

  const handleSaveJobEdit = async () => {
    if (!editingJob) return;
    setIsSaving(true);
    try {
      await api.updateJob(editingJob.id, {
        status: editStatus as any,
        indeed_post_url: editIndeedUrl.trim() || undefined,
        is_demo: !editIndeedUrl.trim()
      });
      setEditingJob(null);
      onRefreshJobs();
    } catch (err: any) {
      alert(`Error updating job: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenWeights = (job: Job) => {
    setEditingWeightsJob(job);
    setWeights(job.screening_weights || { skills: 40, experience: 30, education: 15, logistics: 15 });
  };

  const handleSaveWeights = async () => {
    if (!editingWeightsJob) return;
    const total = weights.skills + weights.experience + weights.education + weights.logistics;
    if (total !== 100) {
      alert(`Weights must sum to exactly 100% (currently ${total}%).`);
      return;
    }

    setIsSaving(true);
    try {
      await api.updateJob(editingWeightsJob.id, {
        screening_weights: weights
      });
      setEditingWeightsJob(null);
      onRefreshJobs();
    } catch (err: any) {
      alert(`Error updating weights: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Indeed Job Postings & Tracker</h2>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">Task 1</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Publish and track job openings with complete descriptions, salary bands, and configurable AI screening weights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => api.downloadDeliverable('indeed-tracker', 'Deliverable_1_Indeed_Posting_Tracker.csv').catch((e) => alert(e.message))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Tracker (CSV)</span>
          </button>

          {currentUser?.role === 'HR_ADMIN' && (
            <button
              onClick={onOpenCreateJob}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Vacancy</span>
            </button>
          )}
        </div>
      </div>

      {/* Transparency Note */}
      <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-900">
          <span className="font-bold">Transparent Demonstration Safeguard:</span> Preloaded vacancies are marked as <strong>Sample Requisitions</strong> for compliance with Indeed's terms. External reference IDs (e.g. <code className="font-mono bg-purple-100 px-1 py-0.5 rounded">IND-DEMO-2026-ENG01</code>) are tracked without fake live URLs.
        </div>
      </div>

      {/* Jobs Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <StatusBadge status={job.is_demo ? 'DEMO' : 'LIVE'} type="demo" />
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  {job.status}
                </span>
              </div>

              <h3 className="font-bold text-base text-slate-900 tracking-tight leading-snug">
                {job.title}
              </h3>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{job.department}</span>
                <span>•</span>
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{job.location} ({job.work_model})</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold mt-2">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                <span>₹{(job.salary_min / 100000).toFixed(1)}L - ₹{(job.salary_max / 100000).toFixed(1)}L / yr</span>
                <span>•</span>
                <span>{job.experience_level}</span>
              </div>

              <p className="text-xs text-slate-600 line-clamp-3 mt-3 leading-relaxed">
                {job.job_description}
              </p>

              {/* Skills Tags */}
              <div className="flex flex-wrap gap-1 mt-3">
                {job.required_skills.slice(0, 4).map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                  >
                    {skill}
                  </span>
                ))}
                {job.required_skills.length > 4 && (
                  <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                    +{job.required_skills.length - 4} more
                  </span>
                )}
              </div>
            </div>

            {/* Requisition Card Footer */}
            <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{job.posted_at ? new Date(job.posted_at).toLocaleDateString() : 'Draft'}</span>
                </span>
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {job.applicant_count} Applicants
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onFilterByJob(job.id)}
                  className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-center"
                >
                  View Applicants
                </button>
                {currentUser?.role === 'HR_ADMIN' && (
                  <>
                    <button
                      onClick={() => handleOpenEditJob(job)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      title="Edit Job Status / Indeed Link"
                    >
                      <Edit3 className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleOpenWeights(job)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      title="Configure AI Screening Weights"
                    >
                      <Sliders className="w-4 h-4 text-slate-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configurable Screening Weights Modal */}
      {editingWeightsJob && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="font-bold text-base text-slate-900">Configure AI Screening Weights</h3>
              <p className="text-xs text-slate-500 mt-1">
                Adjust criteria weightings for <span className="font-semibold text-slate-700">{editingWeightsJob.title}</span>. Total must equal 100%.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Skills Overlap Fit</span>
                  <span className="text-blue-600">{weights.skills}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="70"
                  value={weights.skills}
                  onChange={(e) => setWeights({ ...weights, skills: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Experience Tenure Relevance</span>
                  <span className="text-blue-600">{weights.experience}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={weights.experience}
                  onChange={(e) => setWeights({ ...weights, experience: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Education & Credentials</span>
                  <span className="text-blue-600">{weights.education}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights.education}
                  onChange={(e) => setWeights({ ...weights, education: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Location & Work Model Alignment</span>
                  <span className="text-blue-600">{weights.logistics}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights.logistics}
                  onChange={(e) => setWeights({ ...weights, logistics: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Total indicator */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Total Sum:</span>
                <span className={weights.skills + weights.experience + weights.education + weights.logistics === 100 ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}>
                  {weights.skills + weights.experience + weights.education + weights.logistics}% / 100%
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingWeightsJob(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWeights}
                disabled={isSaving || weights.skills + weights.experience + weights.education + weights.logistics !== 100}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
              >
                {isSaving ? 'Saving...' : 'Save Weights'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Status & Indeed Reference Modal */}
      {editingJob && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Update Vacancy Status & Indeed Reference</h3>
              <p className="text-xs text-slate-500 mt-1">{editingJob.title}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Posting Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active (Published / Accepting Applicants)</option>
                  <option value="PAUSED">Paused</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Live Indeed URL (Leave blank if Sample / Demo Requisition)
                </label>
                <input
                  type="url"
                  value={editIndeedUrl}
                  onChange={(e) => setEditIndeedUrl(e.target.value)}
                  placeholder="https://in.indeed.com/viewjob?jk=..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingJob(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveJobEdit}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


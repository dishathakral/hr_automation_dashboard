import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { Application, CandidateCategory, User, Job } from '../types';
import { StatusBadge } from '../components/shared/StatusBadge';
import { ScoreBadge } from '../components/shared/ScoreBadge';
import { api } from '../api/client';

interface ApplicantsPageProps {
  applications: Application[];
  currentUser: User | null;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onSelectCandidate: (app: Application) => void;
  onOpenCalling: (app: Application) => void;
  onOpenSchedule: (app: Application) => void;
  onOpenManualEntry: () => void;
  onOpenImport: () => void;
  onRefreshApplications: () => void;
}

export const ApplicantsPage: React.FC<ApplicantsPageProps> = ({
  applications,
  currentUser,
  selectedCategory,
  setSelectedCategory,
  onSelectCandidate,
  onOpenCalling,
  onOpenSchedule,
  onOpenManualEntry,
  onOpenImport,
  onRefreshApplications
}) => {
  const [editingCategoryApp, setEditingCategoryApp] = useState<Application | null>(null);
  const [newCat, setNewCat] = useState<string>('RELEVANT_SUITABLE');
  const [catReason, setCatReason] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const categories: { id: string; label: string; count: number }[] = [
    { id: '', label: 'All Applicants', count: applications.length },
    { id: 'RELEVANT_SUITABLE', label: 'Relevant / Suitable', count: applications.filter(a => a.category === 'RELEVANT_SUITABLE').length },
    { id: 'EXPERIENCED', label: 'Experienced', count: applications.filter(a => a.category === 'EXPERIENCED').length },
    { id: 'PARTIALLY_RELEVANT', label: 'Partially Relevant', count: applications.filter(a => a.category === 'PARTIALLY_RELEVANT').length },
    { id: 'FRESHER', label: 'Fresher', count: applications.filter(a => a.category === 'FRESHER').length },
    { id: 'NOT_RELEVANT', label: 'Not Relevant', count: applications.filter(a => a.category === 'NOT_RELEVANT').length },
    { id: 'INCOMPLETE_PROFILE', label: 'Incomplete Profile', count: applications.filter(a => a.category === 'INCOMPLETE_PROFILE').length },
  ];

  const filteredApps = applications.filter(app => {
    if (selectedCategory && app.category !== selectedCategory) return false;
    return true;
  });

  const handleOpenEditCategory = (app: Application) => {
    setEditingCategoryApp(app);
    setNewCat(app.category);
    setCatReason(app.category_reason);
  };

  const handleSaveCategory = async () => {
    if (!editingCategoryApp || !catReason.trim()) {
      alert('Please provide a specific job-related reason for updating the candidate category.');
      return;
    }

    setIsUpdating(true);
    try {
      await api.updateCategory(editingCategoryApp.id, newCat, catReason.trim());
      setEditingCategoryApp(null);
      onRefreshApplications();
    } catch (err: any) {
      alert(`Error updating category: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Applicant Central Database</h2>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">Task 2</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Maintain central talent pool with deduplication, contact verification, and 6-tier assignment taxonomy.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => api.downloadDeliverable('applicant-summary', 'Deliverable_2_Applicant_Categorisation_Summary.csv').catch((e) => alert(e.message))}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Summary (CSV)</span>
          </button>

          {currentUser?.role === 'HR_ADMIN' && (
            <>
              <button
                onClick={onOpenImport}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Import Indeed</span>
              </button>
              <button
                onClick={onOpenManualEntry}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Candidate</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 6-Tier Taxonomy Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Applicants Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Candidate & Contact</th>
                <th className="py-3 px-4">Job Requisition</th>
                <th className="py-3 px-4">Tenure & Education</th>
                <th className="py-3 px-4">Assigned Category</th>
                <th className="py-3 px-4">AI Score</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No applicants match this filter criteria</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try clearing the category filter or importing Indeed records.</p>
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectCandidate(app)}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                        >
                          {app.candidate.full_name}
                        </button>
                        {app.candidate.is_duplicate && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1 rounded">
                            Duplicate
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono text-slate-600">{app.candidate.phone_normalized}</span>
                        <span>•</span>
                        <span>{app.candidate.current_city}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800 truncate max-w-[200px]">{app.job_title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Source: {app.source}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{app.candidate.total_experience_years} yrs exp</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{app.candidate.highest_education || 'N/A'}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.category} type="category" />
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 max-w-[200px]" title={app.category_reason}>
                        {app.category_reason}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <ScoreBadge score={app.suitability_score} />
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.stage} type="stage" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectCandidate(app)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          Inspect
                        </button>
                        {currentUser?.role === 'HR_ADMIN' && (
                          <button
                            onClick={() => handleOpenEditCategory(app)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                            title="Edit Category & Reason"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Category Modal */}
      {editingCategoryApp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div>
              <h3 className="font-bold text-base text-slate-900">Update Candidate Classification</h3>
              <p className="text-xs text-slate-500 mt-1">
                Assign one of the six standard tiers for <span className="font-semibold text-slate-800">{editingCategoryApp.candidate.full_name}</span>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Category</label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-medium"
                >
                  <option value="RELEVANT_SUITABLE">Relevant / Suitable</option>
                  <option value="PARTIALLY_RELEVANT">Partially Relevant</option>
                  <option value="NOT_RELEVANT">Not Relevant</option>
                  <option value="EXPERIENCED">Experienced</option>
                  <option value="FRESHER">Fresher</option>
                  <option value="INCOMPLETE_PROFILE">Incomplete Profile</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job-Related Rationale <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={catReason}
                  onChange={(e) => setCatReason(e.target.value)}
                  placeholder="Explain why this candidate belongs in this tier based on skills, experience, or qualifications..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingCategoryApp(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={isUpdating || !catReason.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
              >
                {isUpdating ? 'Saving...' : 'Update Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


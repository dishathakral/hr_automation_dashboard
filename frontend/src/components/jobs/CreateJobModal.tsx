import React, { useState } from 'react';
import { X, Briefcase, Plus, Sparkles, Building, MapPin, IndianRupee } from 'lucide-react';
import { api } from '../../api/client';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: () => void;
}

export const CreateJobModal: React.FC<CreateJobModalProps> = ({ isOpen, onClose, onJobCreated }) => {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [location, setLocation] = useState('Bangalore, Karnataka');
  const [workModel, setWorkModel] = useState('HYBRID');
  const [experienceLevel, setExperienceLevel] = useState('3 - 5 Years');
  const [salaryMin, setSalaryMin] = useState(1200000);
  const [salaryMax, setSalaryMax] = useState(1800000);
  const [jobDescription, setJobDescription] = useState('');
  const [skillsStr, setSkillsStr] = useState('React, TypeScript, Node.js, SQL');
  const [isDemo, setIsDemo] = useState(true);
  const [indeedPostUrl, setIndeedPostUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !jobDescription.trim()) {
      alert('Please fill out the job title and description.');
      return;
    }
    if (!isDemo && !indeedPostUrl.trim()) {
      alert('Please enter your genuine published Indeed URL or mark as Sample / Demo Requisition.');
      return;
    }

    const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
    const refId = isDemo
      ? `IND-DEMO-2026-${Math.floor(100 + Math.random() * 900)}`
      : `IND-LIVE-2026-${Math.floor(100 + Math.random() * 900)}`;

    setIsSubmitting(true);
    try {
      await api.createJob({
        title: title.trim(),
        department,
        employment_type: employmentType as any,
        location,
        work_model: workModel as any,
        experience_level: experienceLevel,
        salary_min: Number(salaryMin),
        salary_max: Number(salaryMax),
        currency: 'INR',
        job_description: jobDescription.trim(),
        required_skills: skills,
        preferred_skills: ['Communication', 'Teamwork'],
        screening_weights: { skills: 40, experience: 30, education: 15, logistics: 15 },
        status: 'ACTIVE',
        is_demo: isDemo,
        indeed_reference_id: refId,
        indeed_post_url: !isDemo && indeedPostUrl.trim() ? indeedPostUrl.trim() : undefined
      });

      onJobCreated();
      onClose();
      alert(`Job requisition created! Tracked as ${refId}.`);
    } catch (err: any) {
      alert(`Error creating job: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Post New Job Vacancy</h3>
              <p className="text-xs text-slate-500">Track requisition on Indeed with configurable criteria</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer (Python / FastAPI)"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product & Design">Product & Design</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Sales & Growth">Sales & Growth</option>
                <option value="Operations">Operations</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              >
                <option value="FULL_TIME">Full-Time</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bangalore, Karnataka"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Model</label>
              <select
                value={workModel}
                onChange={(e) => setWorkModel(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              >
                <option value="HYBRID">Hybrid</option>
                <option value="ON_SITE">On-site</option>
                <option value="REMOTE">Remote</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min Exp</label>
              <input
                type="text"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                placeholder="e.g. 3 - 5 Years"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min Salary (₹)</label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Salary (₹)</label>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Required Core Skills (comma-separated)
            </label>
            <input
              type="text"
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              placeholder="e.g. React, TypeScript, Python, FastAPI, SQL"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Description & Responsibilities <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Outline role responsibilities, deliverables, and team dynamics..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isDemo}
                onChange={(e) => setIsDemo(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span>Sample / Demo Requisition (Not published to live Indeed)</span>
            </label>
            {!isDemo && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Genuine Indeed Job URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required={!isDemo}
                  value={indeedPostUrl}
                  onChange={(e) => setIndeedPostUrl(e.target.value)}
                  placeholder="https://in.indeed.com/viewjob?jk=..."
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 font-mono"
                />
              </div>
            )}
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Vacancy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


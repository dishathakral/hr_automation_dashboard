import React, { useState } from 'react';
import { X, UserPlus, Phone, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Job } from '../../types';
import { api } from '../../api/client';

interface ManualApplicantModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  onApplicantCreated: () => void;
}

export const ManualApplicantModal: React.FC<ManualApplicantModalProps> = ({
  isOpen,
  onClose,
  jobs,
  onApplicantCreated
}) => {
  const [jobId, setJobId] = useState(jobs[0]?.id || '');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneRaw, setPhoneRaw] = useState('+919876543210');
  const [city, setCity] = useState('Bangalore');
  const [title, setTitle] = useState('Software Engineer');
  const [expYears, setExpYears] = useState(3.5);
  const [education, setEducation] = useState('B.Tech in Computer Science');
  const [skillsStr, setSkillsStr] = useState('React, TypeScript, Node.js, SQL');
  const [resumeText, setResumeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phoneRaw.trim()) {
      alert('Please fill out candidate name, email, and mobile number.');
      return;
    }

    const skills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);

    setIsSubmitting(true);
    try {
      await api.createManualApplicant({
        job_id: jobId || jobs[0]?.id,
        full_name: fullName.trim(),
        email: email.trim(),
        phone_raw: phoneRaw.trim(),
        current_city: city.trim(),
        current_title: title.trim(),
        total_experience_years: Number(expYears),
        highest_education: education.trim(),
        skills,
        resume_text: resumeText.trim() || `Resume profile for ${fullName}. Technical experience: ${skills.join(', ')}.`
      });

      onApplicantCreated();
      onClose();
      alert(`Candidate ${fullName} successfully added and classified!`);
    } catch (err: any) {
      alert(`Error creating applicant: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Add Applicant Manually</h3>
              <p className="text-xs text-slate-500">Auto-normalizes Indian mobile numbers and assigns 6-tier classification</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Job Vacancy</label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-medium"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Aditi Sharma"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aditi@example.in"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number (+91) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={phoneRaw}
                onChange={(e) => setPhoneRaw(e.target.value)}
                placeholder="+919876543210"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bangalore, Mumbai, Delhi..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Current Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Frontend Dev"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Exp (Years)</label>
              <input
                type="number"
                step="0.1"
                value={expYears}
                onChange={(e) => setExpYears(Number(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Education</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="B.Tech, MBA..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Skills (comma-separated)
            </label>
            <input
              type="text"
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              placeholder="e.g. React, TypeScript, Node.js, REST APIs"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Resume Text Summary
            </label>
            <textarea
              rows={3}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste candidate resume overview or project highlights..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800"
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
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Job } from '../../types';
import { api } from '../../api/client';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  onImportComplete: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  jobs,
  onImportComplete
}) => {
  const [jobId, setJobId] = useState(jobs[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a CSV or JSON file to upload.');
      return;
    }
    if (!jobId) {
      alert('Please select a target job requisition.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.importIndeedApplications(file, jobId);
      setResult(res);
      onImportComplete();
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateSampleCSV = () => {
    const csvContent = `candidate_name,email,phone,city,title,experience_years,education,skills,resume_text
Sunil Varma,sunil.v@talent.in,+919810987654,Bangalore,Full Stack Developer,4.5,B.Tech,"React, Node.js, TypeScript, PostgreSQL","4.5 years developing web apps in React and Node."
Kavita Nair,kavita.n@recruit.in,+919820876543,Mumbai,HR Associate,2.0,MBA,"Talent Sourcing, Screening, ATS","2 years handling talent intake and interview coordination."
Amit Joshi,amit.j@salescorp.in,+919899765432,Delhi NCR,Inside Sales Executive,1.5,B.Com,"Lead Generation, Cold Calling, CRM","Qualifying B2B outbound prospects."`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Indeed_Applicant_Sample_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Import Indeed Applications</h3>
              <p className="text-xs text-slate-500">Supports Indeed CSV/Excel/JSON export files with auto-deduplication</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!result ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Vacancy Requisition</label>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-medium"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & Drop File Zone */}
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center space-y-2 bg-slate-50/50 transition-colors">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <label className="cursor-pointer">
                  <span className="text-xs font-bold text-blue-600 hover:underline">Click to upload</span>
                  <span className="text-xs text-slate-500"> or drag and drop</span>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">Supports CSV or JSON (up to 10MB)</p>
              </div>
              {file && (
                <div className="p-2 bg-blue-50 rounded text-xs font-semibold text-blue-800 truncate max-w-xs mx-auto">
                  Selected: {file.name}
                </div>
              )}
            </div>

            {/* Template Download Prompt */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">Need a sample Indeed CSV format?</span>
              <button
                type="button"
                onClick={handleCreateSampleCSV}
                className="font-semibold text-blue-600 hover:underline"
              >
                Download Sample CSV
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || !file}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm"
              >
                {isUploading ? 'Ingesting...' : 'Import Applications'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-base text-slate-900">{result.message}</h4>
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500">Total Ingested</span>
                <p className="text-base font-bold text-slate-900 mt-0.5">{result.imported_total}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500">Duplicates Detected</span>
                <p className="text-base font-bold text-amber-600 mt-0.5">{result.duplicates_detected}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setResult(null);
                setFile(null);
                onClose();
              }}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


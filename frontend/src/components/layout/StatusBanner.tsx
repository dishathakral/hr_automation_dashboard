import React from 'react';
import { ShieldCheck, PhoneCall, Cpu, Sparkles } from 'lucide-react';

export const StatusBanner: React.FC = () => {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="flex items-center gap-1.5 font-medium text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Workflow Automation Platform</span>
        </span>

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
          Indeed Posting Tracker: Demo Vacancies
        </span>

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
          <PhoneCall className="w-3 h-3 text-blue-600" />
          Telephony: Interactive Simulator Active (+91 TRAI Guard)
        </span>

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
          <Cpu className="w-3 h-3 text-emerald-600" />
          AI Engine: Local Privacy Engine (Zero External Leakage)
        </span>
      </div>

      <div className="flex items-center gap-2 text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
        <span>DPDP Act & TRAI Compliant</span>
      </div>
    </div>
  );
};


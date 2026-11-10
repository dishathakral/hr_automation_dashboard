import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'category' | 'stage' | 'call' | 'interview' | 'job' | 'demo';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'stage', className = '' }) => {
  let bg = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  // Demo vs Live
  if (type === 'demo' || status === 'DEMO' || status === 'SAMPLE') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5 animate-pulse"></span>
        Sample Requisition
      </span>
    );
  }

  // Categories
  if (status === 'RELEVANT_SUITABLE') {
    bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Relevant / Suitable';
  } else if (status === 'PARTIALLY_RELEVANT') {
    bg = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'Partially Relevant';
  } else if (status === 'NOT_RELEVANT') {
    bg = 'bg-rose-50 text-rose-700 border-rose-200';
    label = 'Not Relevant';
  } else if (status === 'EXPERIENCED') {
    bg = 'bg-blue-50 text-blue-700 border-blue-200';
    label = 'Experienced';
  } else if (status === 'FRESHER') {
    bg = 'bg-teal-50 text-teal-700 border-teal-200';
    label = 'Fresher';
  } else if (status === 'INCOMPLETE_PROFILE') {
    bg = 'bg-slate-100 text-slate-600 border-slate-300';
    label = 'Incomplete Profile';
  }

  // Stages & AI Statuses
  else if (status === 'SHORTLISTED') {
    bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (status === 'ON_HOLD') {
    bg = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (status === 'NOT_SHORTLISTED') {
    bg = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (status === 'INTERVIEW_SCHEDULED') {
    bg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    label = 'Interview Scheduled';
  } else if (status === 'CALLED') {
    bg = 'bg-cyan-50 text-cyan-700 border-cyan-200';
  } else if (status === 'SCREENED') {
    bg = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (status === 'APPLIED') {
    bg = 'bg-slate-100 text-slate-700 border-slate-200';
  }

  // Call Outcomes
  else if (status === 'ANSWERED_INTERESTED') {
    bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Interested (Answered)';
  } else if (status === 'CALLBACK_REQUESTED') {
    bg = 'bg-blue-50 text-blue-700 border-blue-200';
    label = 'Callback Requested';
  } else if (status === 'OPTED_OUT') {
    bg = 'bg-red-50 text-red-700 border-red-200';
    label = 'Opted Out (DNC)';
  } else if (status === 'ANSWERED_NOT_INTERESTED') {
    bg = 'bg-slate-100 text-slate-700 border-slate-300';
    label = 'Not Interested';
  } else if (status === 'NO_ANSWER') {
    bg = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'No Answer';
  } else if (status === 'BUSY') {
    bg = 'bg-orange-50 text-orange-700 border-orange-200';
    label = 'Busy';
  } else if (status === 'INVALID_NUMBER') {
    bg = 'bg-rose-50 text-rose-700 border-rose-200';
    label = 'Invalid Number';
  }

  // Interview Confirmation
  else if (status === 'SCHEDULED' || status === 'CONFIRMED') {
    bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Scheduled';
  } else if (status === 'CONFIRMATION_PENDING') {
    bg = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'Confirmation Pending';
  } else if (status === 'RESCHEDULED') {
    bg = 'bg-blue-50 text-blue-700 border-blue-200';
    label = 'Rescheduled';
  } else if (status === 'DECLINED') {
    bg = 'bg-rose-50 text-rose-700 border-rose-200';
    label = 'Declined';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg} ${className}`}>
      {label}
    </span>
  );
};


import React from 'react';

interface ScoreBadgeProps {
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, size = 'md' }) => {
  if (score === undefined || score === null) {
    return <span className="text-xs text-slate-400 font-medium">Not Screened</span>;
  }

  let colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
  let dotColor = 'bg-rose-500';

  if (score >= 75) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (score >= 50) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  }[size];

  return (
    <span className={`inline-flex items-center rounded-md font-medium border tabular-nums ${colorClasses} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mr-1.5`}></span>
      {score}/100
    </span>
  );
};


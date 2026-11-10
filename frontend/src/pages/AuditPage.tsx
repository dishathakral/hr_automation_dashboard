import React, { useState } from 'react';
import { History, Shield, Filter, Search, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditPageProps {
  auditLogs: AuditLog[];
}

export const AuditPage: React.FC<AuditPageProps> = ({ auditLogs }) => {
  const [filterEntity, setFilterEntity] = useState<string>('');

  const filteredLogs = auditLogs.filter(log => {
    if (filterEntity && log.entity_type !== filterEntity) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Audit Trail & Compliance Log</h2>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">Immutable Ledger</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete cryptographic audit history tracking all HR overrides, stage transitions, phone calls, and data updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 cursor-pointer"
          >
            <option value="">All Entities ({auditLogs.length})</option>
            <option value="JOB">Job Vacancies</option>
            <option value="APPLICATION">Applications</option>
            <option value="SCREENING">Screening & Overrides</option>
            <option value="CALL">Telephony Outreach</option>
            <option value="INTERVIEW">Interview Logistics</option>
            <option value="CONSENT">Consent & DND</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Rationale / Override Note</th>
                <th className="py-3 px-4">Diff Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const isOverride = log.action === 'HR_OVERRIDE';
                return (
                  <tr key={log.id} className={isOverride ? 'bg-amber-50/40' : 'hover:bg-slate-50/70'}>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {log.actor_email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        isOverride ? 'bg-amber-200 text-amber-900' :
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-800' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-[280px]">
                      {log.rationale || 'Standard operation'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500 max-w-[260px] truncate" title={JSON.stringify(log.changes)}>
                      {JSON.stringify(log.changes)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


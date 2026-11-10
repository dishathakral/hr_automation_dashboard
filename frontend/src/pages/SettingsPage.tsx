import React, { useEffect, useState } from 'react';
import { Settings, ShieldCheck, Cpu, PhoneCall, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SystemSettings, User } from '../types';
import { api } from '../api/client';

interface SettingsPageProps {
  currentUser: User | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ currentUser }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'HR_ADMIN';

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getSettings();
        setSettings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !isAdmin) return;
    setIsSaving(true);
    setSavedMsg(null);
    try {
      const updated = await api.updateSettings({
        ai_provider: settings.ai_provider,
        allow_external_ai_processing: settings.allow_external_ai_processing,
        gemini_model: settings.gemini_model,
        gemini_temperature: settings.gemini_temperature,
        calling_window_start_hour: settings.calling_window_start_hour,
        calling_window_end_hour: settings.calling_window_end_hour,
        max_calls_per_24_hours: settings.max_calls_per_24_hours,
        min_cooldown_hours: settings.min_cooldown_hours,
      });
      setSettings(updated);
      setSavedMsg('Governance settings saved and logged to Audit Trail.');
    } catch (err: any) {
      alert(`Failed to update settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
        Loading system governance settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Governance & Telephony Compliance Settings</h2>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
              {isAdmin ? 'Editable (HR Admin)' : 'Read-Only (Hiring Manager)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure AI screening model parameters, external PII processing approval, and Indian TRAI calling compliance limits.
          </p>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{savedMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Provider & Privacy Gate */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Cpu className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">AI Screening Provider & Data Privacy</h3>
              <p className="text-[11px] text-slate-500">External candidate data sharing remains blocked unless explicitly approved</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Active Screening Provider</label>
              <select
                disabled={!isAdmin}
                value={settings.ai_provider}
                onChange={(e) => setSettings({ ...settings, ai_provider: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium"
              >
                <option value="LOCAL_HEURISTIC">Local Rule-Based Heuristic Engine (Offline / Default)</option>
                <option value="GEMINI_API">Google Gemini API (Requires Org Approval & Key)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Configurable Gemini Model</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={settings.gemini_model}
                  onChange={(e) => setSettings({ ...settings, gemini_model: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temperature (0.0 – 1.0)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  disabled={!isAdmin}
                  value={settings.gemini_temperature}
                  onChange={(e) => setSettings({ ...settings, gemini_temperature: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/70 border border-amber-200 cursor-pointer">
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={settings.allow_external_ai_processing}
                onChange={(e) => setSettings({ ...settings, allow_external_ai_processing: e.target.checked })}
                className="mt-0.5 rounded accent-blue-600"
              />
              <div>
                <span className="font-bold text-amber-900 block">Organizational Approval for External AI Processing</span>
                <span className="text-[11px] text-amber-800">
                  Disabled by default. API Key configured: <strong>{settings.gemini_api_key_configured ? 'Yes' : 'No (using local fallback)'}</strong>.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Indian Calling Compliance Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <PhoneCall className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900">Calling Compliance & Provider Safeguards</h3>
              <p className="text-[11px] text-slate-500">Configurable rules subject to Indian telecom (TRAI) & provider limits</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Window Start Hour (IST 24h)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  disabled={!isAdmin}
                  value={settings.calling_window_start_hour}
                  onChange={(e) => setSettings({ ...settings, calling_window_start_hour: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Window End Hour (IST 24h)</label>
                <input
                  type="number"
                  min="1"
                  max="23"
                  disabled={!isAdmin}
                  value={settings.calling_window_end_hour}
                  onChange={(e) => setSettings({ ...settings, calling_window_end_hour: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Max Calls / Candidate / 24h</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  disabled={!isAdmin}
                  value={settings.max_calls_per_24_hours}
                  onChange={(e) => setSettings({ ...settings, max_calls_per_24_hours: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Minimum Cooldown (Hours)</label>
                <input
                  type="number"
                  min="0"
                  max="48"
                  disabled={!isAdmin}
                  value={settings.min_cooldown_hours}
                  onChange={(e) => setSettings({ ...settings, min_cooldown_hours: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Telephony Mode:</span>
                <span className="font-bold text-blue-700">{settings.simulation_mode ? 'SIMULATION SANDBOX' : 'LIVE'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Bulk Automated Calling:</span>
                <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                  <Lock className="w-3 h-3" />
                  {settings.bulk_calls_enabled ? 'Enabled' : 'HARD LOCKED (Disabled)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Exotel Adapter Credentials:</span>
                <span className="font-semibold text-slate-600">{settings.exotel_configured ? 'Configured' : 'Not Configured'}</span>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm"
              >
                {isSaving ? 'Saving...' : 'Save Governance Settings'}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};


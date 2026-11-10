import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Volume2,
  VolumeX,
  Ban,
  Radio,
  PhoneOff
} from 'lucide-react';
import { Application, CallLog, User } from '../types';
import { StatusBadge } from '../components/shared/StatusBadge';
import { api } from '../api/client';

interface CallingPageProps {
  applications: Application[];
  callLogs: CallLog[];
  currentUser: User | null;
  onRefreshCallLogs: () => void;
  onOpenSchedule: (app: Application) => void;
}

export const CallingPage: React.FC<CallingPageProps> = ({
  applications,
  callLogs,
  currentUser,
  onRefreshCallLogs,
  onOpenSchedule
}) => {
  // Number Validator State
  const [testNumber, setTestNumber] = useState('+919845123456');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Calling Simulator State
  const [activeApp, setActiveApp] = useState<Application | null>(null);
  const [complianceInfo, setComplianceInfo] = useState<any>(null);
  const [allowAfterHoursSim, setAllowAfterHoursSim] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [simStep, setSimStep] = useState<number>(1);
  const [callActive, setCallActive] = useState(false);
  const [simDuration, setSimDuration] = useState(0);
  const [simTranscript, setSimTranscript] = useState<any[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [finalOutcome, setFinalOutcome] = useState<string | null>(null);

  const eligibleCandidates = applications.filter(
    a => a.stage === 'SCREENED' || a.stage === 'CALLED' || a.screening_status === 'SHORTLISTED'
  );

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playDialTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Ignore audio autoplay blocks
    }
  };

  const speakPrompt = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'en-IN';
      utter.rate = 1.02;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore speech errors
    }
  };

  const handleValidateNumber = async () => {
    setIsValidating(true);
    try {
      const res = await api.validatePhone(testNumber);
      setValidationResult(res);
    } catch (err: any) {
      alert(`Validation error: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleStartCall = async (app: Application) => {
    setActiveApp(app);
    setFinalOutcome(null);
    setSimTranscript([]);

    try {
      const comp = await api.getCallingCompliance(app.id);
      setComplianceInfo(comp);

      if (!comp.eligible) {
        setCallActive(false);
        setCurrentPrompt('');
        return;
      }

      if (!comp.within_calling_hours && !allowAfterHoursSim) {
        setCallActive(false);
        setCurrentPrompt('');
        return;
      }

      setSimStep(1);
      setCallActive(true);
      setSimDuration(0);

      const initialPrompt = `Hello ${app.candidate.full_name}, this is an automated screening assistant on behalf of Antigravity regarding your application for the ${app.job_title} position. Do you consent to proceed with this brief 2-minute screening call? Press 1 to accept, Press 2 to request a callback from our HR team, or Press 9 to opt out and stop future calls.`;
      setCurrentPrompt(initialPrompt);
      playDialTone();
      speakPrompt(initialPrompt);
    } catch (err: any) {
      if (err.message?.toLowerCase().includes('not found')) {
        await onRefreshCallLogs();
        setActiveApp(null);
        alert('Candidate list was refreshed from the database. Please click the candidate card again.');
      } else {
        alert(`Pre-call compliance check failed: ${err.message}`);
      }
    }
  };

  const handleSimulationAction = async (action: string) => {
    if (!activeApp) return;

    try {
      const res = await api.simulateCallStep(
        activeApp.id,
        simStep,
        action,
        allowAfterHoursSim,
        simTranscript
      );
      setSimTranscript(res.transcript);
      setSimDuration(res.duration_seconds);

      if (res.is_call_ended) {
        setCallActive(false);
        setFinalOutcome(res.final_outcome || 'NO_ANSWER');
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        onRefreshCallLogs();
      } else {
        const nextStep = res.step + 1;
        setSimStep(nextStep);
        let nextPrompt = '';
        if (res.step === 1) {
          nextPrompt = `Thank you for confirming. Please verify: Are you currently based in ${activeApp.candidate.current_city} or open to relocating for our hybrid setup, and are you able to join our team within 30 days? Press 1 for Yes, or Press 2 for No.`;
        } else if (res.step === 2) {
          nextPrompt = `Excellent! Based on your qualifications, we would like to invite you for a 45-minute technical discussion with our hiring team this week. Are you interested in scheduling your interview? Press 1 to confirm interest, or Press 2 if you are no longer interested.`;
        }
        setCurrentPrompt(nextPrompt);
        if (nextPrompt) speakPrompt(nextPrompt);
      }
    } catch (err: any) {
      alert(`Simulation Error: ${err.message}`);
      setCallActive(false);
    }
  };

  const handleRestoreConsent = async (app: Application) => {
    try {
      await api.recordConsent(app.candidate.phone_normalized, app.candidate_id, 'APPLICATION_FORM');
      onRefreshCallLogs();
      await handleStartCall(app);
    } catch (err: any) {
      alert(`Error restoring consent: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Automated Calling Hub (India Telecom)</h2>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">Task 4</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            TRAI-compliant screening calls for Indian mobile numbers (+91) with informed consent, opt-out suppression, and realistic voice simulation.
          </p>
        </div>

        <button
          type="button"
          onClick={() => api.downloadDeliverable('call-log-report', 'Deliverable_4_Calling_Workflow_Log.csv').catch((e) => alert(e.message))}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Call Logs (CSV)</span>
        </button>
      </div>

      {/* Compliance & Safeguards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 space-y-1">
            <div>
              <span className="font-bold">TRAI Calling Hours Window:</span> Permitted strictly between <strong>10:00 AM – 6:00 PM IST</strong>.
            </div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-800 cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={allowAfterHoursSim}
                onChange={(e) => setAllowAfterHoursSim(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span>Allow simulator testing outside hours</span>
            </label>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900">
            <span className="font-bold">Opt-Out & DNC Suppression:</span> Candidates pressing <strong>9 (Opt-Out)</strong> are permanently added to the suppression registry and blocked from future automated calls.
          </div>
        </div>

        <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
          <Radio className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs text-purple-900">
            <span className="font-bold">Exotel Adapter Safety Lock:</span> Bulk mass-calling is locked by default (<code className="font-mono bg-purple-100 px-1 py-0.5 rounded">BULK_CALLS=False</code>) to prevent accidental live broadcasts.
          </div>
        </div>
      </div>

      {/* Calling Sandbox & Number Validator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Calling Console (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Interactive Call Simulation Console</h3>
                  <p className="text-[11px] text-slate-500">Real-time candidate IVR flow with voice synthesis playback</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceEnabled;
                    setVoiceEnabled(next);
                    if (!next && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                    if (next && currentPrompt) speakPrompt(currentPrompt);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    voiceEnabled
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  <span>{voiceEnabled ? 'Voice On' : 'Muted'}</span>
                </button>

                {callActive && (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      In Call ({simDuration}s)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCallActive(false);
                        setCurrentPrompt('');
                        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
                      title="Cancel / End Simulation Call"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>End Call</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Pre-Flight Compliance Guard Blocked Card */}
            {complianceInfo && !complianceInfo.eligible && activeApp && (
              <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Compliance Safeguard Active: Call Blocked for {activeApp.candidate.full_name}</span>
                  </div>
                </div>
                <p className="text-rose-700">{complianceInfo.block_reason}</p>
                {complianceInfo.consent_status === 'OPTED_OUT' && currentUser?.role === 'HR_ADMIN' && (
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestoreConsent(activeApp)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 font-semibold hover:bg-rose-100 transition-colors"
                    >
                      Record Fresh Consent (Reset for Testing)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Calling Hours Restriction Warning Card */}
            {complianceInfo && complianceInfo.eligible && !complianceInfo.within_calling_hours && !allowAfterHoursSim && activeApp && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Outside TRAI Calling Window (10:00 AM – 6:00 PM IST)</span>
                </div>
                <p className="text-amber-800">{complianceInfo.calling_hours_message}</p>
                <button
                  type="button"
                  onClick={() => {
                    setAllowAfterHoursSim(true);
                    handleStartCall(activeApp);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Enable Simulator After-Hours Testing & Retry
                </button>
              </div>
            )}

            {/* Calling Display Console */}
            <div className="mt-4 p-6 rounded-2xl bg-slate-900 text-white space-y-5 shadow-inner">
              <div className="flex items-center justify-center gap-1.5 h-10">
                {callActive ? (
                  <>
                    <div className="w-1.5 bg-blue-400 rounded-full animate-audio-bar-1"></div>
                    <div className="w-1.5 bg-indigo-400 rounded-full animate-audio-bar-2"></div>
                    <div className="w-1.5 bg-cyan-400 rounded-full animate-audio-bar-3"></div>
                    <div className="w-1.5 bg-emerald-400 rounded-full animate-audio-bar-4"></div>
                    <div className="w-1.5 bg-blue-500 rounded-full animate-audio-bar-5"></div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <Volume2 className="w-4 h-4" />
                    <span>Dialer Standby • Select an Eligible Candidate Below</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                  <span>Target: <strong>{activeApp?.candidate.full_name || 'No Candidate Selected'}</strong></span>
                  <span className="font-mono">{activeApp?.candidate.phone_normalized || '--'}</span>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/60 min-h-[84px] flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {currentPrompt || 'Select an eligible candidate from the queue below to initiate a simulated 3-step call.'}
                  </p>
                  {currentPrompt && voiceEnabled && (
                    <button
                      type="button"
                      onClick={() => speakPrompt(currentPrompt)}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-blue-300 shrink-0"
                      title="Replay Voice Prompt"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Cumulative Transcript Feed */}
              {simTranscript.length > 0 && (
                <div className="space-y-1.5 max-h-28 overflow-y-auto text-[11px] bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  {simTranscript.map((entry, idx) => (
                    <div key={idx} className="text-slate-300">
                      <span className="text-blue-400 font-semibold">Step {entry.step}:</span> {entry.candidate_action}
                    </div>
                  ))}
                </div>
              )}

              {/* Interactive Candidate Response Buttons */}
              {callActive && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Candidate Response Selection (Step {simStep} of 3):
                  </span>

                  {simStep === 1 && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSimulationAction('PRESS_1')}
                        className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors text-left"
                      >
                        Press 1: Grant Consent & Proceed
                      </button>
                      <button
                        onClick={() => handleSimulationAction('PRESS_2')}
                        className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors text-left"
                      >
                        Press 2: Request Human Callback
                      </button>
                      <button
                        onClick={() => handleSimulationAction('PRESS_9')}
                        className="p-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors text-left"
                      >
                        Press 9: Opt-Out / Do Not Call
                      </button>
                      <button
                        onClick={() => handleSimulationAction('NO_ANSWER')}
                        className="p-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition-colors text-left"
                      >
                        No Answer / Ring Timeout
                      </button>
                    </div>
                  )}

                  {simStep === 2 && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSimulationAction('PRESS_1')}
                        className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors text-left"
                      >
                        Press 1: Available within 30 Days & Relocating
                      </button>
                      <button
                        onClick={() => handleSimulationAction('PRESS_2')}
                        className="p-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors text-left"
                      >
                        Press 2: Not Available / Cannot Relocate
                      </button>
                    </div>
                  )}

                  {simStep === 3 && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSimulationAction('PRESS_1')}
                        className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors text-left"
                      >
                        Press 1: Confirm Technical Interview Interest
                      </button>
                      <button
                        onClick={() => handleSimulationAction('PRESS_2')}
                        className="p-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors text-left"
                      >
                        Press 2: Decline / Not Interested
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Call Result Confirmation */}
              {finalOutcome && (
                <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold">Call Completed:</span> {finalOutcome.replace(/_/g, ' ')}
                  </div>
                  {finalOutcome === 'ANSWERED_INTERESTED' && activeApp && (
                    <button
                      onClick={() => onOpenSchedule(activeApp)}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded"
                    >
                      Schedule Interview
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Eligible Candidate Selector */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Shortlisted Candidate to Dial ({eligibleCandidates.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {eligibleCandidates.map((app) => {
                const isOptedOut = app.call_outcome === 'OPTED_OUT';
                return (
                  <button
                    key={app.id}
                    onClick={() => handleStartCall(app)}
                    disabled={callActive}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      activeApp?.id === app.id
                        ? 'border-blue-600 bg-blue-50/50'
                        : isOptedOut
                        ? 'border-rose-200 bg-rose-50/30 hover:border-rose-300'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-bold text-xs text-slate-900 truncate">{app.candidate.full_name}</p>
                      {isOptedOut && (
                        <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                          DNC Blocked
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-slate-500 mt-0.5">{app.candidate.phone_normalized}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <StatusBadge status={app.category} type="category" />
                      {app.call_outcome && (
                        <span className="text-[10px] text-slate-500 font-medium">({app.call_outcome})</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Indian Number Validator & Compliance Checker (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Indian Mobile (+91) Number Validator</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Validates number format, telecom circle, and Do-Not-Call (DNC) registry suppression.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number to Verify
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    placeholder="e.g. +91 98451 23456 or 9845123456"
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    onClick={handleValidateNumber}
                    disabled={isValidating}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                  >
                    {isValidating ? 'Checking...' : 'Validate'}
                  </button>
                </div>
              </div>

              {validationResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    validationResult.is_valid_indian_mobile
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/70 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {validationResult.is_valid_indian_mobile ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Valid Indian Mobile Number</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Invalid Mobile Number</span>
                      </>
                    )}
                  </div>

                  {validationResult.is_valid_indian_mobile ? (
                    <div className="space-y-1 text-slate-700">
                      <p>Normalized E.164: <strong className="font-mono text-emerald-800">{validationResult.normalized_number}</strong></p>
                      <p>Identified Telecom Circle: <strong>{validationResult.carrier_circle}</strong></p>
                      <p>TRAI Mobile Plan: Valid 10-digit mobile prefix [6-9]</p>
                    </div>
                  ) : (
                    <p className="text-rose-700 font-medium">{validationResult.error_message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Ban className="w-4 h-4 text-rose-600" />
              <span>Instant DND Opt-Out Suppression Tool</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Candidate requesting immediate suppression? Submit number to permanently block automated calls.
            </p>
            <button
              onClick={async () => {
                const phone = prompt('Enter candidate phone number to add to Do-Not-Call (DNC) list:');
                if (phone) {
                  try {
                    await api.optOutPhone(phone, 'Recruiter manually logged DNC request');
                    alert(`Phone number ${phone} successfully added to permanent suppression list.`);
                    onRefreshCallLogs();
                  } catch (e: any) {
                    alert(`Error: ${e.message}`);
                  }
                }
              }}
              className="mt-3 w-full py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors text-center"
            >
              Add Number to DNC Suppression Registry
            </button>
          </div>
        </div>
      </div>

      {/* Complete Call Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Automated Calling & Telephony Log</h3>
            <p className="text-xs text-slate-500">Chronological audit log of all simulated candidate calls, timestamps, and consent records</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{callLogs.length} attempts recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Phone Number (+91)</th>
                <th className="py-3 px-4">Provider Mode</th>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Consent Verified</th>
                <th className="py-3 px-4">Call Outcome</th>
                <th className="py-3 px-4">Step Reached</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {callLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                    {log.phone_number}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {log.provider_mode}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {new Date(log.call_timestamp).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 tabular-nums text-slate-700 font-medium">
                    {log.duration_seconds}s
                  </td>
                  <td className="py-3.5 px-4">
                    {log.consent_granted ? (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Consent Granted</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Not Verified</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={log.outcome} type="call" />
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 truncate max-w-[200px]" title={log.simulation_step_reached}>
                    {log.simulation_step_reached}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

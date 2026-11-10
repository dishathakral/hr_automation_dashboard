import {
  User, Job, Candidate, Application, ScreeningResult, CallLog,
  Interview, Notification, AuditLog, KPIOverview, ConsentRecord, SystemSettings
} from '../types';

const API_BASE = '/api/v1';

class ApiClient {
  private token: string | null = null;
  private currentUser: User | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.currentUser = JSON.parse(userStr);
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  setAuth(token: string, user: User) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  clearAuth() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getUser(): User | null {
    return this.currentUser;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && !endpoint.startsWith('/auth/') && this.currentUser) {
      // Auto-refresh stale demo token once and retry
      const role = this.currentUser.role || 'HR_ADMIN';
      this.clearAuth();
      await this.demoLogin(role);
      const retryHeaders: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
      };
      if (this.token) {
        retryHeaders['Authorization'] = `Bearer ${this.token}`;
      }
      if (!(options.body instanceof FormData)) {
        retryHeaders['Content-Type'] = 'application/json';
      }
      const retryRes = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: retryHeaders,
      });
      if (retryRes.ok) {
        const ct = retryRes.headers.get('content-type') || '';
        if (ct.includes('text/csv') || ct.includes('text/calendar')) {
          return (await retryRes.text()) as unknown as T;
        }
        return await retryRes.json();
      }
    }

    if (!res.ok) {
      let errorMsg = `API Error ${res.status}: ${res.statusText}`;
      try {
        const errData = await res.json();
        errorMsg = errData.detail || errorMsg;
      } catch (e) {
        // ignore
      }
      throw new Error(errorMsg);
    }

    // For file downloads or text
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/csv') || contentType.includes('text/calendar')) {
      return (await res.text()) as unknown as T;
    }

    return await res.json();
  }

  // --- Auth ---
  async demoLogin(role: 'HR_ADMIN' | 'HIRING_MANAGER') {
    const data = await this.request<{
      access_token: string;
      role: string;
      user_id: string;
      full_name: string;
      email: string;
    }>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });

    const user: User = {
      id: data.user_id,
      email: data.email,
      full_name: data.full_name,
      role: data.role as 'HR_ADMIN' | 'HIRING_MANAGER',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    this.setAuth(data.access_token, user);
    return user;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async loginWithCredentials(email: string, password: string): Promise<User> {
    const data = await this.request<{
      access_token: string;
      role: string;
      user_id: string;
      full_name: string;
      email: string;
    }>('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const user: User = {
      id: data.user_id,
      email: data.email,
      full_name: data.full_name,
      role: data.role as 'HR_ADMIN' | 'HIRING_MANAGER',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    this.setAuth(data.access_token, user);
    return user;
  }

  // --- Jobs ---
  async getJobs(status?: string): Promise<Job[]> {
    const query = status ? `?status_filter=${status}` : '';
    return this.request<Job[]>(`/jobs${query}`);
  }

  async createJob(jobData: Partial<Job>): Promise<Job> {
    return this.request<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  async updateJob(id: string, jobData: Partial<Job>): Promise<Job> {
    return this.request<Job>(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
  }

  async archiveJob(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/jobs/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Applicants ---
  async getApplications(params?: { job_id?: string; category?: string; stage?: string; search?: string }): Promise<Application[]> {
    const sp = new URLSearchParams();
    if (params?.job_id) sp.append('job_id', params.job_id);
    if (params?.category) sp.append('category', params.category);
    if (params?.stage) sp.append('stage', params.stage);
    if (params?.search) sp.append('search', params.search);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return this.request<Application[]>(`/applicants${qs}`);
  }

  async createManualApplicant(candidateData: any): Promise<Application> {
    return this.request<Application>('/applicants', {
      method: 'POST',
      body: JSON.stringify(candidateData),
    });
  }

  async importIndeedApplications(file: File, jobId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_id', jobId);

    return this.request<any>('/applicants/import-indeed', {
      method: 'POST',
      body: formData,
    });
  }

  async updateCategory(applicationId: string, category: string, category_reason: string) {
    return this.request<any>(`/applicants/${applicationId}/category`, {
      method: 'PATCH',
      body: JSON.stringify({ category, category_reason }),
    });
  }

  // --- Candidates ---
  async getCandidateHistory(candidateId: string) {
    return this.request<any>(`/candidates/${candidateId}/history`);
  }

  async getCandidateTimeline(candidateId: string) {
    return this.request<any>(`/candidates/${candidateId}/timeline`);
  }

  async uploadResume(candidateId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<any>(`/candidates/${candidateId}/resumes`, {
      method: 'POST',
      body: formData,
    });
  }

  async getResumes(candidateId: string): Promise<any[]> {
    return this.request<any[]>(`/candidates/${candidateId}/resumes`);
  }

  // --- AI Screening ---
  async evaluateCandidate(applicationId: string): Promise<ScreeningResult> {
    return this.request<ScreeningResult>(`/screening/evaluate/${applicationId}`, {
      method: 'POST',
    });
  }

  async evaluateBatch(jobId: string) {
    return this.request<any>(`/screening/evaluate-batch?job_id=${jobId}`, {
      method: 'POST',
    });
  }

  async getScreeningResult(applicationId: string): Promise<ScreeningResult> {
    return this.request<ScreeningResult>(`/screening/${applicationId}`);
  }

  async recordHRDecision(applicationId: string, finalDecision: string, overrideReason?: string, notes?: string) {
    return this.request<any>('/screening/decision', {
      method: 'POST',
      body: JSON.stringify({
        application_id: applicationId,
        final_decision: finalDecision,
        override_reason: overrideReason,
        decision_notes: notes,
      }),
    });
  }

  // --- Calling & Telephony ---
  async validatePhone(phoneNumber: string) {
    return this.request<{
      raw_number: string;
      normalized_number?: string;
      is_valid_indian_mobile: boolean;
      carrier_circle?: string;
      error_message?: string;
    }>('/calling/validate-phone', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
  }

  async getCallingCompliance(applicationId: string) {
    return this.request<{
      application_id: string;
      candidate_name: string;
      phone_number: string;
      is_valid_phone: boolean;
      carrier_circle?: string;
      within_calling_hours: boolean;
      calling_hours_message: string;
      consent_status: string;
      eligible: boolean;
      block_reason?: string;
      simulation_mode: boolean;
    }>(`/calling/compliance-status/${applicationId}`);
  }

  async simulateCallStep(
    applicationId: string,
    step: number,
    candidateAction: string,
    allowOutsideHoursSimulation = false,
    transcriptHistory: any[] = []
  ) {
    return this.request<{
      application_id: string;
      phone_number: string;
      step: number;
      audio_prompt_text: string;
      candidate_response_recorded: string;
      is_call_ended: boolean;
      final_outcome?: string;
      duration_seconds: number;
      transcript: any[];
      opt_out_triggered: boolean;
    }>('/calling/simulate-call', {
      method: 'POST',
      body: JSON.stringify({
        application_id: applicationId,
        step,
        candidate_action: candidateAction,
        allow_outside_hours_simulation: allowOutsideHoursSimulation,
        transcript_history: transcriptHistory,
      }),
    });
  }

  async getCallLogs(outcome?: string): Promise<CallLog[]> {
    const qs = outcome ? `?outcome=${outcome}` : '';
    return this.request<CallLog[]>(`/calling/logs${qs}`);
  }

  async getConsentHistory(phone: string): Promise<ConsentRecord[]> {
    return this.request<ConsentRecord[]>(`/consent/history/${encodeURIComponent(phone)}`);
  }

  async recordConsent(phoneNumber: string, candidateId?: string, channel = 'APPLICATION_FORM'): Promise<ConsentRecord> {
    return this.request<ConsentRecord>('/consent/record', {
      method: 'POST',
      body: JSON.stringify({
        candidate_id: candidateId,
        phone_number: phoneNumber,
        consent_channel: channel,
      }),
    });
  }

  async optOutPhone(phoneNumber: string, reason?: string) {
    return this.request<any>('/consent/opt-out', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber, reason }),
    });
  }

  // --- Interviews ---
  async getInterviews(status?: string): Promise<Interview[]> {
    const qs = status ? `?confirmation_status=${status}` : '';
    return this.request<Interview[]>(`/interviews${qs}`);
  }

  async getInterviewerSlots(interviewerName?: string) {
    const qs = interviewerName ? `?interviewer_name=${encodeURIComponent(interviewerName)}` : '';
    return this.request<any[]>(`/interviews/interviewer-slots${qs}`);
  }

  async checkAvailability(interviewerName: string, scheduledAt: string, durationMinutes = 45) {
    const sp = new URLSearchParams({
      interviewer_name: interviewerName,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes.toString(),
    });
    return this.request<any>(`/interviews/availability?${sp.toString()}`);
  }

  async scheduleInterview(data: {
    application_id: string;
    interviewer_name: string;
    interviewer_email: string;
    scheduled_at: string;
    duration_minutes: number;
    interview_mode: string;
    meeting_link_or_venue?: string;
    special_instructions?: string;
  }): Promise<Interview> {
    return this.request<Interview>('/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInterviewStatus(id: string, confirmationStatus: string, notes?: string) {
    return this.request<any>(`/interviews/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ confirmation_status: confirmationStatus, notes }),
    });
  }

  async downloadIcsUrl(id: string) {
    return `/api/v1/interviews/${id}/ics`;
  }

  private async downloadFile(endpoint: string, fallbackFilename: string) {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let res = await fetch(`${API_BASE}${endpoint}`, { headers });

    if (res.status === 401 && this.currentUser) {
      const role = this.currentUser.role || 'HR_ADMIN';
      this.clearAuth();
      await this.demoLogin(role);
      const retryHeaders: Record<string, string> = {};
      if (this.token) {
        retryHeaders['Authorization'] = `Bearer ${this.token}`;
      }
      res = await fetch(`${API_BASE}${endpoint}`, { headers: retryHeaders });
    }

    if (!res.ok) {
      let errorMsg = `Download failed (${res.status})`;
      try {
        const errData = await res.json();
        errorMsg = errData.detail || errorMsg;
      } catch (e) {
        // ignore
      }
      throw new Error(errorMsg);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fallbackFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async downloadInterviewIcs(id: string, candidateName?: string) {
    const safeName = (candidateName || 'invite').replace(/\s+/g, '_');
    return this.downloadFile(`/interviews/${id}/ics`, `interview_${safeName}.ics`);
  }

  // --- Notifications & Audit ---
  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>('/notifications');
  }

  async getAuditLogs(entityType?: string, action?: string): Promise<AuditLog[]> {
    const sp = new URLSearchParams();
    if (entityType) sp.append('entity_type', entityType);
    if (action) sp.append('action', action);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return this.request<AuditLog[]>(`/audit${qs}`);
  }

  // --- Reports & Deliverables ---
  async getKPIs(): Promise<KPIOverview> {
    return this.request<KPIOverview>('/reports/kpis');
  }

  getDeliverableExportUrl(sheetType: string) {
    return `/api/v1/reports/deliverable/${sheetType}/export`;
  }

  async downloadDeliverable(sheetType: string, filename: string) {
    return this.downloadFile(`/reports/deliverable/${sheetType}/export`, filename);
  }

  // --- Settings & Governance ---
  async getSettings(): Promise<SystemSettings> {
    return this.request<SystemSettings>('/settings');
  }

  async updateSettings(payload: Partial<SystemSettings>): Promise<SystemSettings> {
    return this.request<SystemSettings>('/settings', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();

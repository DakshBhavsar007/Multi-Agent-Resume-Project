import React from 'react';
import { toast } from 'react-hot-toast';

const getApiBase = () => {
  if (typeof window !== "undefined") {
    // If we have a custom API URL in Vite env (for development or specific staging)
    const viteApiUrl = import.meta.env?.VITE_API_URL;
    if (viteApiUrl) return viteApiUrl;

    // Otherwise, if we are on a custom domain, use the current origin
    const host = window.location.origin;
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return "http://127.0.0.1:8000/api/v1";
    }
    return `${host}/api/v1`;
  }
  return "http://127.0.0.1:8000/api/v1";
};

const BASE = getApiBase();

export const API_HOST = BASE.replace("/api/v1", "");

function getHeaders(isFile=false) {
  const h = {};
  const apiKey = localStorage.getItem("vish_api_key");
  if (apiKey) h["X-API-Key"] = String(apiKey).replace(/[^\x20-\x7E]/g, "");
  if (!isFile) h["Content-Type"] = "application/json";
  const jwt = localStorage.getItem("vish_jwt");
  if (jwt && jwt !== "undefined" && jwt !== "null") {
    h["Authorization"] = `Bearer ${String(jwt).replace(/[^\x20-\x7E]/g, "")}`;
  }
  return h;
}

async function req(method, path, body=null, isFile=false) {
  const opts = {
    method,
    headers: getHeaders(isFile),
    body: body 
      ? (isFile ? body : JSON.stringify(body))
      : undefined
  }
  
  const res = await fetch(BASE + path, opts)
  const data = await res.json()
  
  if (res.status === 401) {
    localStorage.clear()
    window.location.href = "/login"
    throw new Error("Session expired")
  }
  const errText = (data && data.error) ? String(data.error).toLowerCase() : "";
  const isAccountBanned = (res.status === 403 || res.status === 401) && (
    errText.includes("banned") || 
    errText.includes("deactivated") || 
    errText.includes("suspended") ||
    errText.includes("contact support") ||
    errText.includes("account disabled")
  );

  if (isAccountBanned) {
    let email = "";
    try {
      const u = localStorage.getItem("between_user");
      const s = localStorage.getItem("vish_seeker_data");
      if (u) email = JSON.parse(u).email || "";
      else if (s) email = JSON.parse(s).email || "";
    } catch(e) {}
    
    localStorage.removeItem("vish_jwt");
    localStorage.removeItem("vish_api_key");
    localStorage.removeItem("vish_company");
    localStorage.removeItem("between_user");
    localStorage.removeItem("vish_seeker_token");
    localStorage.removeItem("vish_seeker_data");

    const isSeeker = typeof window !== "undefined" && (window.location.pathname.startsWith('/jobs') || window.location.pathname.startsWith('/seeker'));
    const targetUrl = isSeeker 
      ? `/jobs/login?banned=true&email=${encodeURIComponent(email)}`
      : `/login?banned=true&email=${encodeURIComponent(email)}`;
    window.location.href = targetUrl;
    throw new Error(data.error || "Account banned");
  }
  if (res.status === 429) {
    const e = new Error("Rate limit exceeded")
    e.isRateLimit = true
    e.limitData = data.data
    window.dispatchEvent(new CustomEvent("rate-limit", {
      detail: data.data || { action: "unknown", used: 0, limit: 0 }
    }))
    throw e
  }
  if (!data.success) {
    const errorMsg = data.error || "Request failed";
    const lowerMsg = errorMsg.toLowerCase();
    if (lowerMsg.includes("limit") || lowerMsg.includes("upgrade") || lowerMsg.includes("plan") || lowerMsg.includes("parses") || lowerMsg.includes("quota")) {
      const isRecruiter = typeof window !== "undefined" && window.location.pathname.startsWith('/dashboard');
      if (isRecruiter) {
        toast.error(
          (t) => React.createElement(
            'div',
            { className: 'flex items-center gap-3' },
            React.createElement('span', null, errorMsg),
            React.createElement(
              'button',
              {
                onClick: () => {
                  toast.dismiss(t.id);
                  window.location.href = '/dashboard/settings?tab=billing';
                },
                className: 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-2.5 py-1 rounded-md transition shadow-sm whitespace-nowrap'
              },
              'Upgrade Plan →'
            )
          ),
          { duration: 6000 }
        );
      }
    }
    throw new Error(errorMsg)
  }
  return data.data
}

// AUTH
export const authAPI = {
  register: (b) => req("POST","/auth/register",b),
  createSupportTicket: (ticketData) => {
    return fetch(`${API_HOST}/api/v1/support/ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticketData)
    }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to submit ticket");
      if (typeof window !== "undefined" && data.data) {
        if (ticketData?.email) localStorage.setItem("between_support_email", ticketData.email.trim());
        if (data.data.id) localStorage.setItem("between_support_ticket_id", data.data.id);
      }
      return data.data;
    });
  },
  lookupSupportTickets: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_HOST}/api/v1/support/lookup${qs ? '?' + qs : ''}`).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch tickets");
      return data.data;
    });
  },
  replySupportTicket: (ticketId, payload) => {
    return fetch(`${API_HOST}/api/v1/support/ticket/${ticketId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to send reply");
      return data.data;
    });
  },
  login: async (email,password) => {
    const d = await req("POST","/auth/login",
                         {email,password})
    localStorage.setItem("vish_jwt",d.jwt_token)
    localStorage.setItem("vish_api_key",d.api_key||"")
    localStorage.setItem("vish_company",JSON.stringify(d))
    return d
  },
  logout: () => {
    localStorage.removeItem("vish_jwt")
    localStorage.removeItem("vish_api_key")
    localStorage.removeItem("vish_company")
    window.location.href="/login"
  },
  generateKey: (b) => req("POST","/auth/api-keys/generate",b),
  getKeys: () => req("GET","/auth/api-keys"),
  deleteKey: (id) => req("DELETE",`/auth/api-keys/${id}`),
  googleLogin: async (credential) => {
    const d = await req("POST", "/auth/login-google", { credential })
    localStorage.setItem("vish_jwt", d.jwt_token)
    localStorage.setItem("vish_api_key", d.api_key || "")
    localStorage.setItem("vish_company", JSON.stringify(d))
    return d
  },
  githubLogin: async (code) => {
    const d = await req("POST", "/auth/login-github", { code })
    localStorage.setItem("vish_jwt", d.jwt_token)
    localStorage.setItem("vish_api_key", d.api_key || "")
    localStorage.setItem("vish_company", JSON.stringify(d))
    return d
  },
  getMe: () => req("GET","/auth/me"),
  updateProfile: (b) => req("POST","/auth/update-profile",b),
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return req("POST", "/auth/upload-logo", formData, true);
  },
  getNotifications: () => req("GET", "/auth/notifications"),
  markAllNotificationsRead: () => req("POST", "/auth/notifications/read-all"),
  markNotificationRead: (id) => req("POST", `/auth/notifications/${id}/read`),
  crossLogin: async (token, targetRole) => {
    return req("POST", "/auth/cross-login", { token, target_role: targetRole });
  }
}

// SESSIONS
export const sessionsAPI = {
  create: (b) => req("POST","/sessions",b),
  list: (qs="") => req("GET",`/sessions${qs}`),
  get: (id) => req("GET",`/sessions/${id}`),
  update: (id,b) => req("PATCH",`/sessions/${id}`,b),
  delete: (id,b) => req("DELETE",`/sessions/${id}`,b),
  setCriteria: (id,b) => 
    req("POST",`/sessions/${id}/criteria`,b),
  inferSkills: (id,b) => 
    req("POST",`/sessions/${id}/infer-skills`,b),
  matchAll: (id) => 
    req("POST",`/sessions/${id}/match-all`),
  generateJD: (b) => req("POST", "/sessions/generate-jd", b),
  getClusters: (id) => req("GET", `/sessions/${id}/candidate-clusters`)
}

// INGEST
export const ingestAPI = {
  uploadFiles: (sessionId,files) => {
    const fd = new FormData()
    fd.append("session_id",sessionId)
    files.forEach(f => fd.append("files",f))
    return req("POST","/ingest/upload",fd,true)
  },
  uploadZip: (sessionId,file) => {
    const fd = new FormData()
    fd.append("session_id",sessionId)
    fd.append("file",file)
    return req("POST","/ingest/zip",fd,true)
  },
  getOAuthUrl: (type,sessionId) =>
    req("GET",
      `/ingest/oauth/google/url?type=${type}&session_id=${sessionId}`
    ),
  connectGmail: (b) => req("POST","/ingest/gmail/connect",b),
  syncGmail: (b) => req("POST","/ingest/gmail/sync",b),
  connectGDrive: (b) => req("POST","/ingest/gdrive/connect",b),
  syncGDrive: (b) => req("POST","/ingest/gdrive/sync",b),
  connectForm: (b) => req("POST","/ingest/google-form",b),
  importATS: (sessionId,format,file) => {
    const fd = new FormData()
    fd.append("session_id",sessionId)
    fd.append("format",format)
    fd.append("file",file)
    return req("POST","/ingest/ats-import",fd,true)
  },
  getStatus: (jobId) => req("GET",`/ingest/status/${jobId}`)
}

// CANDIDATES
export const candidatesAPI = {
  list: (sessionId,qs="") =>
    req("GET",`/sessions/${sessionId}/candidates${qs}`),
  listAll: (qs="") =>
    req("GET",`/candidates${qs}`),
  get: (sessionId,candId) =>
    req("GET",
      `/sessions/${sessionId}/candidates/${candId}`),
  action: (sessionId, candId, action, file = null) => {
    if (file) {
      const fd = new FormData();
      fd.append("action", action);
      fd.append("offer_letter", file);
      return req("PATCH", `/sessions/${sessionId}/candidates/${candId}/action`, fd, true);
    }
    return req("PATCH", `/sessions/${sessionId}/candidates/${candId}/action`, { action });
  },
  delete: (sessionId,candId) =>
    req("DELETE",
      `/sessions/${sessionId}/candidates/${candId}`),
  bulkReject: (sessionId,ids) =>
    req("DELETE",
      `/sessions/${sessionId}/candidates/bulk-reject`,
      {candidate_ids:ids})
}

// CHAT
export const chatAPI = {
  send: (sessionId,b) =>
    req("POST",`/sessions/${sessionId}/chat`,b),
  getHistory: (sessionId) =>
    req("GET",`/sessions/${sessionId}/chat/history`),
  clear: (sessionId) =>
    req("DELETE",`/sessions/${sessionId}/chat/history`)
}

// EXPORT (returns URL string, not fetch)
export const exportAPI = {
  candidatesUrl: (sessionId,status="hired") =>
    `${BASE}/sessions/${sessionId}/export/candidates` +
    `?status=${status}&x_api_key=${
      localStorage.getItem("vish_api_key")||""}&token=${
      localStorage.getItem("vish_jwt")||""}`,
  reportUrl: (sessionId) =>
    `${BASE}/sessions/${sessionId}/export/report` +
    `?x_api_key=${localStorage.getItem("vish_api_key")||""}&token=${
      localStorage.getItem("vish_jwt")||""}`
}

// BILLING
export const billingAPI = {
  plans: () => req("GET", "/billing/plans"),
  subscribe: (plan) => req("POST", "/billing/subscribe", { plan }),
  verifyPayment: (b) => req("POST", "/billing/verify-payment", b),
  current: () => req("GET", "/billing/current"),
  cancel: () => req("POST", "/billing/cancel")
}

// PUBLIC JOBS (Job Seeker Portal API)
export const publicJobsAPI = {
  list: (query = "", location = "") => {
    let url = "/public/jobs";
    const params = [];
    if (query) params.push(`query=${encodeURIComponent(query)}`);
    if (location) params.push(`location=${encodeURIComponent(location)}`);
    if (params.length) url += `?${params.join("&")}`;
    return req("GET", url);
  },
  get: (id) => req("GET", `/public/jobs/${id}`),
  apply: (id, file, extraData = {}) => {
    const fd = new FormData();
    fd.append("file", file);
    if (extraData.name) fd.append("name", extraData.name);
    if (extraData.email) fd.append("email", extraData.email);
    if (extraData.phone) fd.append("phone", extraData.phone);
    return req("POST", `/public/jobs/${id}/apply`, fd, true);
  },
  parseOnly: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return req("POST", "/public/jobs/parse-only/apply", fd, true);
  },
  verifySafety: (id) => req("POST", `/public/jobs/${id}/safety-check`),
  scanSafetyArbitrary: (payload) => req("POST", "/public/jobs/scan-safety", payload)
};

// PROTECTION / FRAUD DETECTION
export const protectionAPI = {
  scan: (payload) => {
    if (payload instanceof FormData) {
      return req("POST", "/protection/scan", payload, true);
    }
    if (payload && payload.file) {
      const fd = new FormData();
      fd.append("file", payload.file);
      if (payload.scan_type) fd.append("scan_type", payload.scan_type);
      if (payload.url) fd.append("url", payload.url);
      if (payload.job_title) fd.append("job_title", payload.job_title);
      if (payload.job_description) fd.append("job_description", payload.job_description);
      if (payload.location) fd.append("location", payload.location);
      return req("POST", "/protection/scan", fd, true);
    }
    return req("POST", "/protection/scan", payload);
  },
  history: () => req("GET", "/protection/history")
};

// ── SEEKER API ─────────────────────────────────────────────────────────────────
// Uses a separate seeker_token from localStorage (never the recruiter JWT)

function getSeekerHeaders(isFile = false) {
  const h = {};
  const token = localStorage.getItem('vish_seeker_token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (!isFile) h['Content-Type'] = 'application/json';
  return h;
}

async function seekerReq(method, path, body = null, isFile = false) {
  const opts = {
    method,
    headers: getSeekerHeaders(isFile),
    body: body ? (isFile ? body : JSON.stringify(body)) : undefined,
  };
  const res = await fetch(`${API_HOST}${path}`, opts);
  const data = await res.json();
  if (res.status === 401) {
    localStorage.removeItem('vish_seeker_token');
    localStorage.removeItem('vish_seeker_data');
    window.location.href = '/jobs/login';
    throw new Error('Session expired');
  }
  const errText = (data && data.error) ? String(data.error).toLowerCase() : "";
  const isAccountBanned = (res.status === 403 || res.status === 401) && (
    errText.includes("banned") || 
    errText.includes("deactivated") || 
    errText.includes("suspended") ||
    errText.includes("contact support") ||
    errText.includes("account disabled")
  );

  if (isAccountBanned) {
    let email = "";
    try {
      const s = localStorage.getItem("vish_seeker_data");
      if (s) email = JSON.parse(s).email || "";
    } catch(e) {}
    localStorage.removeItem('vish_seeker_token');
    localStorage.removeItem('vish_seeker_data');
    window.location.href = `/jobs/login?banned=true&email=${encodeURIComponent(email)}`;
    throw new Error(data.error || "Account banned");
  }

  if (!data.success) {
    const errorMsg = data.error || "Request failed";
    const lowerMsg = errorMsg.toLowerCase();
    if (lowerMsg.includes("limit") || lowerMsg.includes("upgrade") || lowerMsg.includes("plan") || lowerMsg.includes("quota")) {
      toast.error(
        (t) => React.createElement(
          'div',
          { className: 'flex items-center gap-3' },
          React.createElement('span', null, errorMsg),
          React.createElement(
            'button',
            {
              onClick: () => {
                toast.dismiss(t.id);
                window.location.href = '/jobs/billing';
              },
              className: 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-2.5 py-1 rounded-md transition shadow-sm whitespace-nowrap'
            },
            'Upgrade Plan →'
          )
        ),
        { duration: 6000 }
      );
    }
    throw new Error(errorMsg);
  }
  return data.data;
}

export const seekerAPI = {
  // Auth
  register: (b) => seekerReq('POST', '/api/v1/seeker/auth/register', b),
  login: (b) => seekerReq('POST', '/api/v1/seeker/auth/login', b),
  googleLogin: async (credential) => {
    const d = await seekerReq('POST', '/api/v1/seeker/auth/login-google', { credential });
    if (typeof window !== "undefined") {
      localStorage.setItem('vish_seeker_token', d.seeker_token);
      localStorage.setItem('vish_seeker_data', JSON.stringify(d.seeker));
    }
    return d;
  },
  githubLogin: async (code) => {
    const d = await seekerReq('POST', '/api/v1/seeker/auth/login-github', { code });
    if (typeof window !== "undefined") {
      localStorage.setItem('vish_seeker_token', d.seeker_token);
      localStorage.setItem('vish_seeker_data', JSON.stringify(d.seeker));
    }
    return d;
  },
  getMe: () => seekerReq('GET', '/api/v1/seeker/auth/me'),
  updateProfile: (b) => seekerReq('PATCH', '/api/v1/seeker/auth/profile', b),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return seekerReq('POST', '/api/v1/seeker/auth/upload-avatar', fd, true);
  },

  // Resume
  getResume: () => seekerReq('GET', '/api/v1/seeker/resume'),
  uploadResume: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return seekerReq('POST', '/api/v1/seeker/resume/upload', fd, true);
  },
  getParseStatus: () => seekerReq('GET', '/api/v1/seeker/resume/parse-status'),
  enhanceResume: (jobDescription = '') =>
    seekerReq('POST', '/api/v1/seeker/resume/enhance', { job_description: jobDescription }),

  createSupportTicket: (ticketData) => req('POST', '/support/ticket', ticketData),
  // Resume Builder Drafts & ATS Agent
  getDrafts: () => seekerReq('GET', '/api/v1/seeker/resume/drafts'),
  getDraft: (id) => seekerReq('GET', `/api/v1/seeker/resume/drafts/${id}`),
  createDraft: (b) => seekerReq('POST', '/api/v1/seeker/resume/drafts', b),
  updateDraft: (id, b) => seekerReq('PATCH', `/api/v1/seeker/resume/drafts/${id}`, b),
  deleteDraft: (id) => seekerReq('DELETE', `/api/v1/seeker/resume/drafts/${id}`),
  activateDraft: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return seekerReq('POST', `/api/v1/seeker/resume/drafts/${id}/activate`, fd, true);
  },
  exportDraftPdf: (id) => seekerReq('POST', `/api/v1/seeker/resume/drafts/${id}/export-pdf`),
  recommendTemplates: () => seekerReq('GET', '/api/v1/seeker/resume/recommend-templates'),
  atsCheck: (payload) => seekerReq('POST', '/api/agents/ats-check', payload),
  optimizeDraft: (payload) => seekerReq('POST', '/api/v1/seeker/resume/drafts/optimize', payload),
  enhanceDraft: (payload) => seekerReq('POST', '/api/v1/seeker/resume/drafts/enhance', payload),
  importFileDraft: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return seekerReq('POST', '/api/v1/seeker/resume/drafts/import-file', fd, true);
  },
  getVersions: (draftId) => seekerReq('GET', `/api/v1/seeker/resume/drafts/${draftId}/versions`),
  createVersion: (draftId, b) => seekerReq('POST', `/api/v1/seeker/resume/drafts/${draftId}/versions`, b),
  restoreVersion: (draftId, versionId) => seekerReq('POST', `/api/v1/seeker/resume/drafts/${draftId}/versions/${versionId}/restore`),



  // Jobs
  listJobs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return seekerReq('GET', `/api/v1/seeker/jobs${qs ? '?' + qs : ''}`);
  },
  getJob: (id) => seekerReq('GET', `/api/v1/seeker/jobs/${id}`),
  applyJob: (id, coverNote = '') =>
    seekerReq('POST', `/api/v1/seeker/jobs/${id}/apply`, { cover_note: coverNote }),
  generateCoverLetter: (b) => seekerReq('POST', '/api/v1/seeker/jobs/generate-cover-letter', b),
  
  // Saved Jobs / Bookmarks
  saveJob: (id, save = true) => seekerReq(save ? 'POST' : 'DELETE', `/api/v1/seeker/jobs/${id}/save`),
  getSavedJobs: () => seekerReq('GET', '/api/v1/seeker/jobs/saved'),

  // Companies
  listCompanies: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return seekerReq('GET', `/api/v1/seeker/companies${qs ? '?' + qs : ''}`);
  },
  getCompany: (id) => seekerReq('GET', `/api/v1/seeker/companies/${id}`),
  followCompany: (id, follow = true) => seekerReq(follow ? 'POST' : 'DELETE', `/api/v1/seeker/companies/${id}/follow`),
  getFollowedCompanies: () => seekerReq('GET', '/api/v1/seeker/companies/following'),

  // Applications
  getApplications: () => seekerReq('GET', '/api/v1/seeker/applications'),
  acceptOffer: (id) => seekerReq('POST', `/api/v1/seeker/applications/${id}/accept`),

  // Notifications
  getNotifications: () => seekerReq('GET', '/api/v1/seeker/notifications'),
  markRead: (id) => seekerReq('PATCH', `/api/v1/seeker/notifications/${id}/read`),
  markAllRead: () => seekerReq('POST', '/api/v1/seeker/notifications/read-all'),

  // Billing
  getBillingCurrent: () => seekerReq('GET', '/api/v1/seeker/billing/current'),
  billingSubscribe: (plan) => seekerReq('POST', '/api/v1/seeker/billing/subscribe', { plan }),
  billingVerify: (b) => seekerReq('POST', '/api/v1/seeker/billing/verify-payment', b),
  billingCancel: () => seekerReq('POST', '/api/v1/seeker/billing/cancel'),

  // Mock Practice Portal
  createMockAttempt: (attemptType) => seekerReq('POST', '/api/v1/seeker/mock-interview/create', { attempt_type: attemptType }),
  listMockAttempts: () => seekerReq('GET', '/api/v1/seeker/mock-interview/list'),
  getMockAttempt: (id) => seekerReq('GET', `/api/v1/seeker/mock-interview/${id}`),
  saveMockProgress: (id, payload) => seekerReq('POST', `/api/v1/seeker/mock-interview/${id}/progress`, payload),
  submitMockAttempt: (id, payload) => seekerReq('POST', `/api/v1/seeker/mock-interview/${id}/submit`, payload),
  transcribeAudio: (audioBlob) => {
    const fd = new FormData();
    fd.append("audio", audioBlob, "audio.webm");
    return seekerReq("POST", "/api/v1/seeker/mock-interview/transcribe-audio", fd, true);
  },
};

// ── PUBLIC API (no auth required) ──────────────────────────────────────────────
// For browsing jobs/companies without logging in

async function publicReq(method, path) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  const res = await fetch(`${API_HOST}${path}`, opts);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Request failed');
  return data.data;
}

export const publicAPI = {
  listCompanies: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return publicReq('GET', `/api/v1/public/companies${qs ? '?' + qs : ''}`);
  },
  getCompany: (id) => publicReq('GET', `/api/v1/public/companies/${id}`),
  getMarketTrends: () => publicReq('GET', '/api/v1/public/market-trends'),
  listJobs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return publicReq('GET', `/api/v1/public/jobs${qs ? '?' + qs : ''}`);
  },
  getJob: (id) => publicReq('GET', `/api/v1/public/jobs/${id}`),
  parseResume: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${API_HOST}/api/v1/public/parse-resume`, {
      method: "POST",
      body: fd,
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error || "Failed to parse resume");
        return data.data;
      });
  },
};

export const roundsAPI = {
  recommendRounds: (sessionId) => req("POST", `/sessions/${sessionId}/recommend-rounds`),
  createSessionRounds: (sessionId, rounds) => req("POST", `/sessions/${sessionId}/rounds`, { rounds }),
  getSessionRounds: (sessionId) => req("GET", `/sessions/${sessionId}/get-rounds`),
  getApplicantResults: (sessionId) => req("GET", `/sessions/${sessionId}/applicant-results`),
  generateInterviewQuestions: (sessionId, roundId, body) => req("POST", `/sessions/${sessionId}/rounds/${roundId}/generate-questions`, body),
  generateTestLinks: (sessionId, body) => req("POST", `/sessions/${sessionId}/generate-test-links`, body),
  uploadQuestionPaper: (file, sessionId, category, roundType = "mcq") => {
    const fd = new FormData();
    fd.append('file', file);
    if (sessionId) fd.append('session_id', sessionId);
    if (category) fd.append('category', category);
    if (roundType) fd.append('round_type', roundType);
    return req('POST', '/sessions/upload-question-paper', fd, true);
  },
};

const getTestHeaders = (isFile = false) => {
  const token = localStorage.getItem("vish_test_token") || "";
  const h = {};
  if (!isFile) h["Content-Type"] = "application/json";
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
};

async function testReq(method, path, body = null, isFile = false) {
  const opts = {
    method,
    headers: getTestHeaders(isFile),
    body: body ? (isFile ? body : JSON.stringify(body)) : undefined
  };
  const res = await fetch(`${API_HOST}/api/v1/test${path}`, opts);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Request failed");
  return data.data;
}

export const testAPI = {
  validateToken: (token) => {
    localStorage.setItem("vish_test_token", token);
    return testReq("POST", "/validate-token", { token });
  },
  getMcqQuestions: () => testReq("GET", "/mcq-questions"),
  submitMcq: (answers) => testReq("POST", "/submit-mcq", { answers }),
  getCodingProblems: () => testReq("GET", "/coding-problems"),
  runCode: (code, language, slug, customInput = "") => testReq("POST", "/run-code", { code, language, slug, custom_input: customInput }),
  submitCoding: (submissions) => testReq("POST", "/submit-coding", { submissions }),
  getInterviewQuestions: () => testReq("GET", "/interview-questions"),
  submitInterviewAnswer: (qIdx, text) => testReq("POST", "/submit-interview-answer", { question_index: qIdx, answer_text: text }),
  finalizeInterview: () => testReq("POST", "/finalize-interview"),
  saveProctoringFlag: (type, screenshot) => testReq("POST", "/proctoring-flag", { type, screenshot_base64: screenshot }),
  transcribeAudio: (audioBlob) => {
    const fd = new FormData();
    fd.append("audio", audioBlob, "audio.webm");
    return testReq("POST", "/transcribe-audio", fd, true);
  },
  mockSubmit: (token, score) => testReq("POST", `/mock-submit?token=${token}`, { score }),
  mockSwitchRound: (candidateId, roundNumber) => testReq("POST", "/mock-switch-round", { candidate_id: candidateId, round_number: roundNumber })
};

export const dynamicAPI = {
  get: () => req("GET", "/dynamic-data")
};




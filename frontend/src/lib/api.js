const BASE = process.env.NEXT_PUBLIC_API_URL ||
             "http://127.0.0.1:8000/api/v1"

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
    throw new Error(data.error || "Request failed")
  }
  return data.data
}

// AUTH
export const authAPI = {
  register: (b) => req("POST","/auth/register",b),
  login: async (email,password) => {
    const d = await req("POST","/auth/login",
                         {email,password})
    localStorage.setItem("vish_jwt",d.jwt_token)
    localStorage.setItem("vish_api_key",d.api_key||"")
    localStorage.setItem("vish_company",JSON.stringify(d))
    return d
  },
  logout: () => {
    localStorage.clear()
    window.location.href="/login"
  },
  generateKey: (b) => req("POST","/auth/api-keys/generate",b),
  getKeys: () => req("GET","/auth/api-keys"),
  deleteKey: (id) => req("DELETE",`/auth/api-keys/${id}`),
  getMe: () => req("GET","/auth/me")
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
    req("POST",`/sessions/${id}/match-all`)
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
  get: (sessionId,candId) =>
    req("GET",
      `/sessions/${sessionId}/candidates/${candId}`),
  action: (sessionId,candId,action) =>
    req("PATCH",
      `/sessions/${sessionId}/candidates/${candId}/action`,
      {action}),
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
      localStorage.getItem("vish_api_key")||""}`,
  reportUrl: (sessionId) =>
    `${BASE}/sessions/${sessionId}/export/report` +
    `?x_api_key=${localStorage.getItem("vish_api_key")||""}`
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



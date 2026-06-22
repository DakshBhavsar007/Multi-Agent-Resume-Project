import React from 'react';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Check, Zap, BarChart3, Users, Brain, Sparkles, ArrowRight, X, MapPin, Mail, Briefcase, CheckCircle, XCircle, ChevronDown, Trophy, Star, Award, Phone, History, Trash2, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

export default function SmartAnalyzerPage() {
  const [step, setStep] = useState('idle');
  const [jdText, setJdText] = useState('');
  const [resumes, setResumes] = useState([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [analysisStats, setAnalysisStats] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  
  // History list and navigation states
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);

  const loadHistory = async () => {
    setStep('history');
    setLoadingHistory(true);
    const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1");
    try {
      const headers = {};
      const apiKey = localStorage.getItem("vish_api_key");
      if (apiKey) headers["X-API-Key"] = String(apiKey).replace(/[^\x20-\x7E]/g, "");
      const jwt = localStorage.getItem("vish_jwt");
      if (jwt && jwt !== "undefined") headers["Authorization"] = `Bearer ${jwt}`;

      const res = await fetch(`${BASE}/sessions?status=analysis`, { headers });
      const data = await res.json();
      if (data.success) {
        // Filter sessions created by Smart Analyzer
        const list = (data.data || []).filter(s => 
          s.job_title === "Smart Analyzer Session" || 
          s.name.startsWith("Smart Analysis")
        );
        setHistoryList(list);
      } else {
        toast.error("Failed to retrieve analysis history");
      }
    } catch (e) {
      toast.error("Failed to connect to backend");
    } finally {
      setLoadingHistory(false);
    }
  };

  const viewHistoryResults = async (session) => {
    setStep('analyzing');
    setProgress(20);
    const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1");
    try {
      const headers = {};
      const apiKey = localStorage.getItem("vish_api_key");
      if (apiKey) headers["X-API-Key"] = String(apiKey).replace(/[^\x20-\x7E]/g, "");
      const jwt = localStorage.getItem("vish_jwt");
      if (jwt && jwt !== "undefined") headers["Authorization"] = `Bearer ${jwt}`;

      setProgress(50);
      
      // Load candidate list for the session
      const candRes = await fetch(`${BASE}/sessions/${session.id}/candidates?limit=100&sort_by=match_score&sort_order=desc`, { headers });
      const candResJson = await candRes.json();
      setProgress(80);

      if (candResJson.success) {
        const candidates = candResJson.data?.candidates || candResJson.data || [];
        setResults(candidates);
        
        const totalParsed = candidates.length;
        const avgScore = totalParsed > 0 ? Math.round(candidates.reduce((s, c) => s + (c.match_score || 0), 0) / totalParsed) : 0;
        const strongCount = candidates.filter(c => (c.match_score || 0) >= 70).length;
        setAnalysisStats({ 
          totalParsed, 
          avgScore, 
          strongCount, 
          sessionId: session.id,
          name: session.name 
        });
        setLoadedFromHistory(true);
      } else {
        throw new Error(candResJson.error || "Failed to load candidates");
      }

      setProgress(100);
      setTimeout(() => setStep('results'), 400);
    } catch (e) {
      toast.error(e.message || "Failed to load results");
      setStep('history');
    }
  };

  const deleteHistorySession = async (session) => {
    if (!window.confirm(`Are you sure you want to delete "${session.name}" from history?`)) return;
    const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1");
    try {
      const headers = { "Content-Type": "application/json" };
      const apiKey = localStorage.getItem("vish_api_key");
      if (apiKey) headers["X-API-Key"] = String(apiKey).replace(/[^\x20-\x7E]/g, "");
      const jwt = localStorage.getItem("vish_jwt");
      if (jwt && jwt !== "undefined") headers["Authorization"] = `Bearer ${jwt}`;

      // DELETE request with delete_candidates and hard_delete
      const res = await fetch(`${BASE}/sessions/${session.id}`, { 
        method: "DELETE", 
        headers,
        body: JSON.stringify({ delete_candidates: true, hard_delete: true })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Analysis deleted from history");
        setHistoryList(prev => prev.filter(s => s.id !== session.id));
      } else {
        toast.error(data.error || "Failed to delete analysis");
      }
    } catch (e) {
      toast.error("Failed to delete session");
    }
  };

  const onDrop = useCallback((files) => {
    setResumes(prev => [...prev, ...files]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'application/pdf': ['.pdf'], 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    },
  });

  const handleAnalysis = async () => {
    if (jdText.length < 30) { toast.error("Please enter a meaningful job description"); return; }
    if (resumes.length === 0) { toast.error("Upload at least one resume"); return; }

    setStep('analyzing');
    setProgress(0);

    const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1");

    // Step 1: Create a temporary session
    let progressVal = 5;
    setProgress(progressVal);

    try {
      const headers = {};
      const apiKey = localStorage.getItem("vish_api_key");
      if (apiKey) headers["X-API-Key"] = String(apiKey).replace(/[^\x20-\x7E]/g, "");
      const jwt = localStorage.getItem("vish_jwt");
      if (jwt && jwt !== "undefined") headers["Authorization"] = `Bearer ${jwt}`;

      // Create session
      headers["Content-Type"] = "application/json";
      const sessRes = await fetch(`${BASE}/sessions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: `Smart Analysis — ${new Date().toLocaleDateString()}`,
          job_title: "Smart Analyzer Session",
          job_description: jdText,
          rounds: [{ name: "Analysis", order: 1 }]
        })
      });
      const sessData = await sessRes.json();
      if (!sessData.success) throw new Error(sessData.error);
      const sessionId = sessData.data.id;
      progressVal = 15;
      setProgress(progressVal);

      // Infer skills from JD
      delete headers["Content-Type"];
      headers["Content-Type"] = "application/json";
      let inferredSkills = null;
      try {
        const infRes = await fetch(`${BASE}/sessions/${sessionId}/infer-skills`, {
          method: "POST", headers, body: JSON.stringify({ job_description: jdText })
        });
        const infData = await infRes.json();
        if (infData.success) {
          inferredSkills = infData.data;
        }
      } catch (e) { /* non-critical */ }

      // Set criteria
      try {
        await fetch(`${BASE}/sessions/${sessionId}/criteria`, {
          method: "POST", headers, body: JSON.stringify({
            required_skills: inferredSkills?.required_skills || [],
            nice_to_have: inferredSkills?.nice_to_have_skills || [],
            preferred_locations: inferredSkills?.preferred_locations || [],
            min_experience: inferredSkills?.minimum_experience_years || 0,
            min_match_score: 0,
            weights: { skills: 0.5, experience: 0.3, location: 0.2 }
          })
        });
      } catch (e) { /* non-critical */ }

      progressVal = 25;
      setProgress(progressVal);

      // Upload resumes
      delete headers["Content-Type"];
      const fd = new FormData();
      fd.append("session_id", sessionId);
      resumes.forEach(f => fd.append("files", f));

      const uploadHeaders = {};
      if (apiKey) uploadHeaders["X-API-Key"] = String(apiKey).replace(/[^\x20-\x7E]/g, "");
      if (jwt && jwt !== "undefined") uploadHeaders["Authorization"] = `Bearer ${jwt}`;

      const uploadRes = await fetch(`${BASE}/ingest/upload`, {
        method: "POST", headers: uploadHeaders, body: fd
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error);
      const jobId = uploadData.data.job_id;
      progressVal = 40;
      setProgress(progressVal);

      // Poll for job completion (< 10s per resume)
      headers["Content-Type"] = "application/json";
      let jobDone = false;
      let polls = 0;
      while (!jobDone && polls < 40) {
        polls++;
        await new Promise(r => setTimeout(r, 1500));
        const statusRes = await fetch(`${BASE}/ingest/status/${jobId}`, { headers });
        const statusData = await statusRes.json();
        if (statusData.success) {
          const status = statusData.data;
          const pct = status.progress_percent || 0;
          progressVal = Math.min(40 + (pct * 0.4), 80); // 40-80%
          setProgress(progressVal);
          if (status.status === "done" || status.status === "failed") {
            jobDone = true;
          }
        }
      }

      progressVal = 82;
      setProgress(progressVal);

      // Match all
      const matchRes = await fetch(`${BASE}/sessions/${sessionId}/match-all`, {
        method: "POST", headers
      });
      const matchData = await matchRes.json();

      if (matchData.success && matchData.data?.job_id) {
        // Poll match job
        const matchJobId = matchData.data.job_id;
        let matchDone = false;
        let mPolls = 0;
        while (!matchDone && mPolls < 20) {
          mPolls++;
          await new Promise(r => setTimeout(r, 1000));
          const mStatus = await fetch(`${BASE}/ingest/status/${matchJobId}`, { headers });
          const mData = await mStatus.json();
          if (mData.success && (mData.data.status === "done" || mData.data.status === "failed")) {
            matchDone = true;
          }
          progressVal = Math.min(82 + (mPolls * 1), 95);
          setProgress(progressVal);
        }
      }

      progressVal = 96;
      setProgress(progressVal);

      // Fetch final results
      const candRes = await fetch(`${BASE}/sessions/${sessionId}/candidates?limit=100&sort_by=match_score&sort_order=desc`, { headers });
      const candResJson = await candRes.json();
      if (candResJson.success) {
        const candidates = candResJson.data?.candidates || candResJson.data || [];
        setResults(candidates);
        
        const totalParsed = candidates.length;
        const avgScore = totalParsed > 0 ? Math.round(candidates.reduce((s, c) => s + (c.match_score || 0), 0) / totalParsed) : 0;
        const strongCount = candidates.filter(c => (c.match_score || 0) >= 70).length;
        setAnalysisStats({ 
          totalParsed, 
          avgScore, 
          strongCount, 
          sessionId,
          name: `Smart Analysis — ${new Date().toLocaleDateString()}`
        });
        setLoadedFromHistory(false);
      }
      
      setProgress(100);
      setTimeout(() => setStep('results'), 600);

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Analysis failed");
      setStep('idle');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-500";
  };

  const getScoreBg = (score) => {
    if (score >= 75) return "from-green-500 to-emerald-600";
    if (score >= 50) return "from-amber-500 to-orange-500";
    return "from-red-400 to-rose-500";
  };

  const getRankBadge = (index) => {
    if (index === 0) return <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/40"><Trophy size={18} className="text-white" /></div>;
    if (index === 1) return <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center shadow-lg"><Star size={18} className="text-white" /></div>;
    if (index === 2) return <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg"><Award size={18} className="text-white" /></div>;
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Hero Header */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-purple-500/5 rounded-3xl -z-10" />
        <div className="pt-2 pb-4">
          <div className="flex items-center gap-2 text-accent font-bold text-sm uppercase tracking-[0.2em] mb-2">
            <Sparkles size={16} className="animate-pulse" /> AI-Powered Recruitment Intelligence
          </div>
          <h1 className="text-4xl font-extrabold text-[#2A2A2A] tracking-tight">
            Smart Analyzer
          </h1>
          <p className="text-gray-500 text-lg mt-1 font-medium">
            Upload resumes + paste a job description → Instant AI-scored rankings with deep insights.
          </p>
        </div>
      </header>

      {/* Navigation Tabs */}
      {(step === 'idle' || step === 'uploading' || step === 'history') && (
        <div className="flex border-b border-gray-200/85 gap-6 mb-2">
          <button
            onClick={() => setStep('idle')}
            className={`pb-3 text-sm font-bold tracking-wide transition-all relative ${
              (step === 'idle' || step === 'uploading')
                ? 'text-accent'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Brain size={16} />
              <span>New Analysis</span>
            </div>
            {(step === 'idle' || step === 'uploading') && (
              <motion.div
                layoutId="activeSmartAnalyzerTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            onClick={loadHistory}
            className={`pb-3 text-sm font-bold tracking-wide transition-all relative ${
              step === 'history' ? 'text-accent' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <History size={16} />
              <span>Analysis History</span>
            </div>
            {step === 'history' && (
              <motion.div
                layoutId="activeSmartAnalyzerTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {(step === 'idle' || step === 'uploading') && (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* JD INPUT */}
              <motion.div
                className={`p-7 rounded-2xl bg-white border-2 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.04)] ${jdText.length > 30 ? 'border-green-400 shadow-green-500/10' : 'border-gray-100'}`}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-black text-[#2A2A2A] flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><FileText size={16} className="text-accent" /></div>
                    Job Description
                  </h2>
                  {jdText.length > 30 && <div className="bg-green-100 text-green-700 p-1.5 rounded-full"><Check size={14} strokeWidth={3} /></div>}
                </div>

                <textarea
                  className="w-full h-56 p-4 rounded-xl bg-[#FAFAFA] border-2 border-gray-100 focus:border-accent focus:ring-0 focus:outline-none resize-none text-sm font-medium text-[#2A2A2A] placeholder:text-gray-400 transition-colors"
                  placeholder="Paste the full job description here... Include required skills, experience level, and responsibilities to get the most accurate analysis."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {jdText.length > 30 ? `✓ ${jdText.split(/\s+/).length} words detected` : 'Minimum 30 characters required'}
                  </span>
                </div>
              </motion.div>

              {/* RESUME UPLOAD */}
              <motion.div
                className={`p-7 rounded-2xl bg-white border-2 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.04)] ${resumes.length > 0 ? 'border-accent/50' : 'border-gray-100'}`}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-lg font-black text-[#2A2A2A] flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center"><Brain size={16} className="text-accent" /></div>
                  Candidate Resumes
                </h2>

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl h-56 flex flex-col items-center justify-center transition-all cursor-pointer group ${
                    isDragActive ? 'border-accent bg-accent/5 scale-[1.02]' : 'border-gray-200 bg-[#FAFAFA] hover:bg-blue-50/30 hover:border-accent/40'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-lg transition-all">
                    <Upload className="text-accent" size={28} />
                  </div>
                  <p className="font-bold text-gray-600 group-hover:text-accent transition-colors">
                    {isDragActive ? 'Drop files here...' : 'Drag & Drop Resumes'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 font-medium">PDF, DOCX, and TXT supported • No limit</p>
                </div>

                <AnimatePresence>
                  {resumes.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4"
                    >
                      <div className="p-3.5 bg-accent/5 border border-accent/15 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3 text-accent font-bold text-sm">
                          <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center text-xs font-black">
                            {resumes.length}
                          </div>
                          {resumes.length === 1 ? 'Resume Ready' : 'Resumes Ready'}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setResumes([]); }} className="text-xs font-bold text-red-500 hover:underline">
                          Clear All
                        </button>
                      </div>

                      <div className="mt-2 max-h-24 overflow-y-auto space-y-1 custom-scrollbar">
                        {resumes.map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-xs text-gray-500 px-2 py-1 bg-white rounded-lg border border-gray-100">
                            <span className="truncate font-medium">{f.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); setResumes(prev => prev.filter((_, idx) => idx !== i)); }} className="text-gray-400 hover:text-red-500 ml-2 shrink-0">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* CTA */}
              <div className="lg:col-span-2 flex justify-center pt-4">
                <motion.button
                  onClick={handleAnalysis}
                  disabled={jdText.length < 30 || resumes.length === 0}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="group relative px-12 py-4 bg-gradient-to-r from-accent to-[#1D4ED8] text-white rounded-2xl text-lg font-black shadow-xl shadow-accent/30 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed transition-all"
                >
                  <span className="flex items-center gap-3">
                    <Brain size={22} /> Start Analysis
                    <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-[#2A2A2A]">Analysis History</h2>
                <p className="text-gray-500 font-medium text-sm mt-0.5">
                  View and manage previously run resume evaluations.
                </p>
              </div>
              <button
                onClick={loadHistory}
                disabled={loadingHistory}
                className="px-4 py-2 border border-gray-200 hover:border-accent/30 rounded-xl font-bold text-gray-500 hover:text-accent transition-all text-xs flex items-center gap-2 bg-white shadow-sm"
              >
                <span>Refresh List</span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-gradient-to-r from-gray-50 to-gray-100/50 animate-pulse rounded-2xl border border-gray-100"
                  />
                ))}
              </div>
            ) : historyList.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {historyList.map((session) => (
                  <motion.div
                    key={session.id}
                    className="p-5 rounded-2xl bg-white border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:border-accent/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <History size={22} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[#2A2A2A] text-base group-hover:text-accent transition-colors">
                          {session.name || 'Untitled Analysis'}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Calendar size={13} className="text-gray-300" />
                            {session.created_at ? new Date(session.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Unknown Date'}
                          </span>
                          <span className="inline-flex items-center bg-[#E0E7FF] text-[#4F46E5] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                            {session.total_candidates || 0} candidate{(session.total_candidates !== 1) ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => viewHistoryResults(session)}
                        className="px-4 py-2.5 bg-accent hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-black transition-all shadow-md shadow-accent/15 active:scale-95"
                      >
                        View Results
                      </button>
                      <button
                        onClick={() => deleteHistorySession(session)}
                        className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete from History"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-gray-100 min-h-[350px] shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 text-gray-300">
                  <History size={32} />
                </div>
                <h3 className="text-lg font-bold text-[#2A2A2A] mb-1">No analysis history</h3>
                <p className="text-sm font-medium text-gray-400 mb-6 text-center max-w-sm">
                  You haven't run any smart analyses yet or they've been deleted.
                </p>
                <button
                  onClick={() => setStep('idle')}
                  className="bg-accent hover:bg-[#1D4ED8] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md shadow-accent/20 text-sm active:scale-95"
                >
                  Start New Analysis
                </button>
              </div>
            )}
          </motion.div>
        )}

        {step === 'analyzing' && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[55vh] flex flex-col items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="mb-8"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent to-amber-600 flex items-center justify-center shadow-2xl shadow-accent/40">
                <Zap size={44} className="text-white" />
              </div>
            </motion.div>

            <h2 className="text-3xl font-black text-[#2A2A2A] mb-2">Analyzing {resumes.length} Resume{resumes.length > 1 ? 's' : ''}...</h2>
            <p className="text-gray-500 font-medium mb-8">AI is parsing, normalizing skills, and scoring candidates</p>

            <div className="w-full max-w-lg">
              <div className="flex justify-between text-xs font-black text-gray-400 mb-2 uppercase tracking-wider">
                <span>Progress</span>
                <span className="text-accent">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent to-amber-500 rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div className="mt-10 space-y-3 w-full max-w-sm">
              {[
                { text: "Extracting skills from JD", done: progress > 15 },
                { text: "Parsing resume content (OCR + LLM)", done: progress > 35 },
                { text: "Normalizing skills against taxonomy", done: progress > 55 },
                { text: "Computing multi-factor match scores", done: progress > 80 },
                { text: "Ranking candidates", done: progress > 95 },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className={`flex items-center gap-3 text-sm font-bold transition-all duration-500 ${s.done ? 'text-[#2A2A2A]' : 'text-gray-300'}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 ${s.done ? 'bg-green-500 text-white scale-100' : 'bg-gray-100 scale-90'}`}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                  {s.text}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Overview */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
              <div>
                <h2 className="text-3xl font-black text-[#2A2A2A]">{analysisStats?.name || "Analysis Complete"}</h2>
                <p className="text-gray-500 font-medium mt-1">{results.length} candidate{results.length !== 1 ? 's' : ''} ranked by AI-powered multi-factor scoring</p>
              </div>
              <div className="flex items-center gap-3">
                {loadedFromHistory && (
                  <button 
                    onClick={() => { setStep('history'); }} 
                    className="px-6 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors text-sm flex items-center gap-1.5"
                  >
                    <span>← Back to History</span>
                  </button>
                )}
                <button 
                  onClick={() => { setStep('idle'); setResults([]); setResumes([]); setJdText(''); setProgress(0); setLoadedFromHistory(false); }} 
                  className="px-6 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors text-sm"
                >
                  ↻ New Analysis
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            {analysisStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Parsed", value: analysisStats.totalParsed, color: "text-[#2A2A2A]", bg: "bg-gray-50" },
                  { label: "Avg Score", value: `${analysisStats.avgScore}%`, color: "text-accent", bg: "bg-blue-50" },
                  { label: "Strong Match", value: analysisStats.strongCount, color: "text-green-600", bg: "bg-green-50" },
                  { label: "Processing", value: "<10s", color: "text-blue-600", bg: "bg-blue-50" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center"
                  >
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{stat.label}</div>
                    <div className={`text-3xl font-black ${stat.color}`}>{stat.value}</div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Results List */}
            <div className="space-y-4">
              {results.map((cand, i) => {
                const score = cand.match_score || 0;
                const isExpanded = expandedId === cand.id;
                const matchedSkills = cand.matched_skills || [];
                const missingSkills = cand.missing_skills || [];
                const otherSkills = cand.other_skills || [];
                const experience = cand.experience || [];
                const education = cand.education || [];

                return (
                  <motion.div
                    key={cand.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden"
                  >
                    <div
                      className="p-5 flex items-center gap-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : cand.id)}
                    >
                      {/* Rank */}
                      <div className="relative">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getScoreBg(score)} text-white flex items-center justify-center font-black text-lg shadow-lg`}>
                          #{i + 1}
                        </div>
                        {getRankBadge(i)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-[#2A2A2A] text-[16px] truncate">{cand.name || 'Unnamed'}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-medium">
                          {cand.current_role && <span className="text-accent font-semibold truncate">{cand.current_role}</span>}
                          {cand.location && <span className="flex items-center gap-1"><MapPin size={10} /> {cand.location}</span>}
                          {cand.experience_years > 0 && <span className="flex items-center gap-1"><Briefcase size={12} className="text-gray-400 shrink-0" /> {cand.experience_years} yrs</span>}
                        </div>
                      </div>

                      {/* Matched Skills Preview */}
                      <div className="hidden md:flex gap-1.5 max-w-[250px] overflow-hidden">
                        {matchedSkills.slice(0, 4).map((s, j) => (
                          <span key={j} className="bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                            {s}
                          </span>
                        ))}
                        {matchedSkills.length > 4 && <span className="text-[10px] font-bold text-gray-400 self-center">+{matchedSkills.length - 4}</span>}
                      </div>

                      {/* Score */}
                      <div className="text-right shrink-0">
                        <div className={`text-2xl font-black ${getScoreColor(score)}`}>
                          {score}<span className="text-sm">%</span>
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                          {cand.recommendation || (score >= 70 ? 'Strong' : score >= 40 ? 'Moderate' : 'Weak')}
                        </div>
                      </div>

                      {/* Expand */}
                      <ChevronDown size={18} className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-2 border-t border-gray-100 space-y-5">
                            {/* Scores Breakdown */}
                            <div className="grid grid-cols-3 gap-4">
                              {[
                                { label: "Skills", value: cand.skill_score || 0 },
                                { label: "Experience", value: cand.experience_score || 0 },
                                { label: "Location", value: cand.location_score || 0 },
                              ].map((sc, j) => (
                                <div key={j} className="flex flex-col">
                                  <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">
                                    <span>{sc.label}</span><span className="text-accent">{sc.value}%</span>
                                  </div>
                                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-accent rounded-full" style={{ width: `${sc.value}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Skills */}
                            {(matchedSkills.length > 0 || missingSkills.length > 0 || otherSkills.length > 0) && (
                              <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Skills Analysis</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {matchedSkills.map((s, j) => (
                                    <span key={`m${j}`} className="bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1">
                                      <CheckCircle size={11} className="text-green-500" /> {s}
                                    </span>
                                  ))}
                                  {missingSkills.map((s, j) => (
                                    <span key={`x${j}`} className="bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1">
                                      <XCircle size={11} className="text-red-400" /> {s}
                                    </span>
                                  ))}
                                  {otherSkills.map((s, j) => (
                                    <span key={`o${j}`} className="bg-gray-50 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">{s}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Contact */}
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-medium">
                              {cand.email && <span className="flex items-center gap-1.5"><Mail size={12} className="text-gray-400" /> {cand.email}</span>}
                              {cand.phone && <span className="flex items-center gap-1.5"><Phone size={12} className="text-gray-400 shrink-0" /> {cand.phone}</span>}
                            </div>

                            {/* Experience */}
                            {experience.length > 0 && (
                              <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Experience</h4>
                                <div className="space-y-2">
                                  {experience.slice(0, 3).map((exp, j) => (
                                    <div key={j} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                      <div className="font-bold text-xs text-[#2A2A2A]">{exp.role || exp.title}</div>
                                      <div className="text-[10px] text-accent font-semibold">{exp.company}</div>
                                      <div className="text-[10px] text-gray-400">{exp.start_date} — {exp.end_date || 'Present'}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Education */}
                            {education.length > 0 && (
                              <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Education</h4>
                                <div className="flex flex-wrap gap-2">
                                  {education.map((edu, j) => (
                                    <div key={j} className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 text-xs">
                                      <span className="font-bold text-[#2A2A2A]">{edu.degree}</span>
                                      {edu.institution && <span className="text-gray-500 ml-1">— {edu.institution}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {results.length === 0 && (
                <div className="text-center py-16 text-gray-400 font-bold">
                  No candidates parsed. Ensure your resumes are valid PDF/DOCX files.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

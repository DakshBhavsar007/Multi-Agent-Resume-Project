import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Upload, Archive, Mail, Link as LinkIcon, Download, Zap, Settings, RefreshCw, X, ChevronDown, Check, Trash2, Building, Users, BarChart3, Search, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

import { sessionsAPI, ingestAPI, candidatesAPI, exportAPI } from '../lib/api';
import { useIngestStore } from '../stores/ingestStore';
import { useCandidateStore } from '../stores/candidateStore';

import CandidateCard from '../components/CandidateCard';
import PremiumBadge from '../components/PremiumBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';

const TagInput = ({ tags, onChange, placeholder, tagColor }) => {
  const [input, setInput] = useState("");
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.trim();
      if (val && !tags.includes(val)) {
        onChange([...tags, val]);
      }
      setInput("");
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const getPillColor = () => {
    switch(tagColor) {
      case 'amber': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'gray': default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="w-full flex flex-wrap items-center gap-2 p-2 border-[1.5px] border-gray-200 rounded-lg bg-white focus-within:border-accent transition-colors">
      {tags.map((tag, idx) => (
        <div key={idx} className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-sm font-medium ${getPillColor()}`}>
          {tag}
          <button type="button" onClick={() => removeTag(idx)} className="hover:opacity-70 ml-1 focus:outline-none">
            <X size={14} />
          </button>
        </div>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : "Add more..."}
        className="flex-1 min-w-[120px] bg-transparent focus:outline-none text-sm text-charcoal py-1"
      />
    </div>
  );
};

export default function SessionWorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { jobs, addJob, updateJob, removeJob } = useIngestStore();
  const { highlightedIds } = useCandidateStore();

  const [activeTab, setActiveTab] = useState("upload");
  const [activeRound, setActiveRound] = useState(null);
  const [filters, setFilters] = useState({ search: "", location: "", min_score: 0, skill: "", sort: "Match Score ↓" });
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [driveUrl, setDriveUrl] = useState("");
  const [atsFile, setAtsFile] = useState(null);
  const [googleType, setGoogleType] = useState("drive"); 
  const [atsFormat, setAtsFormat] = useState("csv"); 

  const { data: session, isLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: () => sessionsAPI.get(id)
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editJobDescription, setEditJobDescription] = useState("");
  const [editRequiredSkills, setEditRequiredSkills] = useState([]);
  const [editNiceToHave, setEditNiceToHave] = useState([]);
  const [editPreferredLocations, setEditPreferredLocations] = useState([]);
  const [editMinExperience, setEditMinExperience] = useState(0);
  const [editMinMatchScore, setEditMinMatchScore] = useState(60);
  const [editSalaryMin, setEditSalaryMin] = useState("");
  const [editSalaryMax, setEditSalaryMax] = useState("");
  const [editSalaryCurrency, setEditSalaryCurrency] = useState("USD");
  const [editRounds, setEditRounds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);

  useEffect(() => {
    if (session && isEditModalOpen) {
      setEditName(session.name || "");
      setEditJobTitle(session.job_title || "");
      setEditJobDescription(session.job_description || "");
      const criteria = session.criteria || {};
      setEditRequiredSkills(criteria.required_skills || []);
      setEditNiceToHave(criteria.nice_to_have || []);
      setEditPreferredLocations(criteria.preferred_locations || []);
      setEditMinExperience(criteria.min_experience || 0);
      setEditMinMatchScore(criteria.min_match_score || 60);
      setEditSalaryMin(criteria.salary_min !== undefined && criteria.salary_min !== null ? criteria.salary_min : "");
      setEditSalaryMax(criteria.salary_max !== undefined && criteria.salary_max !== null ? criteria.salary_max : "");
      setEditSalaryCurrency(criteria.salary_currency || "USD");
      setEditRounds(session.rounds || []);
    }
  }, [session, isEditModalOpen]);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // 1. Update session details
      await sessionsAPI.update(id, {
        name: editName,
        job_title: editJobTitle,
        job_description: editJobDescription,
        rounds: editRounds.map(r => ({
          name: r.name,
          interviewer: r.interviewer,
          order: r.order,
          result_announcement_date: r.result_announcement_date
        }))
      });

      // 2. Update criteria
      const weights = session.criteria?.weights || { skills: 0.5, experience: 0.3, location: 0.2 };
      await sessionsAPI.setCriteria(id, {
        required_skills: editRequiredSkills,
        nice_to_have: editNiceToHave,
        preferred_locations: editPreferredLocations,
        min_experience: Number(editMinExperience),
        min_match_score: Number(editMinMatchScore),
        salary_min: editSalaryMin !== "" ? Number(editSalaryMin) : null,
        salary_max: editSalaryMax !== "" ? Number(editSalaryMax) : null,
        salary_currency: editSalaryCurrency,
        weights
      });

      toast.success("Session updated successfully!");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({ queryKey: ["candidates", id] });
      queryClient.invalidateQueries({ queryKey: ["all_candidates", id] });
    } catch (e) {
      toast.error(e.message || "Failed to update session");
    } finally {
      setIsSaving(false);
    }
  };

  // Sync activeRound with session data once loaded, prioritizing URL query parameter
  useEffect(() => {
    if (session && session.rounds?.length > 0 && activeRound === null) {
      const params = new URLSearchParams(location.search);
      const roundParam = params.get("round");
      if (roundParam) {
        const parsedRound = parseInt(roundParam);
        if (!isNaN(parsedRound)) {
          setActiveRound(parsedRound);
          return;
        } else if (roundParam === "hired" || roundParam === "rejected") {
          setActiveRound(roundParam);
          return;
        }
      }
      setActiveRound(session.rounds[0].order);
    }
  }, [session, activeRound, location.search]);

  // Sync tab and search filters from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const candNameParam = params.get("cand_name");
    if (tabParam) {
      setActiveTab(tabParam);
    }
    if (candNameParam) {
      setFilters(prev => ({ ...prev, search: decodeURIComponent(candNameParam) }));
    }
  }, [location.search]);

  const buildQS = () => {
    const params = new URLSearchParams();
    if (activeRound === "hired") {
      params.set("status", "hired");
    } else if (activeRound === "rejected") {
      params.set("status", "rejected");
    } else {
      if (activeRound !== null) {
        params.set("round_index", activeRound.toString());
      }
      // Include "new" status so freshly uploaded candidates appear
      params.set("status", "new,active,forwarded");
    }
    if (filters.search) params.set("search", filters.search);
    if (filters.min_score) params.set("min_score", filters.min_score.toString());
    if (filters.location) params.set("location", filters.location);
    if (filters.sort) params.set("sort", filters.sort);
    return "?" + params.toString();
  };

  const { data: candidatesData } = useQuery({
    queryKey: ["candidates", id, activeRound, filters],
    queryFn: () => candidatesAPI.list(id, buildQS()),
    refetchInterval: 15000,
    enabled: activeTab === "candidates" || activeTab === "analytics"
  });

  const { data: allCandidatesData } = useQuery({
    queryKey: ["all_candidates", id],
    queryFn: () => candidatesAPI.list(id, "?limit=1000"),
    enabled: !!id
  });

  useEffect(() => {
    const activeJobs = Object.values(jobs);
    if (activeJobs.length === 0) return;

    const interval = setInterval(() => {
      activeJobs.forEach(job => {
        if (job.status !== "done" && job.status !== "failed") {
          ingestAPI.getStatus(job.id).then(data => {
            updateJob(job.id, data);
            if (data.status === "done" || data.status === "failed") {
              if (data.status === "done") {
                if (data.job_type === "match_all") {
                  toast.success(`Matched ${data.processed_files || 0} candidates successfully!`);
                } else {
                  toast.success(`${data.processed_files || 0} resumes processed!`);
                }
                queryClient.invalidateQueries({ queryKey: ["candidates", id] });
                queryClient.invalidateQueries({ queryKey: ["all_candidates", id] });
                queryClient.invalidateQueries({ queryKey: ["session", id] });
              }
              setTimeout(() => removeJob(job.id), 5000);
            }
          }).catch(err => console.error("Poll error:", err));
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs, updateJob, removeJob, queryClient, id]);

  const onDropDirect = (acceptedFiles) => {
    const cleanFiles = acceptedFiles.map(f => new File([f], f.name, { type: f.type }));
    setSelectedFiles(prev => [...prev, ...cleanFiles]);
  };
  const { getRootProps: getDirectProps, getInputProps: getDirectInput } = useDropzone({
    onDrop: onDropDirect,
    accept: { 
      'application/pdf': ['.pdf'], 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    }
  });

  const onDropZip = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    try {
      const { job_id } = await ingestAPI.uploadZip(id, acceptedFiles[0]);
      addJob(job_id, "zip");
      toast.success("ZIP upload started!");
    } catch(e) {
      toast.error(e.message);
    }
  };
  const { getRootProps: getZipProps, getInputProps: getZipInput } = useDropzone({
    onDrop: onDropZip,
    accept: { 'application/zip': ['.zip'] },
    maxFiles: 1
  });

  const { getRootProps: getAtsProps, getInputProps: getAtsInput } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) setAtsFile(acceptedFiles[0]);
    },
    accept: { 'text/csv': ['.csv'], 'application/json': ['.json'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1
  });

  useEffect(() => {
    const handleMessage = async (e) => {
      if (e.data.type === "GMAIL_AUTH_CODE") {
        try {
          await ingestAPI.connectGmail({ session_id: id, auth_code: e.data.code });
          queryClient.invalidateQueries({ queryKey: ["session", id] });
          toast.success("Gmail connected!");
        } catch(err) {
          toast.error("Failed to connect Gmail");
        }
      } else if (e.data.type === "GDRIVE_AUTH_CODE") {
        try {
          await ingestAPI.connectGDrive({ session_id: id, folder_url: driveUrl, auth_code: e.data.code });
          toast.success("Google Drive connected!");
          const { job_id } = await ingestAPI.syncGDrive({ session_id: id });
          addJob(job_id, "gdrive");
          toast.success("Google Drive sync started!");
        } catch(err) {
          toast.error("Failed to connect or sync Google Drive. Provide a valid Drive folder URL.");
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [id, queryClient, driveUrl, addJob]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="space-y-2">
          <LoadingSkeleton width="250px" height="28px" />
          <LoadingSkeleton width="180px" height="18px" />
        </div>
        <div className="flex gap-4 border-b border-gray-200 pb-4 mt-6">
          <LoadingSkeleton width="100px" height="32px" borderRadius="10px" />
          <LoadingSkeleton width="100px" height="32px" borderRadius="10px" />
          <LoadingSkeleton width="100px" height="32px" borderRadius="10px" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="md:col-span-2 space-y-4">
            <LoadingSkeleton width="100%" height="200px" borderRadius="16px" />
            <LoadingSkeleton width="100%" height="150px" borderRadius="16px" />
          </div>
          <div className="space-y-4">
            <LoadingSkeleton width="100%" height="380px" borderRadius="16px" />
          </div>
        </div>
      </div>
    );
  }
  if (!session) return <div className="p-8 h-[calc(100vh-60px)] flex items-center justify-center font-bold text-gray-400">Session not found.</div>;

  const handleMatchAll = async () => {
    try {
      toast("Matching all candidates...", { icon: "ℹ️" });
      const { job_id } = await sessionsAPI.matchAll(id);
      addJob(job_id, "match_all");
    } catch(e) { toast.error(e.message); }
  };

  const handleEndSession = async () => {
    if (window.confirm("Are you sure you want to end this session?")) {
      try {
        await sessionsAPI.update(id, { status: "completed" });
        queryClient.invalidateQueries({ queryKey: ["session", id] });
        toast.success("Session completed.");
      } catch(e) { toast.error(e.message); }
    }
  };

  const candidatesList = Array.isArray(candidatesData?.candidates)
    ? candidatesData.candidates
    : Array.isArray(candidatesData)
      ? candidatesData
      : [];
  const validRoundIndex = session.rounds?.findIndex(r => r.order === session.current_round);
  const currentRoundIndex = validRoundIndex !== undefined && validRoundIndex !== -1 ? validRoundIndex : 0;

  // Analytics Computations
  const allCandidatesList = Array.isArray(allCandidatesData?.candidates)
    ? allCandidatesData.candidates
    : Array.isArray(allCandidatesData)
      ? allCandidatesData
      : [];

  const totalParsed = allCandidatesList.length;
  const hiredFinal = allCandidatesList.filter(c => c.status === "hired").length;
  const rejectedCount = allCandidatesList.filter(c => c.status === "rejected").length;
  const scoredActive = totalParsed - hiredFinal - rejectedCount;
  const avgMatchScore = totalParsed ? Math.round(allCandidatesList.reduce((acc, c) => acc + (c.match_score || 0), 0) / totalParsed) : 0;

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 bg-cream flex flex-col hide-scrollbar">
        
        {/* HEADER */}
        <div>
          <h1 className="text-[24px] font-bold text-charcoal">{session.name}</h1>
          <p className="text-base text-gray-500 mt-0.5">{session.job_title}</p>
          
          <div className="flex justify-between items-center mt-4 border-b border-gray-200 pb-4">
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${
                session.status === "completed" ? "bg-blue-100 text-blue-700 border-blue-200" :
                session.status === "archived" ? "bg-gray-200 text-gray-700 border-gray-300" :
                "bg-green-100 text-green-700 border-green-200"
              }`}>
                {session.status || "Active"}
              </span>
              <span className="text-sm font-semibold text-charcoal bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                Round {currentRoundIndex + 1} of {session.rounds?.length || 1}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleMatchAll} className="bg-accent hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 shadow-sm">
                <Zap size={16} fill="currentColor" /> Match All
              </button>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="border-[1.5px] border-accent text-accent hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 bg-white shadow-sm"
              >
                <Settings size={16} /> Edit Session
              </button>
              <button 
                onClick={() => {
                  const url = exportAPI.candidatesUrl(id);
                  if (url) window.open(url);
                }} 
                className="border-[1.5px] border-accent text-accent hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 bg-white"
              >
                <Download size={16} /> Export Hired
              </button>
              <button 
                onClick={() => {
                  const url = `${window.location.origin}/jobs/${id}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Public Apply Link copied to clipboard!");
                }}
                className="border-[1.5px] border-accent text-accent hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 bg-white"
              >
                <LinkIcon size={16} /> Copy Apply Link
              </button>
              {session.status !== "completed" && (
                <button onClick={handleEndSession} className="border-[1.5px] border-red-500 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 bg-white">
                  <X size={16} /> End Session
                </button>
              )}
              <button 
                onClick={async () => {
                  if (window.confirm(`Permanently delete session "${session.name}"? This will delete all candidates and cannot be undone.`)) {
                    try {
                      await sessionsAPI.delete(id, { delete_candidates: true, hard_delete: true });
                      toast.success('Session deleted');
                      navigate('/dashboard/sessions');
                    } catch(e) { toast.error(e.message); }
                  }
                }} 
                className="border-[1.5px] border-red-500 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1.5 bg-white"
              >
                <Trash2 size={16} /> Delete Session
              </button>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-8 mt-4">
          {[
            { id: "upload", label: "Upload Resumes", icon: <Upload size={16} className="inline mr-2" /> },
            { id: "candidates", label: "Candidates", icon: <Users size={16} className="inline mr-2" /> },
            { id: "analytics", label: "Analytics", icon: <BarChart3 size={16} className="inline mr-2" /> }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`pb-3 pt-2 text-[15px] font-bold transition-colors border-b-[3px] relative top-[2px] flex items-center ${
                activeTab === t.id ? "border-accent text-accent" : "border-transparent text-gray-500 hover:text-charcoal"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="border-b border-gray-200 mb-6 -mt-[2px]"></div>

        {/* TAB CONTENTS */}
        <div className="flex-1 flex flex-col pb-12">
          
          {/* UPLOAD TAB */}
          {activeTab === "upload" && (
             <div className="max-w-4xl space-y-6">
                <h3 className="text-xl font-black text-charcoal tracking-tight">How would you like to add candidates?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Direct Upload */}
                  <div className="bg-white rounded-2xl p-6 border-2 border-transparent hover:border-accent transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <Upload size={32} className="text-accent mb-3" />
                    <h4 className="font-bold text-charcoal text-lg mb-1">Direct Upload</h4>
                    <p className="text-xs text-charcoal mb-4 font-medium">Upload PDF, DOCX, or TXT files or drag an entire folder</p>
                    <div {...getDirectProps()} className="border-2 border-dashed border-[#2563EB] rounded-xl h-[120px] flex items-center justify-center bg-blue-50/40 hover:bg-blue-50 cursor-pointer transition-colors relative overflow-hidden">
                      <input {...getDirectInput()} webkitdirectory="true" directory="" />
                      <p className="text-sm font-bold text-accent">Drop files here or click to browse</p>
                    </div>
                    {selectedFiles.length > 0 && (
                      <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-black text-charcoal">{selectedFiles.length} files selected</span>
                          <button onClick={() => setSelectedFiles([])} className="text-[10px] uppercase font-bold tracking-wider text-red-500 hover:underline">Clear all</button>
                        </div>
                        <ul className="max-h-32 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                          {selectedFiles.slice(0,5).map((f, i) => (
                            <li key={i} className="text-xs text-charcoal font-medium flex justify-between bg-white border border-gray-100 p-2 rounded-lg py-1.5">
                              <span className="truncate pr-2">{f.name}</span>
                              <span className="text-gray-400 font-mono">{(f.size / 1024).toFixed(0)}KB</span>
                            </li>
                          ))}
                          {selectedFiles.length > 5 && <li className="text-[10px] text-gray-400 pt-1 font-bold text-center italic">+ {selectedFiles.length - 5} more files</li>}
                        </ul>
                        <button onClick={async () => {
                          try {
                            const { job_id } = await ingestAPI.uploadFiles(id, selectedFiles);
                            addJob(job_id, "upload");
                            setSelectedFiles([]);
                            toast.success("Upload started!");
                          } catch (e) { toast.error(e.message); }
                        }} className="w-full mt-4 bg-accent text-white py-2.5 rounded-lg text-sm font-bold hover:bg-[#1D4ED8] shadow-sm transition-colors">
                          Upload {selectedFiles.length} Files
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ZIP Archive — Premium Feature */}
                  <div className="relative">
                    <PremiumBadge tooltip="Bulk ZIP upload is available on the Enterprise plan">
                      <div className="bg-white rounded-2xl p-6 border-2 border-transparent shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                        <Archive size={32} className="text-accent mb-3" />
                        <h4 className="font-bold text-charcoal text-lg mb-1">ZIP Upload</h4>
                        <p className="text-xs text-charcoal mb-4 font-medium">Upload a ZIP containing all resume files</p>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl h-[120px] flex items-center justify-center bg-gray-50">
                          <p className="text-sm font-bold text-gray-500">Drop ZIP file here</p>
                        </div>
                      </div>
                    </PremiumBadge>
                  </div>

                  {/* Gmail Sync */}
                  <div className="bg-white rounded-2xl p-6 border-2 border-transparent hover:border-accent transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <Mail size={32} className="text-accent mb-3" />
                    <h4 className="font-bold text-charcoal text-lg mb-1">Gmail Sync</h4>
                    <p className="text-xs text-charcoal mb-4 font-medium">Auto-fetch resumes sent to your email</p>
                    {!session.gmail_address ? (
                      <div className="flex flex-col h-[120px] justify-center items-center bg-gray-50 border border-gray-100 rounded-xl">
                        <button onClick={async () => {
                          try {
                            const { auth_url } = await ingestAPI.getOAuthUrl("gmail", id);
                            window.open(auth_url, "gmail_oauth", "width=500,height=600,left=200,top=100");
                          } catch(e) { toast.error(e.message) }
                        }} className="border-[1.5px] border-gray-300 bg-white hover:border-accent hover:text-accent font-bold text-charcoal px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
                          Connect Gmail Account
                        </button>
                        <p className="text-[10px] font-semibold text-gray-400 mt-3 text-center">We only read emails with resume attachments</p>
                      </div>
                    ) : (
                      <div className="flex flex-col h-[120px] justify-center bg-green-50 rounded-xl border border-green-100 p-4">
                        <div className="flex items-center gap-2 text-green-700 font-bold text-sm mb-1 bg-white px-3 py-1.5 rounded-lg border border-green-200 self-start">
                          <Check size={16} strokeWidth={3}/> {session.gmail_address}
                        </div>
                        <p className="text-[11px] font-semibold text-green-600/70 mb-4 mt-2 pl-1">Last synced: {session.last_gmail_sync ? new Date(session.last_gmail_sync).toLocaleString() : 'Never'}</p>
                        <button onClick={async () => {
                          try {
                            const { job_id } = await ingestAPI.syncGmail({ session_id: id });
                            addJob(job_id, "gmail");
                            toast.success("Gmail sync started");
                          } catch(e) { toast.error(e.message) }
                        }} className="bg-accent text-white py-2 rounded-lg text-sm font-bold hover:bg-[#1D4ED8] shadow-sm transition-colors mt-auto">
                          Sync Now
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Drive / Form */}
                  <div className="bg-white rounded-2xl p-6 border-2 border-transparent hover:border-accent transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col">
                    <div className="flex items-center gap-4 mb-4 border-b border-gray-100 pb-3">
                      <LinkIcon size={24} className="text-accent" />
                      <div className="flex gap-6">
                        <span className="text-sm font-black text-charcoal border-b-2 border-accent pb-[13px] -mb-[14px]">Drive</span>
                        <span className="text-sm font-bold text-gray-400 pb-[13px] hover:text-gray-600 cursor-pointer">Google Form</span>
                      </div>
                    </div>
                    <p className="text-xs text-charcoal mb-4 font-medium flex-1">Sync from a shared Drive folder link</p>
                    <div className="flex flex-col justify-end mt-auto">
                      <input type="text" placeholder="Paste Google Drive folder URL here..." value={driveUrl} onChange={e=>setDriveUrl(e.target.value)} className="w-full text-xs p-2.5 font-medium border-2 border-gray-100 rounded-lg mb-2 focus:border-accent focus:outline-none bg-gray-50" />
                      <button 
                        onClick={async () => {
                          try {
                            const { auth_url } = await ingestAPI.getOAuthUrl("gdrive", id);
                            window.open(auth_url, "gdrive_oauth", "width=500,height=600,left=200,top=100");
                          } catch (e) { toast.error(e.message); }
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-charcoal py-2 rounded-lg text-sm font-bold w-full transition-colors border border-gray-200 shadow-sm"
                      >
                        Connect & Sync
                      </button>
                    </div>
                  </div>
                </div>

                {/* Enterprise Import */}
                <details className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-2 border-transparent hover:border-gray-200 transition-colors overflow-hidden group">
                  <summary className="font-bold text-charcoal p-5 cursor-pointer bg-gray-50 flex items-center justify-between text-[15px]">
                    <span className="flex items-center gap-2">
                      <Building size={16} className="text-[#2563EB]" />
                      <span>ATS / Enterprise Import</span>
                    </span>
                    <ChevronDown size={20} className="text-gray-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-6 border-t border-gray-100 bg-white">
                    <div className="flex gap-3 mb-6">
                      <span className="bg-[#2A2A2A] text-white text-xs px-4 py-1.5 rounded-full font-bold shadow-sm">CSV</span>
                      <span className="text-gray-500 text-xs px-4 py-1.5 font-bold hover:bg-gray-100 rounded-full cursor-pointer transition-colors border border-gray-200 bg-white">JSON</span>
                      <span className="text-gray-500 text-xs px-4 py-1.5 font-bold hover:bg-gray-100 rounded-full cursor-pointer transition-colors border border-gray-200 bg-white">Excel</span>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-200 text-blue-900 p-4 rounded-xl text-xs mb-5 shadow-sm">
                      <strong className="block mb-1 text-sm">Expected columns:</strong> 
                      <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-blue-100 mr-2 mt-2 inline-block">name</span>
                      <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-blue-100 mr-2 mt-2 inline-block">email</span>
                      <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-blue-100 mr-2 mt-2 inline-block">phone</span>
                      <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-blue-100 mr-2 mt-2 inline-block">location</span>
                      <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-blue-100 mr-2 mt-2 inline-block">skills (semicolon-separated)</span>
                      <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-blue-100 mr-2 mt-2 inline-block">experience_years</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-stretch h-32" {...getAtsProps()}>
                      <div className={`border-2 border-dashed rounded-xl flex-1 flex flex-col items-center justify-center cursor-pointer transition-colors ${atsFile ? 'border-accent bg-blue-50' : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50'}`}>
                        <input {...getAtsInput()} />
                        <span className="text-2xl mb-2">📄</span>
                        <span className="text-sm text-gray-500 font-bold">{atsFile ? atsFile.name : 'Drop CSV / Excel file here'}</span>
                      </div>
                      <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                        <button className="text-accent font-bold text-xs border-2 border-accent bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"><Download size={16}/> Download sample CSV</button>
                        <button 
                          onClick={async () => {
                            if (!atsFile) return;
                            try {
                              toast.success("Import processing...");
                              const res = await ingestAPI.importATS(id, atsFile.name.endsWith(".json") ? "json" : atsFile.name.endsWith(".xlsx") ? "xlsx" : "csv", atsFile);
                              toast.success(`Imported ${res.imported} records. Failed: ${res.failed}`);
                              setAtsFile(null);
                              queryClient.invalidateQueries({ queryKey: ["candidates", id] });
                            } catch (e) { toast.error(e.message); }
                          }}
                          disabled={!atsFile}
                          className={`font-bold text-sm px-4 py-2.5 rounded-xl transition-colors ${atsFile ? 'bg-accent text-white hover:bg-[#1D4ED8]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                          Import Records
                        </button>
                      </div>
                    </div>
                  </div>
                </details>

                {/* Jobs Tracking */}
                {Object.values(jobs).length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 pl-1 flex items-center gap-2">
                      <ActivityIndicator /> Active Background Jobs
                    </h3>
                    <div className="space-y-3">
                      {Object.values(jobs).map((job) => (
                        <div key={job.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 border-l-4 border-l-accent flex items-center justify-between">
                          <div className="flex-1 mr-6">
                            <div className="flex justify-between items-end mb-2">
                              <div className="font-bold text-sm text-charcoal capitalize flex items-center gap-2">
                                <RefreshCw size={14} className={job.status === 'processing' ? 'animate-spin text-accent' : 'text-gray-400'} />
                                {job.type} Job
                              </div>
                              <div className="text-[11px] font-black font-mono text-gray-500 uppercase tracking-widest">{job.processed || 0} / {job.total || 0} resumes</div>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-accent h-full transition-all duration-300" style={{ width: `${job.progress_percent || 0}%` }}></div>
                            </div>
                          </div>
                          <div className="w-[110px] text-right flex justify-end">
                            {job.status === 'pending' && <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200">Waiting...</span>}
                            {job.status === 'processing' && <span className="text-[10px] text-amber-700 font-black uppercase tracking-wider bg-blue-100 px-3 py-1.5 rounded-md border border-amber-200 shadow-sm flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>Processing</span>}
                            {job.status === 'done' && <span className="text-[10px] text-green-700 font-black uppercase tracking-wider bg-green-100 px-3 py-1.5 rounded-md border border-green-200 shadow-sm flex items-center justify-end gap-1.5"><Check size={12} strokeWidth={3}/> Complete</span>}
                            {job.status === 'failed' && <span className="text-[10px] text-red-700 font-black uppercase tracking-wider bg-red-100 px-3 py-1.5 rounded-md border border-red-200 shadow-sm flex items-center justify-end gap-1.5"><X size={12} strokeWidth={3}/> Failed ({job.failed || 0})</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
          )}

          {/* CANDIDATES TAB */}
          {activeTab === "candidates" && (
            <div className="flex flex-col h-full bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
              
              <div className="flex overflow-x-auto pb-4 gap-3 hide-scrollbar border-b border-gray-100 mb-5">
                {session.rounds?.map(r => (
                  <button 
                    key={r.id || r.order}
                    onClick={() => setActiveRound(r.order)}
                    className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-shadow transition-colors border-2 ${
                      activeRound === r.order ? 'bg-accent text-white border-accent shadow-md shadow-orange-500/20' : 'bg-gray-50 text-gray-500 border-transparent hover:text-charcoal hover:bg-gray-100'
                    }`}
                  >
                    {r.name} <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black ${activeRound === r.order ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>{session.candidate_counts_per_round?.[String(r.order)] || 0}</span>
                  </button>
                ))}
                <button 
                  onClick={() => setActiveRound("hired")}
                  className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-shadow transition-colors border-2 ${
                    activeRound === "hired" ? 'bg-green-600 text-white border-green-600 shadow-md shadow-green-600/20' : 'bg-green-50 text-green-700 border-transparent hover:bg-green-100 hover:text-green-800'
                  }`}
                >
                  Hired <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black inline-block min-w-5 text-center ${activeRound === "hired" ? 'bg-white/20 text-white' : 'bg-green-200 text-green-800'}`}>{candidatesData?.total_hired ?? session?.total_hired ?? 0}</span>
                </button>
                <button 
                  onClick={() => setActiveRound("rejected")}
                  className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-shadow transition-colors border-2 ${
                    activeRound === "rejected" ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-600/20' : 'bg-red-50 text-red-700 border-transparent hover:bg-red-100 hover:text-red-800'
                  }`}
                >
                  Rejected <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black inline-block min-w-5 text-center ${activeRound === "rejected" ? 'bg-white/20 text-white' : 'bg-red-200 text-red-800'}`}>{candidatesData?.total_rejected ?? session?.total_rejected ?? 0}</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-4 items-center bg-gray-50 border border-gray-200 p-4 rounded-xl">
                <div className="relative flex-1 min-w-[200px] z-20">
                  <input 
                    type="text" 
                    placeholder="Search names..." 
                    value={filters.search} 
                    onChange={e=>setFilters({...filters, search: e.target.value})} 
                    onFocus={() => setShowNameSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                    className="w-full border-2 border-gray-200 p-2.5 rounded-lg text-sm font-medium focus:border-accent focus:outline-none bg-white shadow-sm" 
                  />
                  {showNameSuggestions && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto py-1">
                      {(() => {
                        const filteredList = Array.from(new Set(
                          (allCandidatesList || [])
                            .filter(c => !filters.search || (c.name || "").toLowerCase().includes(filters.search.toLowerCase()))
                            .map(c => c.name)
                            .filter(Boolean)
                        )).slice(0, 5);
                        return filteredList.length > 0 ? (
                          filteredList.map((sug, idx) => (
                            <button
                              key={idx}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setFilters({...filters, search: sug});
                                setShowNameSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-50 text-charcoal truncate"
                            >
                              {sug}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-xs text-muted-foreground">No suggestions found</div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <select value={filters.location} onChange={e=>setFilters({...filters, location: e.target.value})} className="border-2 border-gray-200 p-2.5 rounded-lg text-sm font-bold focus:outline-none focus:border-accent text-charcoal bg-white shadow-sm cursor-pointer">
                  <option value="">All Locations</option>
                  <option value="Remote">Remote</option>
                </select>
                <div className="flex items-center gap-3 border-2 border-gray-200 p-2.5 rounded-lg px-4 bg-white shadow-sm">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Score &gt;</span>
                  <input type="range" min="0" max="100" step="5" value={filters.min_score} onChange={e=>setFilters({...filters, min_score: parseInt(e.target.value)})} className="w-24 accent-[#2563EB] cursor-pointer" />
                  <span className="text-xs font-black text-charcoal w-6 bg-gray-100 p-1 rounded inline-block text-center">{filters.min_score}</span>
                </div>
                <div className="relative w-48 z-20">
                  <input 
                    type="text" 
                    placeholder="Must have skill..." 
                    value={filters.skill} 
                    onChange={e=>setFilters({...filters, skill: e.target.value})} 
                    onFocus={() => setShowSkillSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 200)}
                    className="w-full border-2 border-gray-200 p-2.5 rounded-lg text-sm font-medium focus:border-accent focus:outline-none bg-white shadow-sm" 
                  />
                  {showSkillSuggestions && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto py-1">
                      {(() => {
                        const filteredList = Array.from(new Set(
                          (allCandidatesList || [])
                            .flatMap(c => (c.normalized_skills || []).map(s => s.canonical_skill || s.skill || s))
                            .filter(Boolean)
                            .filter(s => typeof s === 'string' && (!filters.skill || s.toLowerCase().includes(filters.skill.toLowerCase())))
                        )).slice(0, 5);
                        return filteredList.length > 0 ? (
                          filteredList.map((sug, idx) => (
                            <button
                              key={idx}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setFilters({...filters, skill: sug});
                                setShowSkillSuggestions(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-gray-50 text-charcoal truncate"
                            >
                              {sug}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-xs text-muted-foreground">No suggestions found</div>
                        );
                      })()}
                    </div>
                  )}
                </div>
                <select value={filters.sort} onChange={e=>setFilters({...filters, sort: e.target.value})} className="border-2 border-gray-200 p-2.5 rounded-lg text-sm focus:outline-none focus:border-accent font-bold ml-auto bg-white shadow-sm cursor-pointer text-charcoal">
                  <option>Match Score ↓</option>
                  <option>Name A-Z</option>
                  <option>Newest</option>
                </select>
              </div>

              <div className="text-xs font-black text-gray-400 my-4 uppercase tracking-wider">{candidatesData?.total ?? candidatesList.length} candidates match your filters</div>

              <div className="flex-1 overflow-y-auto min-h-[300px] custom-scrollbar pr-2">
                {candidatesList.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 pb-12">
                    {candidatesList.map(cand => (
                       <CandidateCard 
                         key={cand.id} 
                         candidate={cand}
                         sessionId={id}
                         rounds={session?.rounds || []}
                         onAction={() => {
                           queryClient.invalidateQueries({ queryKey: ["candidates", id] });
                           queryClient.invalidateQueries({ queryKey: ["all_candidates", id] });
                           queryClient.invalidateQueries({ queryKey: ["session", id] });
                         }}
                         isHighlighted={highlightedIds?.includes(cand.id)}
                       />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 h-[300px] text-center mt-2">
                    <Search size={48} className="text-gray-300 mb-4" />
                    <h3 className="font-black text-gray-600 text-xl mb-2">No candidates found</h3>
                    <p className="text-sm text-gray-400 font-medium max-w-sm mb-6">
                      {activeRound === 1 && Object.values(jobs).length === 0 ? "You haven't uploaded any resumes yet. Start ingesting files to populate this round." : "Try adjusting your filters or check a different round pipeline."}
                    </p>
                    {activeRound === 1 && <button onClick={()=>setActiveTab("upload")} className="px-6 py-2.5 border-2 border-accent text-accent rounded-xl font-bold hover:bg-blue-50 hover:shadow-sm transition-colors text-sm flex items-center gap-2"><Upload size={16}/> Go to Upload</button>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <div className="space-y-6 max-w-6xl pb-10">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Total Parsed", val: totalParsed, c: "text-charcoal", bg: "bg-gray-50" },
                  { label: "Scored & Active", val: scoredActive, c: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Hired Final", val: hiredFinal, c: "text-green-600", bg: "bg-green-50" },
                  { label: "Rejected", val: rejectedCount, c: "text-red-500", bg: "bg-red-50" },
                  { label: "Avg Match Score", val: `${avgMatchScore}%`, c: "text-[#2563EB]", bg: "bg-blue-50" },
                ].map((s,i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center relative overflow-hidden group">
                    <div className={`absolute top-0 inset-x-0 h-1.5 ${s.bg} border-b border-gray-100 transition-all group-hover:h-full -z-10 opacity-50`}></div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">{s.label}</div>
                    <div className={`text-4xl font-black ${s.c} drop-shadow-sm`}>{s.val}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] h-[360px] flex flex-col">
                  <h3 className="font-black text-charcoal text-lg mb-6 flex items-center gap-2"><div className="w-2 h-6 bg-accent rounded-full"></div>Score Distribution</h3>
                  <div className="flex-1 -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        {name:"0-20", count: allCandidatesList.filter(c=>c.match_score<=20).length}, 
                        {name:"20-40", count: allCandidatesList.filter(c=>c.match_score>20 && c.match_score<=40).length}, 
                        {name:"40-60", count: allCandidatesList.filter(c=>c.match_score>40 && c.match_score<=60).length}, 
                        {name:"60-80", count: allCandidatesList.filter(c=>c.match_score>60 && c.match_score<=80).length}, 
                        {name:"80-100", count: allCandidatesList.filter(c=>c.match_score>80).length}
                      ]}>
                        <XAxis dataKey="name" tick={{fontSize:12, fill:'#6B7280', fontWeight:600}} axisLine={{stroke:'#E5E7EB'}} tickLine={false} dy={10} />
                        <YAxis tick={{fontSize:12, fill:'#6B7280', fontWeight:600}} axisLine={false} tickLine={false} dx={-10} />
                        <Tooltip cursor={{fill: '#F5F0E8', radius: 8}} contentStyle={{borderRadius:12, border:'1px solid #E5E7EB', boxShadow:'0 8px 24px rgba(0,0,0,0.08)', fontWeight:700}}/>
                        <Bar dataKey="count" fill="#2563EB" radius={[6,6,0,0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] h-[360px] flex flex-col">
                  <h3 className="font-black text-charcoal text-lg mb-4 flex items-center gap-2"><div className="w-2 h-6 bg-blue-500 rounded-full"></div>Status Breakdown</h3>
                  <div className="flex-1 flex justify-center items-center relative">
                    <div className="w-[240px] h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={[
                              {name:"Active", value: scoredActive}, 
                              {name:"Rejected", value: rejectedCount}, 
                              {name:"Hired", value: hiredFinal}
                            ].filter(d => d.value > 0)} 
                            dataKey="value" innerRadius={70} outerRadius={90} paddingAngle={4}
                            stroke="none"
                          >
                            <Cell fill="#3B82F6"/>
                            <Cell fill="#EF4444"/>
                            <Cell fill="#22C55E"/>
                          </Pie>
                          <Tooltip contentStyle={{borderRadius:12, border:'1px solid #E5E7EB', boxShadow:'0 8px 24px rgba(0,0,0,0.08)', fontWeight:700}}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                      <span className="text-3xl font-black text-charcoal">{totalParsed}</span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] h-[360px] flex flex-col">
                  <h3 className="font-black text-charcoal text-lg mb-6 flex items-center gap-2"><div className="w-2 h-6 bg-green-500 rounded-full"></div>Hiring Funnel</h3>
                  <div className="flex-1 flex flex-col justify-between py-2 text-sm">
                    {(() => {
                      const funnelData = [
                        { stage: "Applied / Ingested", count: totalParsed, color: "bg-blue-600" },
                        { stage: "Screening Round", count: (session.candidate_counts_per_round?.["1"] || 0) + (session.candidate_counts_per_round?.["2"] || 0) + (session.candidate_counts_per_round?.["3"] || 0) + hiredFinal, color: "bg-indigo-500" },
                        { stage: "Technical Round", count: (session.candidate_counts_per_round?.["2"] || 0) + (session.candidate_counts_per_round?.["3"] || 0) + hiredFinal, color: "bg-purple-500" },
                        { stage: "HR Round", count: (session.candidate_counts_per_round?.["3"] || 0) + hiredFinal, color: "bg-pink-500" },
                        { stage: "Hired Final", count: hiredFinal, color: "bg-emerald-500" }
                      ];
                      
                      const maxCount = totalParsed || 1;
                      return funnelData.map((f, i) => {
                        const pct = Math.round((f.count / maxCount) * 105); // slight padding for visibility
                        const widthPct = Math.min(100, pct);
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between items-center text-[11px] font-bold text-charcoal">
                              <span>{f.stage}</span>
                              <span className="text-gray-400 font-mono font-bold">{f.count}</span>
                            </div>
                            <div className="w-full bg-gray-50 h-2.5 rounded-full overflow-hidden border border-gray-100">
                              <div className={`${f.color} h-full rounded-full transition-all duration-500`} style={{ width: `${widthPct}%` }}></div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden mt-8">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-black text-charcoal text-lg">Leading Candidates</h3>
                  <button className="text-xs font-bold text-accent hover:text-accent-dark transition-colors px-3 py-1.5 bg-blue-50 rounded-lg">View Full Leaderboard</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white text-gray-400 font-black border-b border-gray-100 uppercase tracking-widest text-[10px]">
                      <tr>
                        <th className="p-4 pl-6">Rank</th>
                        <th className="p-4">Candidate Name</th>
                        <th className="p-4">Match Score</th>
                        <th className="p-4">Location</th>
                        <th className="p-4">Current Status</th>
                      </tr>
                    </thead>
                    <tbody className="cursor-pointer">
                      {[...candidatesList].sort((a,b) => (b.match_score||0) - (a.match_score||0)).slice(0, 5).map((cand, i) => (
                        <tr key={cand.id} className="border-b last:border-b-0 border-gray-50 hover:bg-blue-50/30 transition-colors group">
                          <td className="p-4 pl-6 text-gray-400">
                            <span className={`inline-block w-6 text-center font-black ${i===0?'text-amber-500':i===1?'text-gray-400':i===2?'text-amber-700':''}`}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</span>
                          </td>
                          <td className="p-4 font-bold text-charcoal group-hover:text-amber-600 transition-colors">{cand.name}</td>
                          <td className="p-4"><span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg font-black">{cand.match_score}%</span></td>
                          <td className="p-4 text-gray-500 font-medium text-xs">{cand.location || "Unknown"}</td>
                          <td className="p-4"><span className={`bg-blue-100/50 border border-blue-200 text-blue-700 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm ${cand.status === "hired" ? "bg-green-100 text-green-700 border-green-200" : cand.status === "rejected" ? "bg-red-100 text-red-700 border-red-200" : ""}`}>{cand.status || "Active"}</span></td>
                        </tr>
                      ))}
                      {candidatesList.length === 0 && (
                        <tr><td colSpan="5" className="p-4 text-center text-gray-400 text-xs py-8">No candidates available yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col hide-scrollbar border border-gray-100">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
              <h2 className="text-xl font-black text-charcoal">Edit Session Details</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-charcoal transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-5 flex-1 pr-1">
              
              {/* Session Name & Job Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Session Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full text-sm p-2.5 border-[1.5px] border-gray-200 rounded-lg focus:border-accent focus:outline-none transition-colors"
                    placeholder="e.g. Q4 Python hiring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Job Title</label>
                  <input 
                    type="text" 
                    value={editJobTitle}
                    onChange={e => setEditJobTitle(e.target.value)}
                    className="w-full text-sm p-2.5 border-[1.5px] border-gray-200 rounded-lg focus:border-accent focus:outline-none transition-colors"
                    placeholder="e.g. Backend Software Engineer"
                  />
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Job Description</label>
                <textarea 
                  rows={4}
                  value={editJobDescription}
                  onChange={e => setEditJobDescription(e.target.value)}
                  className="w-full text-sm p-2.5 border-[1.5px] border-gray-200 rounded-lg focus:border-accent focus:outline-none transition-colors"
                  placeholder="Paste detailed job description here..."
                />
              </div>

              {/* Min Exp & Min Match Score */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Min Experience (Years)</label>
                  <input 
                    type="number" 
                    value={editMinExperience}
                    onChange={e => setEditMinExperience(e.target.value)}
                    className="w-full text-sm p-2.5 border-[1.5px] border-gray-200 rounded-lg focus:border-accent focus:outline-none transition-colors"
                    min="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Min Match Score (%)</label>
                  <input 
                    type="number" 
                    value={editMinMatchScore}
                    onChange={e => setEditMinMatchScore(e.target.value)}
                    className="w-full text-sm p-2.5 border-[1.5px] border-gray-200 rounded-lg focus:border-accent focus:outline-none transition-colors"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              {/* Salary Fields */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Currency</label>
                  <select
                    value={editSalaryCurrency}
                    onChange={e => setEditSalaryCurrency(e.target.value)}
                    className="w-full text-sm p-2.5 border-[1.5px] border-gray-200 rounded-lg focus:border-accent focus:outline-none bg-white transition-colors"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Min Salary</label>
                  <input
                    type="number"
                    value={editSalaryMin}
                    onChange={e => setEditSalaryMin(e.target.value)}
                    className="w-full text-sm p-2.5 border-[1.5px] border-gray-200 rounded-lg focus:border-accent focus:outline-none transition-colors"
                    placeholder="e.g. 80000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Max Salary</label>
                  <input
                    type="number"
                    value={editSalaryMax}
                    onChange={e => setEditSalaryMax(e.target.value)}
                    className="w-full text-sm p-2.5 border-[1.5px] border-gray-200 rounded-lg focus:border-accent focus:outline-none transition-colors"
                    placeholder="e.g. 120000"
                  />
                </div>
              </div>

              {/* Required Skills */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Required Skills</label>
                <TagInput 
                  tags={editRequiredSkills} 
                  onChange={setEditRequiredSkills} 
                  placeholder="Type skill and press Enter..." 
                  tagColor="amber"
                />
              </div>

              {/* Nice-to-have Skills */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nice-to-have Skills</label>
                <TagInput 
                  tags={editNiceToHave} 
                  onChange={setEditNiceToHave} 
                  placeholder="Type skill and press Enter..." 
                  tagColor="blue"
                />
              </div>

              {/* Preferred Locations */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preferred Locations</label>
                <TagInput 
                  tags={editPreferredLocations} 
                  onChange={setEditPreferredLocations} 
                  placeholder="Type location and press Enter..." 
                  tagColor="gray"
                />
              </div>

              {/* Interview Rounds */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Interview Rounds</label>
                {editRounds.map((round, idx) => (
                  <div key={idx} className="flex gap-4 items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-400 w-16">Round {round.order}</span>
                    <input 
                      type="text" 
                      value={round.name}
                      onChange={e => {
                        const updated = [...editRounds];
                        updated[idx].name = e.target.value;
                        setEditRounds(updated);
                      }}
                      className="flex-1 text-xs p-2 border border-gray-200 bg-white rounded-lg focus:border-accent focus:outline-none font-bold"
                      placeholder="Round Name"
                    />
                    <input 
                      type="text" 
                      value={round.interviewer || ""}
                      onChange={e => {
                        const updated = [...editRounds];
                        updated[idx].interviewer = e.target.value;
                        setEditRounds(updated);
                      }}
                      className="flex-1 text-xs p-2 border border-gray-200 bg-white rounded-lg focus:border-accent focus:outline-none font-bold"
                      placeholder="Interviewer Name"
                    />
                  </div>
                ))}
              </div>

            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="border-[1.5px] border-gray-200 hover:bg-gray-50 text-charcoal px-5 py-2.5 rounded-xl font-bold transition-all text-sm"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveChanges}
                className="bg-accent hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl font-bold transition-all text-sm shadow flex items-center gap-2"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}


    </div>
  );
}

const ActivityIndicator = () => (
  <div className="relative flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
    <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
  </div>
);

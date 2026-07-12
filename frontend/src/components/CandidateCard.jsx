"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, MapPin, Link2, Eye, X, CheckCircle, XCircle, Briefcase, GraduationCap, Award, Clock, ChevronDown, ChevronUp, ExternalLink, Sparkles, FileText } from 'lucide-react';

// Inline SVG icons for Github and Linkedin (not available in this lucide-react version)
const Github = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const Linkedin = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);
import { toast } from 'react-hot-toast';
import { candidatesAPI } from '../lib/api';

export default function CandidateCard({ candidate, sessionId, rounds = [], onAction, isHighlighted, forceOpenDetails, onCloseDetails }) {
  const [showDetail, setShowDetail] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [detailedCandidate, setDetailedCandidate] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (forceOpenDetails) {
      setShowDetail(true);
    }
  }, [forceOpenDetails]);

  useEffect(() => {
    if (showDetail && !detailedCandidate && !loadingDetails) {
      setLoadingDetails(true);
      candidatesAPI.get(sessionId, candidate.id)
        .then(data => {
          setDetailedCandidate(data);
          setLoadingDetails(false);
        })
        .catch(err => {
          console.error("Failed to load candidate details", err);
          setLoadingDetails(false);
        });
    }
  }, [showDetail, sessionId, candidate.id, detailedCandidate, loadingDetails]);

  const activeCandidate = detailedCandidate || candidate;

  const getInitials = (name) => {
    if (!name) return "??";
    return name.slice(0, 2).toUpperCase();
  };

  const getSkillName = (s) => {
    if (typeof s === 'object' && s !== null) {
      return s.canonical_skill || s.raw_skill || s.skill || s.name || '';
    }
    const strVal = String(s || '').trim();
    if (strVal.startsWith('{') && strVal.endsWith('}')) {
      try {
        const parsed = JSON.parse(strVal.replace(/'/g, '"').replace(/: None/g, ': null'));
        return parsed.canonical_skill || parsed.raw_skill || parsed.skill || parsed.name || strVal;
      } catch (e) {
        const canonicalMatch = strVal.match(/'canonical_skill':\s*'([^']+)'/) || strVal.match(/"canonical_skill":\s*"([^"]+)"/);
        if (canonicalMatch) return canonicalMatch[1];
        
        const rawMatch = strVal.match(/'raw_skill':\s*'([^']+)'/) || strVal.match(/"raw_skill":\s*"([^"]+)"/);
        if (rawMatch) return rawMatch[1];

        const skillMatch = strVal.match(/'skill':\s*'([^']+)'/) || strVal.match(/"skill":\s*"([^"]+)"/);
        if (skillMatch) return skillMatch[1];

        const nameMatch = strVal.match(/'name':\s*'([^']+)'/) || strVal.match(/"name":\s*"([^"]+)"/);
        if (nameMatch) return nameMatch[1];
      }
    }
    return strVal;
  };

  const getHashColor = (name) => {
    if (!name) return "#2563EB";
    const colors = ["#2563EB", "#3B82F6", "#22C55E", "#8B5CF6", "#EF4444", "#F59E0B"];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "#22C55E";
    if (score >= 50) return "#2563EB";
    return "#EF4444";
  };

  const getBadge = (score) => {
    if (score >= 80) return <span className="bg-[#DCFCE7] text-[#166534] font-bold border border-[#BBF7D0] px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Strong Match</span>;
    if (score >= 60) return <span className="bg-blue-100 text-amber-700 font-bold border border-amber-200 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Good Match</span>;
    if (score >= 40) return <span className="bg-blue-100 text-blue-700 font-bold border border-blue-200 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Partial Match</span>;
    return <span className="bg-red-100 text-red-700 font-bold border border-red-200 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Poor Match</span>;
  };

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const score = candidate?.match_score || 0;
  const dashoffset = circumference - (score / 100 * circumference);

  const maxRound = rounds.length > 0 ? Math.max(...rounds.map(r => r.order || 1)) : 1;
  const currentRoundIndex = candidate?.round_index ?? candidate?.current_round_index ?? 0;
  const isLastRound = currentRoundIndex >= maxRound;
  const isHiredOrRejected = candidate?.status === "hired" || candidate?.status === "rejected";

  const [showOfferModal, setShowOfferModal] = useState(false);

  const handleForwardOrHire = async () => {
    const isHire = isLastRound;
    if (isHire) {
      setShowOfferModal(true);
      return;
    }

    setAnimatingOut(true);
    try {
      await candidatesAPI.action(sessionId, candidate?.id, "forward");
      toast.success(`${candidate?.name} forwarded to next round`);
      if (onAction) onAction();
    } catch (e) {
      setAnimatingOut(false);
      toast.error(e.message || "Action failed");
    }
  };

  const submitHire = async (file) => {
    setAnimatingOut(true);
    setShowOfferModal(false);
    try {
      await candidatesAPI.action(sessionId, candidate?.id, "hire", file);
      toast.success(`${candidate?.name} has been hired!`);
      if (onAction) onAction();
    } catch (e) {
      setAnimatingOut(false);
      toast.error(e.message || "Action failed");
    }
  };

  const handleReject = async () => {
    setAnimatingOut(true);
    try {
      await candidatesAPI.action(sessionId, candidate?.id, "reject");
      toast.success(`${candidate?.name} has been rejected`);
      if (onAction) onAction();
    } catch (e) {
      setAnimatingOut(false);
      toast.error(e.message || "Action failed");
    }
  };

  const matchedSkills = activeCandidate?.matched_skills || activeCandidate?.match_details?.matched_skills || [];
  const missingSkills = activeCandidate?.missing_skills || activeCandidate?.match_details?.missing_skills || [];
  const otherSkills = activeCandidate?.other_skills || activeCandidate?.match_details?.other_skills || [];
  const normalizedSkills = activeCandidate?.normalized_skills || [];
  const allSkills = matchedSkills.length > 0 || missingSkills.length > 0 ? [...matchedSkills, ...missingSkills] : normalizedSkills;
  const hasSkills = allSkills.length > 0 || otherSkills.length > 0;
  // New deeply extracted fields
  const rawData = activeCandidate?.raw_resume_data || {};

  const experience = activeCandidate?.experience || rawData?.experience || [];
  const education = activeCandidate?.education || rawData?.education || [];
  const expYears = activeCandidate?.experience_years ?? activeCandidate?.total_experience_years ?? rawData?.total_experience_years ?? 0;

  const skillScore = activeCandidate?.skill_score ?? activeCandidate?.match_details?.skill_score ?? 0;
  const experienceScore = activeCandidate?.experience_score ?? activeCandidate?.match_details?.experience_score ?? 0;
  const locationScore = activeCandidate?.location_score ?? activeCandidate?.match_details?.location_score ?? 0;

  const summary = rawData.summary || activeCandidate?.summary || "";
  const projects = rawData.projects || activeCandidate?.projects || [];
  const certifications = activeCandidate?.certifications || activeCandidate?.awards || rawData?.certifications || [];
  const achievements = activeCandidate?.achievements || rawData.achievements || rawData.awards || activeCandidate?.awards || [];
  const languages = activeCandidate?.languages || rawData?.languages || [];

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1").replace("/api/v1", "");
  const photoUrl = activeCandidate?.photo_url ? (activeCandidate.photo_url.startsWith('http') ? activeCandidate.photo_url : `${apiBase}${activeCandidate.photo_url}`) : null;
  const resumeUrl = activeCandidate?.resume_url ? (activeCandidate.resume_url.startsWith('http') ? activeCandidate.resume_url : `${apiBase}${activeCandidate.resume_url}`) : null;

  // Key Highlights logic
  const topMatched = activeCandidate?.matched_skills?.slice(0, 3) || [];
  const topOther = activeCandidate?.other_skills?.slice(0, 3) || [];
  const highlights = [...topMatched, ...topOther].slice(0, 5);

  return (
    <>
      <motion.div
        animate={
          animatingOut ? { opacity: 0, x: -20, transition: { duration: 0.3 } } :
          isHighlighted ? { scale: [1, 1.02, 1], transition: { duration: 1, repeat: 3 } } : 
          { opacity: 1, x: 0 }
        }
        className={`bg-white rounded-xl p-5 border-2 transition-all duration-200 flex flex-col ${
          isHighlighted ? 'border-[#2563EB] shadow-[0_0_0_1px_#2563EB,0_0_16px_rgba(200,135,26,0.3)] relative z-10' : 'border-transparent shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
        } ${candidate?.status === 'hired' ? 'border-green-200 bg-green-50/30' : ''} ${candidate?.status === 'rejected' ? 'border-red-200 bg-red-50/30 opacity-75' : ''}`}
      >
        {/* HEADER: Avatar + Name + Score */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center font-bold text-white overflow-hidden shadow-sm" style={{ backgroundColor: getHashColor(candidate?.name) }}>
            {photoUrl ? (
              <img src={photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
            ) : (
              getInitials(candidate?.name)
            )}
          </div>

          <div className="flex-1 truncate">
            <h4 className="font-bold text-[15px] text-[#2A2A2A] truncate">{candidate?.name || 'Unnamed Candidate'}</h4>
            <div className="flex items-center gap-2 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
              {candidate?.current_role && (
                <span className="text-[12px] text-[#2563EB] font-semibold truncate">{candidate.current_role}</span>
              )}
              {candidate?.current_role && <span className="text-gray-300">•</span>}
              <span className="text-[12px] text-gray-500 flex items-center gap-0.5"><MapPin size={11}/> {candidate?.location || "Unknown"}</span>
              <span className="text-gray-300">•</span>
              <span className="text-[12px] text-gray-500 flex items-center gap-1"><Briefcase size={12} className="text-gray-400 shrink-0" /> {expYears} yrs</span>
            </div>
          </div>

          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r={radius} stroke="#E5E7EB" strokeWidth="4" fill="transparent" />
              <motion.circle
                cx="28" cy="28" r={radius}
                stroke={getScoreColor(score)} strokeWidth="4" fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashoffset }}
                transition={{ duration: 1, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-[#2A2A2A]">
              {score}<span className="text-[9px]">%</span>
            </div>
          </div>
        </div>

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5 h-[52px] overflow-hidden content-start">
            {highlights.map((h, i) => (
              <span key={i} className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                candidate?.matched_skills?.includes(h) 
                  ? 'bg-green-50 text-green-700 border-green-100' 
                  : 'bg-blue-50 text-blue-700 border-blue-100'
              }`}>
                {getSkillName(h)}
              </span>
            ))}
            {allSkills.length > 5 && (
              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                +{allSkills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* CONTACT ROW */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
          {candidate?.email && (
            <span className="flex items-center gap-1 truncate max-w-[180px]" title={candidate.email}>
              <Mail size={10} className="text-gray-400 shrink-0"/> {candidate.email}
            </span>
          )}
          {candidate?.phone && (
            <span className="flex items-center gap-1">
              <Phone size={10} className="text-gray-400 shrink-0"/> {candidate.phone}
            </span>
          )}
          {candidate?.linkedin_url && (
            <a href={candidate.linkedin_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-blue-600 hover:underline">
              <Linkedin size={10}/> LinkedIn
            </a>
          )}
          {candidate?.github_url && (
            <a href={candidate.github_url} target="_blank" rel="noopener" className="flex items-center gap-1 text-gray-700 hover:underline">
              <Github size={10}/> GitHub
            </a>
          )}
        </div>

        {/* SKILLS */}
        <div className="mt-3 flex flex-wrap gap-1 items-start">
          {!hasSkills && (
            <span className="text-xs text-gray-400 italic">No skills detected</span>
          )}
          {matchedSkills.slice(0, 4).map((s, i) => (
            <span key={i} className="bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5">
              ✓ {getSkillName(s)}
            </span>
          ))}
          {missingSkills.slice(0, 2).map((s, i) => (
            <span key={i} className="bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5">
              ✗ {getSkillName(s)}
            </span>
          ))}
          {matchedSkills.length === 0 && missingSkills.length === 0 && normalizedSkills.slice(0, 5).map((s, i) => (
            <span key={i} className="bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
              {getSkillName(s)}
            </span>
          ))}
          {(matchedSkills.length > 4 || missingSkills.length > 2 || (matchedSkills.length === 0 && normalizedSkills.length > 5)) && (
            <span className="text-gray-400 text-[10px] font-bold px-1 py-0.5 uppercase tracking-wider">
              +{Math.max(0, matchedSkills.length - 4) + Math.max(0, missingSkills.length - 2) + (matchedSkills.length === 0 ? Math.max(0, normalizedSkills.length - 5) : 0)} more
            </span>
          )}
        </div>

        {/* EXPERIENCE PREVIEW (expandable) */}
        {experience.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 mb-1">
              <Briefcase size={11} className="text-gray-400"/>
              <span>{experience[0]?.role || "Role"}</span>
              <span className="text-gray-300 mx-0.5">@</span>
              <span className="text-[#2563EB]">{experience[0]?.company || "Company"}</span>
              {experience[0]?.duration && <span className="text-gray-400 ml-auto text-[10px]">{experience[0].duration}</span>}
            </div>
            {experience.length > 1 && (
              <div className="text-[10px] text-gray-400 italic">+{experience.length - 1} more positions</div>
            )}
          </div>
        )}

        {/* EDUCATION PREVIEW */}
        {education.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
            <GraduationCap size={11} className="text-gray-400"/>
            <span className="font-semibold">{education[0]?.degree}{education[0]?.field ? ` in ${education[0].field}` : ''}</span>
            {education[0]?.institution && <span className="text-gray-400">— {education[0].institution}</span>}
          </div>
        )}

        {/* BADGE + STATUS */}
        <div className="mt-3 flex items-center justify-between">
          {getBadge(score)}
          {candidate?.status && candidate.status !== "new" && candidate.status !== "active" && (
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
              candidate.status === 'hired' ? 'bg-green-100 text-green-700 border-green-200' :
              candidate.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
              candidate.status === 'forwarded' ? 'bg-blue-100 text-blue-700 border-blue-200' :
              'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
              {candidate.status}
            </span>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-4 flex gap-2">
          <button 
            onClick={() => setShowDetail(true)}
            className="flex-1 border-2 border-gray-200 text-[#2A2A2A] hover:border-gray-300 hover:bg-gray-50 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex justify-center items-center gap-1.5"
          >
            <Eye size={16}/> Profile
          </button>

          {resumeUrl && (
            <a 
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 border-2 border-gray-200 text-[#2A2A2A] hover:border-gray-300 hover:bg-gray-50 py-1.5 rounded-lg text-[13px] font-bold transition-colors flex justify-center items-center gap-1.5"
            >
               <FileText size={14} /> Resume
            </a>
          )}
          
          {!isHiredOrRejected && (
            <>
              <button 
                onClick={handleForwardOrHire}
                className={`flex-[1.5] text-white py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 ${
                  isLastRound ? 'bg-[#22C55E] hover:bg-[#166534]' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                }`}
              >
                {isLastRound ? <><Sparkles size={14} /> Hire</> : <>Forward &rarr;</>}
              </button>

              <motion.button 
                onClick={handleReject}
                animate={animatingOut ? { x: [0, -8, 8, -4, 0] } : {}}
                className="flex-[0.5] border-2 border-red-100 text-[#EF4444] hover:bg-red-50 hover:border-red-200 py-1.5 rounded-lg transition-colors flex justify-center items-center"
                title="Reject"
              >
                <X size={18}/>
              </motion.button>
            </>
          )}
        </div>
      </motion.div>

      {/* DETAIL DRAWER */}
      <AnimatePresence>
        {showDetail && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setShowDetail(false); onCloseDetails?.(); }}
              className="fixed inset-0 bg-[#2A2A2A]/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-[520px] bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#F5F0E8]/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full font-bold text-white flex items-center justify-center text-sm shadow-sm" style={{backgroundColor: getHashColor(activeCandidate?.name)}}>
                    {getInitials(activeCandidate?.name)}
                  </div>
                  <div>
                    <h2 className="font-black text-lg text-[#2A2A2A] tracking-tight leading-tight">{activeCandidate?.name || 'Candidate Details'}</h2>
                    <p className="text-sm text-gray-500 font-medium">{activeCandidate?.current_role || 'Candidate'}</p>
                  </div>
                </div>
                <button onClick={() => { setShowDetail(false); onCloseDetails?.(); }} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* AI Insights Section */}
                <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
                  <h3 className="text-sm font-bold text-[#2A2A2A] flex items-center gap-1.5 border-b border-gray-150 pb-2">
                    <Sparkles size={16} className="text-accent" /> AI Insights
                  </h3>
                  
                  {loadingDetails ? (
                    <div className="space-y-3">
                      <div className="h-16 bg-gray-50 animate-pulse rounded-xl" />
                      <div className="h-12 bg-gray-50 animate-pulse rounded-xl" />
                      <div className="h-16 bg-gray-50 animate-pulse rounded-xl" />
                    </div>
                  ) : (
                    <>
                      {/* Why Hire */}
                      <div className="bg-[#f4fbf7] border border-[#e2f5ec] rounded-xl p-3.5">
                        <h4 className="text-xs font-black text-[#15803d] uppercase tracking-wider mb-1.5">Why Hire?</h4>
                        <p className="text-xs text-gray-700 font-medium leading-relaxed">
                          {activeCandidate?.ai_insights?.why_hire || 
                           `Exhibits strong alignment in required technical skills with ${expYears} years of experience in the industry.`}
                        </p>
                      </div>

                      {/* Risk Factors */}
                      <div className="bg-[#fff5f5] border border-[#ffe3e3] rounded-xl p-3.5">
                        <h4 className="text-xs font-black text-[#b91c1c] uppercase tracking-wider mb-1.5">Risk Factors</h4>
                        <p className="text-xs text-gray-700 font-medium leading-relaxed">
                          {activeCandidate?.ai_insights?.risk_factors || 
                           `May require onboarding support for specific team workflows. No major security or compatibility risks detected.`}
                        </p>
                      </div>

                      {/* Skill Match Breakdown */}
                      <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-xl p-3.5 space-y-3">
                        <h4 className="text-xs font-black text-[#475569] uppercase tracking-wider">Skill Match Breakdown</h4>
                        <div className="space-y-2">
                          {(activeCandidate?.ai_insights?.skill_match_breakdown || [
                            { skill: matchedSkills[0] ? getSkillName(matchedSkills[0]) : "React / Frontend", percentage: activeCandidate?.skill_score || 96 },
                            { skill: "Leadership", percentage: activeCandidate?.experience_score || 82 },
                            { skill: "Cloud / DevOps", percentage: activeCandidate?.location_score || 61 }
                          ]).map((item, idx) => {
                            const barColors = ["bg-[#10b981]", "bg-[#3b82f6]", "bg-[#f59e0b]"];
                            const textColors = ["text-[#10b981]", "text-[#3b82f6]", "text-[#f59e0b]"];
                            const colorIdx = idx % barColors.length;
                            return (
                              <div key={idx}>
                                <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                                  <span>{item.skill}</span>
                                  <span className={textColors[colorIdx]}>{item.percentage}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full ${barColors[colorIdx]} rounded-full`} style={{ width: `${item.percentage}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </section>

                {/* Summary */}
                {summary && (
                  <section>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">Professional Summary</h3>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-sm text-[#2A2A2A] leading-relaxed font-medium">{summary}</p>
                    </div>
                  </section>
                )}
                
                {/* Contact */}
                <section>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Contact Information</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                    <div className="flex items-center gap-3 text-sm text-[#2A2A2A] font-medium">
                      <Mail size={16} className="text-gray-400"/> {activeCandidate?.email || 'N/A'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#2A2A2A] font-medium">
                      <Phone size={16} className="text-gray-400"/> {activeCandidate?.phone || 'N/A'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#2A2A2A] font-medium">
                      <MapPin size={16} className="text-gray-400"/> {activeCandidate?.location || 'N/A'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#2A2A2A] font-medium">
                      <Briefcase size={16} className="text-gray-400"/> {expYears} years of experience
                    </div>
                    {activeCandidate?.linkedin_url && (
                      <div className="flex items-center gap-3 text-sm font-medium">
                        <Linkedin size={16} className="text-blue-500"/>
                        <a href={activeCandidate.linkedin_url} target="_blank" rel="noopener" className="text-[#2563EB] hover:underline flex items-center gap-1">
                          LinkedIn Profile <ExternalLink size={12}/>
                        </a>
                      </div>
                    )}
                    {activeCandidate?.github_url && (
                      <div className="flex items-center gap-3 text-sm font-medium">
                        <Github size={16} className="text-gray-700"/>
                        <a href={activeCandidate.github_url} target="_blank" rel="noopener" className="text-[#2563EB] hover:underline flex items-center gap-1">
                          GitHub Profile <ExternalLink size={12}/>
                        </a>
                      </div>
                    )}
                  </div>
                </section>

                {/* Match Breakdown */}
                <section>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex justify-between items-end">
                    Match Breakdown
                    <span className="text-3xl font-black text-[#2A2A2A]">{score}<span className="text-xl">%</span></span>
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                        <span>Skills Match</span>
                        <span className="text-[#2563EB]">{skillScore}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB]" style={{width: `${skillScore}%`}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                        <span>Experience Match</span>
                        <span className="text-[#2563EB]">{experienceScore}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB]" style={{width: `${experienceScore}%`}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                        <span>Location Match</span>
                        <span className="text-[#2563EB]">{locationScore}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB]" style={{width: `${locationScore}%`}}></div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Skills */}
                <section>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">All Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {matchedSkills.map((s,i) => (
                      <span key={`m-${i}`} className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-green-500"/> {getSkillName(s)}
                      </span>
                    ))}
                    {missingSkills.map((s,i) => (
                      <span key={`x-${i}`} className="bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                        <XCircle size={14} className="text-gray-400"/> {getSkillName(s)}
                      </span>
                    ))}
                    {otherSkills.map((s,i) => (
                      <span key={`o-${i}`} className="bg-white text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold">{getSkillName(s)}</span>
                    ))}
                    {matchedSkills.length === 0 && missingSkills.length === 0 && normalizedSkills.map((s,i) => (
                      <span key={`n-${i}`} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold">{getSkillName(s)}</span>
                    ))}
                  </div>
                </section>

                {/* Work History Section */}
                <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-gray-150 pb-2">
                    <Briefcase size={16} className="text-gray-400" /> Work History
                  </h3>
                  
                  {loadingDetails ? (
                    <div className="space-y-4">
                      <div className="h-20 bg-gray-50 animate-pulse rounded-xl" />
                      <div className="h-20 bg-gray-50 animate-pulse rounded-xl" />
                    </div>
                  ) : experience.length > 0 ? (
                    <div className="relative border-l border-gray-200 ml-3 pl-6 space-y-6 my-2">
                      {experience.map((exp, i) => {
                        const responsibilities = exp.responsibilities || [];
                        const bullets = Array.isArray(responsibilities) 
                          ? responsibilities 
                          : (typeof responsibilities === 'string' ? responsibilities.split('\n') : []);
                        const descriptionBullets = exp.description 
                          ? String(exp.description).split('\n') 
                          : [];
                        const allBullets = [...bullets, ...descriptionBullets].filter(b => b.trim().length > 0);

                        return (
                          <div key={i} className="relative">
                            {/* Dot indicator */}
                            <span className="absolute -left-[30px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border border-gray-300">
                              <span className={`h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-[#1e293b]' : 'bg-[#3b82f6]'}`} />
                            </span>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm font-bold text-[#2A2A2A]">
                                <Briefcase size={13} className="text-gray-400 shrink-0" />
                                <span>{exp.role || exp.title || 'Role'}</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-[#2563EB]">{exp.company || 'Company'}</span>
                              </div>
                              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                {exp.start_date} — {exp.end_date || 'Present'}
                                {exp.duration && <span className="ml-2 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded lowercase font-medium">{exp.duration}</span>}
                              </div>
                              {allBullets.length > 0 ? (
                                <ul className="list-disc pl-4 text-xs text-gray-600 space-y-1 mt-2">
                                  {allBullets.map((bullet, idx) => (
                                    <li key={idx} className="leading-relaxed font-medium">
                                      {bullet.replace(/^\s*[\-\•\*\s]\s*/, '')}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-gray-400 italic mt-1">No detailed descriptions extracted.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic text-center py-2">No professional experience extracted.</p>
                  )}
                </section>

                {/* Projects Section */}
                {projects && projects.length > 0 && (
                  <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-gray-150 pb-2">
                      <Award size={16} className="text-gray-400" /> Projects
                    </h3>
                    
                    <div className="space-y-3">
                      {projects.map((proj, i) => {
                        const name = proj.name || proj.title || 'Project';
                        const badgeText = i === 0 ? "Featured" : ((proj.url || proj.link) ? "Open Source" : null);
                        const badgeColor = i === 0 
                          ? "bg-[#e6fcf5] text-[#0ca678] border-[#c3fae8]" 
                          : "bg-[#e7f5ff] text-[#1c7ed6] border-[#d0ebff]";

                        return (
                          <div key={i} className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-sm text-[#2A2A2A]">{name}</h4>
                              {badgeText && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
                                  {badgeText}
                                </span>
                              )}
                            </div>
                            
                            {proj.description && (
                              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                                {proj.description}
                              </p>
                            )}
                            
                            {proj.tech_stack && proj.tech_stack.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {proj.tech_stack.map((tech, j) => (
                                  <span key={j} className="bg-white text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            )}

                            {(proj.url || proj.link) && (
                              <div className="pt-1.5">
                                <a 
                                  href={proj.url || proj.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-xs text-[#2563EB] hover:underline inline-flex items-center gap-1 font-bold"
                                >
                                  View Project <ExternalLink size={10} />
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Education Section */}
                {education && education.length > 0 && (
                  <section className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-gray-150 pb-2">
                      <GraduationCap size={16} className="text-gray-400" /> Education
                    </h3>
                    
                    <div className="space-y-3">
                      {education.map((edu, i) => {
                        const isHonors = edu.cgpa >= 8.5 || edu.cgpa >= 3.5 || i === 0;
                        return (
                          <div key={i} className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-sm text-[#2A2A2A]">
                                {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                              </h4>
                              {isHonors && (
                                <span className="text-[10px] font-bold text-gray-500 bg-[#f1f3f5] border border-[#e9ecef] px-2 py-0.5 rounded-full">
                                  Honors
                                </span>
                              )}
                            </div>
                            
                            <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                              <span>{edu.institution}</span>
                              {edu.year_end && (
                                <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded">
                                  {edu.year_end}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {(edu.field ? [edu.field] : []).concat(
                                edu.cgpa ? [`CGPA: ${edu.cgpa}`] : []
                              ).concat(["Academic Core", "Theory & Labs"].slice(0, edu.field ? 1 : 2)).map((tag, idx) => (
                                <span key={idx} className="bg-white text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Certifications & Achievements */}
                {(certifications.length > 0 || achievements.length > 0) && (
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {certifications.length > 0 && (
                      <div>
                         <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Award size={14} className="text-gray-400"/> Certifications</h3>
                         <ul className="space-y-2">
                           {certifications.map((cert, i) => (
                             <li key={`cert-${i}`} className="bg-gray-50 border border-gray-100 p-3 rounded-lg flex flex-col">
                               <span className="font-bold text-[#2A2A2A] text-xs">{cert.name || cert}</span>
                               {(cert.issuer || cert.date) && (
                                <span className="text-[10px] font-semibold text-gray-500 mt-0.5">
                                  {cert.issuer} {cert.date ? `(${cert.date})` : ''}
                                </span>
                               )}
                             </li>
                           ))}
                         </ul>
                      </div>
                    )}
                    {achievements.length > 0 && (
                      <div>
                         <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Award size={14} className="text-gray-400"/> Achievements</h3>
                         <ul className="space-y-2">
                           {achievements.map((ach, i) => (
                             <li key={`ach-${i}`} className="bg-[#FFFDF5] border border-[#FDE68A] text-[#92400E] p-3 rounded-lg text-xs font-semibold flex gap-2">
                               <span className="text-[#F59E0B] flex-shrink-0">★</span> {ach}
                             </li>
                           ))}
                         </ul>
                      </div>
                    )}
                  </section>
                )}

                {/* Languages */}
                {languages.length > 0 && (
                  <section>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {languages.map((lang, i) => (
                        <span key={`lang-${i}`} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                          {typeof lang === 'string' ? lang : `${lang.language || lang.name} ${lang.proficiency ? `(${lang.proficiency})` : ''}`}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Source & Round Info */}
                <section>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Candidate Info</h3>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Source</span>
                      <span className="font-semibold text-[#2A2A2A] capitalize">{activeCandidate?.source || 'upload'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Status</span>
                      <span className={`font-semibold capitalize ${
                        activeCandidate?.status === 'hired' ? 'text-green-600' :
                        activeCandidate?.status === 'rejected' ? 'text-red-600' :
                        'text-[#2A2A2A]'
                      }`}>{activeCandidate?.status || 'new'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Current Round</span>
                      <span className="font-semibold text-[#2A2A2A]">{currentRoundIndex}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Recommendation</span>
                      <span className={`font-semibold ${
                        activeCandidate?.recommendation === 'Strong' ? 'text-green-600' :
                        activeCandidate?.recommendation === 'Moderate' ? 'text-amber-600' :
                        'text-red-600'
                      }`}>{activeCandidate?.recommendation || 'N/A'}</span>
                    </div>
                  </div>
                </section>
              </div>

              {/* DRAWER FOOTER */}
              {!isHiredOrRejected && (
                <div className="p-5 border-t border-gray-100 bg-white grid grid-cols-2 gap-4 shrink-0 box-content pb-6">
                  <button 
                    onClick={() => { setShowDetail(false); handleReject(); }}
                    className="py-3 border-2 border-red-100 text-[#EF4444] bg-white hover:bg-red-50 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors"
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => { setShowDetail(false); handleForwardOrHire(); }}
                    className={`py-3 shadow-md rounded-xl font-bold uppercase tracking-widest text-xs transition-colors ${
                      isLastRound ? 'bg-[#22C55E] hover:bg-[#166534] text-white shadow-green-600/20' : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-orange-500/20'
                    }`}
                  >
                    {isLastRound ? <span className="flex items-center justify-center gap-1.5"><Sparkles size={12} /> Hire Candidate</span> : 'Forward to Next →'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* OFFER LETTER UPLOAD MODAL */}
      <AnimatePresence>
        {showOfferModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowOfferModal(false)}
              className="fixed inset-0 bg-[#2A2A2A]/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 m-auto w-full max-w-[480px] h-fit bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/20 z-[61] flex flex-col gap-4 text-[#2A2A2A]"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles size={20} className="text-green-500" />
                  Hire {candidate?.name}
                </h3>
                <button 
                  onClick={() => setShowOfferModal(false)} 
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-gray-600">
                To complete hiring, please upload the offer letter. The candidate will be notified and can view or download it from their dashboard.
              </p>

              {/* File drop zone */}
              <OfferLetterUploadZone onSubmit={submitHire} onCancel={() => setShowOfferModal(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function OfferLetterUploadZone({ onSubmit, onCancel }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("Offer letter file size must be less than 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("Offer letter file size must be less than 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  return (
    <div className="space-y-4">
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
          dragActive 
            ? 'border-green-500 bg-green-50/50' 
            : file 
              ? 'border-green-300 bg-green-50/20' 
              : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
        }`}
        onClick={() => document.getElementById('offer-file-input').click()}
      >
        <input 
          id="offer-file-input" 
          type="file" 
          className="hidden" 
          accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg" 
          onChange={handleChange}
        />
        <FileText size={32} className={file ? 'text-green-500' : 'text-gray-400'} />
        {file ? (
          <div className="text-sm font-bold text-green-700 truncate max-w-full">
            {file.name}
            <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            <span className="font-bold text-[#2563EB]">Click to upload</span> or drag and drop
            <span className="block text-[10px] text-gray-400 mt-1">
              Supports PDF, DOCX, DOC, TXT, PNG, JPG (Max 10MB)
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button 
          onClick={onCancel}
          className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={() => {
            if (!file) {
              toast.error("Please upload an offer letter to proceed");
              return;
            }
            onSubmit(file);
          }}
          disabled={!file}
          className={`px-4 py-2 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-sm ${
            file ? 'bg-[#22C55E] hover:bg-[#166534]' : 'bg-gray-300 cursor-not-allowed shadow-none'
          }`}
        >
          Confirm Hire
        </button>
      </div>
    </div>
  );
}

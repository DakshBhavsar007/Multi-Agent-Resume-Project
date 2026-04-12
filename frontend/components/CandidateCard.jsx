"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, MapPin, Link2, Eye, X, CheckCircle, XCircle, Briefcase, GraduationCap, Github, Linkedin, Award, Clock, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { candidatesAPI } from '../lib/api';

export default function CandidateCard({ candidate, sessionId, rounds = [], onAction, isHighlighted }) {
  const [showDetail, setShowDetail] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const getInitials = (name) => {
    if (!name) return "??";
    return name.slice(0, 2).toUpperCase();
  };

  const getHashColor = (name) => {
    if (!name) return "#C8871A";
    const colors = ["#C8871A", "#3B82F6", "#22C55E", "#8B5CF6", "#EF4444", "#F59E0B"];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  const getScoreColor = (score) => {
    if (score >= 75) return "#22C55E";
    if (score >= 50) return "#C8871A";
    return "#EF4444";
  };

  const getBadge = (score) => {
    if (score >= 80) return <span className="bg-[#DCFCE7] text-[#166534] font-bold border border-[#BBF7D0] px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Strong Match</span>;
    if (score >= 60) return <span className="bg-amber-100 text-amber-700 font-bold border border-amber-200 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Good Match</span>;
    if (score >= 40) return <span className="bg-orange-100 text-orange-700 font-bold border border-orange-200 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Partial Match</span>;
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

  const handleForwardOrHire = async () => {
    const isHire = isLastRound;

    setAnimatingOut(true);
    try {
      await candidatesAPI.action(sessionId, candidate?.id, isHire ? "hire" : "forward");
      toast.success(isHire ? `${candidate?.name} has been hired! 🎉` : `${candidate?.name} forwarded to next round`);
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

  const matchedSkills = candidate?.matched_skills || [];
  const missingSkills = candidate?.missing_skills || [];
  const otherSkills = candidate?.other_skills || [];
  const normalizedSkills = candidate?.normalized_skills || [];
  const allSkills = matchedSkills.length > 0 || missingSkills.length > 0 ? [...matchedSkills, ...missingSkills] : normalizedSkills;
  const hasSkills = allSkills.length > 0 || otherSkills.length > 0;
  const experience = candidate?.experience || [];
  const education = candidate?.education || [];
  const expYears = candidate?.experience_years ?? candidate?.total_experience_years ?? 0;

  // New deeply extracted fields
  const rawData = candidate?.raw_resume_data || {};
  const summary = rawData.summary || candidate?.summary || "";
  const projects = rawData.projects || candidate?.projects || [];
  const certifications = rawData.certifications || candidate?.certifications || [];
  const achievements = rawData.achievements || candidate?.achievements || [];
  const languages = rawData.languages || candidate?.languages || [];

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1").replace("/api/v1", "");
  const photoUrl = candidate?.photo_url ? (candidate.photo_url.startsWith('http') ? candidate.photo_url : `${apiBase}${candidate.photo_url}`) : null;
  const resumeUrl = candidate?.resume_url ? (candidate.resume_url.startsWith('http') ? candidate.resume_url : `${apiBase}${candidate.resume_url}`) : null;

  // Key Highlights logic
  const topMatched = candidate?.matched_skills?.slice(0, 3) || [];
  const topOther = candidate?.other_skills?.slice(0, 3) || [];
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
          isHighlighted ? 'border-[#C8871A] shadow-[0_0_0_1px_#C8871A,0_0_16px_rgba(200,135,26,0.3)] relative z-10' : 'border-transparent shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
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
                <span className="text-[12px] text-[#C8871A] font-semibold truncate">{candidate.current_role}</span>
              )}
              {candidate?.current_role && <span className="text-gray-300">•</span>}
              <span className="text-[12px] text-gray-500 flex items-center gap-0.5"><MapPin size={11}/> {candidate?.location || "Unknown"}</span>
              <span className="text-gray-300">•</span>
              <span className="text-[12px] text-gray-500 flex items-center gap-1">💼 {expYears} yrs</span>
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
                  : 'bg-orange-50 text-orange-700 border-orange-100'
              }`}>
                {h}
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
              ✓ {s}
            </span>
          ))}
          {missingSkills.slice(0, 2).map((s, i) => (
            <span key={i} className="bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5">
              ✗ {s}
            </span>
          ))}
          {matchedSkills.length === 0 && missingSkills.length === 0 && normalizedSkills.slice(0, 5).map((s, i) => (
            <span key={i} className="bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
              {s}
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
              <span className="text-[#C8871A]">{experience[0]?.company || "Company"}</span>
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
               📄 Resume
            </a>
          )}
          
          {!isHiredOrRejected && (
            <>
              <button 
                onClick={handleForwardOrHire}
                className={`flex-[1.5] text-white py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 ${
                  isLastRound ? 'bg-[#22C55E] hover:bg-[#166534]' : 'bg-[#C8871A] hover:bg-[#A06B10]'
                }`}
              >
                {isLastRound ? <>🎉 Hire</> : <>Forward &rarr;</>}
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
              onClick={() => setShowDetail(false)}
              className="fixed inset-0 bg-[#2A2A2A]/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-[520px] bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-[#F5F0E8]/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full font-bold text-white flex items-center justify-center text-sm shadow-sm" style={{backgroundColor: getHashColor(candidate?.name)}}>
                    {getInitials(candidate?.name)}
                  </div>
                  <div>
                    <h2 className="font-black text-lg text-[#2A2A2A] tracking-tight leading-tight">{candidate?.name || 'Candidate Details'}</h2>
                    <p className="text-sm text-gray-500 font-medium">{candidate?.current_role || 'Candidate'}</p>
                  </div>
                </div>
                <button onClick={() => setShowDetail(false)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
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
                      <Mail size={16} className="text-gray-400"/> {candidate?.email || 'N/A'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#2A2A2A] font-medium">
                      <Phone size={16} className="text-gray-400"/> {candidate?.phone || 'N/A'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#2A2A2A] font-medium">
                      <MapPin size={16} className="text-gray-400"/> {candidate?.location || 'N/A'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#2A2A2A] font-medium">
                      <Briefcase size={16} className="text-gray-400"/> {expYears} years of experience
                    </div>
                    {candidate?.linkedin_url && (
                      <div className="flex items-center gap-3 text-sm font-medium">
                        <Linkedin size={16} className="text-blue-500"/>
                        <a href={candidate.linkedin_url} target="_blank" rel="noopener" className="text-[#C8871A] hover:underline flex items-center gap-1">
                          LinkedIn Profile <ExternalLink size={12}/>
                        </a>
                      </div>
                    )}
                    {candidate?.github_url && (
                      <div className="flex items-center gap-3 text-sm font-medium">
                        <Github size={16} className="text-gray-700"/>
                        <a href={candidate.github_url} target="_blank" rel="noopener" className="text-[#C8871A] hover:underline flex items-center gap-1">
                          GitHub Profile <ExternalLink size={12}/>
                        </a>
                      </div>
                    )}
                  </div>
                </section>

                {/* Scores */}
                <section>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex justify-between items-end">
                    Match Breakdown
                    <span className="text-3xl font-black text-[#2A2A2A]">{score}<span className="text-xl">%</span></span>
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                        <span>Skills Match</span>
                        <span className="text-[#C8871A]">{candidate?.skill_score || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#C8871A]" style={{width: `${candidate?.skill_score||0}%`}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                        <span>Experience Match</span>
                        <span className="text-[#C8871A]">{candidate?.experience_score || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#C8871A]" style={{width: `${candidate?.experience_score||0}%`}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
                        <span>Location Match</span>
                        <span className="text-[#C8871A]">{candidate?.location_score || 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#C8871A]" style={{width: `${candidate?.location_score||0}%`}}></div>
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
                        <CheckCircle size={14} className="text-green-500"/> {s}
                      </span>
                    ))}
                    {missingSkills.map((s,i) => (
                      <span key={`x-${i}`} className="bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                        <XCircle size={14} className="text-gray-400"/> {s}
                      </span>
                    ))}
                    {otherSkills.map((s,i) => (
                      <span key={`o-${i}`} className="bg-white text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold">{s}</span>
                    ))}
                    {matchedSkills.length === 0 && missingSkills.length === 0 && normalizedSkills.map((s,i) => (
                      <span key={`n-${i}`} className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold">{s}</span>
                    ))}
                  </div>
                </section>

                {/* Experience */}
                <section>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Professional Experience</h3>
                  <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                     {experience.map((exp, i) => (
                       <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                         <div className="flex items-center justify-center w-[14px] h-[14px] rounded-full border-2 border-white bg-[#C8871A] shrink-0 md:order-1 relative z-10 shadow-sm ml-[3px]"></div>
                         <div className="w-[calc(100%-2.5rem)] ml-4 bg-white border border-gray-100 p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                           <div className="flex flex-col gap-1 mb-2">
                             <h4 className="font-bold text-sm text-[#2A2A2A]">{exp.role || exp.title || 'Role'}</h4>
                             <span className="text-xs font-bold text-[#C8871A]">{exp.company || 'Company'}</span>
                             <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                               {exp.start_date} - {exp.end_date || 'Present'} 
                               {exp.duration && <span className="bg-gray-100 px-1.5 py-0.5 rounded lowercase font-medium text-gray-500">{exp.duration}</span>}
                             </span>
                           </div>
                           {exp.description && (
                             <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4 mt-2 font-medium">
                               {String(exp.description).split('\n').filter(Boolean).map((d, idx) => (
                                 <li key={idx}>{d}</li>
                               ))}
                             </ul>
                           )}
                         </div>
                       </div>
                     ))}
                     {experience.length === 0 && <p className="text-sm text-gray-500 italic">No experience data extracted</p>}
                  </div>
                </section>

                {/* Education */}
                <section>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Education</h3>
                  <div className="space-y-3">
                    {education.map((edu, i) => (
                      <div key={i} className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 flex flex-col">
                        <h4 className="font-bold text-sm text-[#2A2A2A]">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h4>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs font-semibold text-gray-500">{edu.institution}</span>
                          {edu.year && <span className="text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded">{edu.year}</span>}
                        </div>
                      </div>
                    ))}
                    {education.length === 0 && <p className="text-sm text-gray-500 italic">No education data extracted</p>}
                  </div>
                </section>

                {/* Projects */}
                {projects && projects.length > 0 && (
                  <section>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Award size={14} className="text-gray-400"/> Key Projects</h3>
                    <div className="space-y-3">
                      {projects.map((proj, i) => (
                        <div key={`proj-${i}`} className="bg-white border border-gray-100 p-4 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-sm text-[#2A2A2A]">{proj.name || 'Project'}</h4>
                            {(proj.url || proj.link) && (
                              <a href={proj.url || proj.link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                                View <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                          {proj.description && <p className="text-xs font-medium text-gray-600 mt-2">{proj.description}</p>}
                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {proj.technologies.map((tech, j) => (
                                <span key={j} className="bg-gray-100 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold">{tech}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
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
                      <span className="font-semibold text-[#2A2A2A] capitalize">{candidate?.source || 'upload'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Status</span>
                      <span className={`font-semibold capitalize ${
                        candidate?.status === 'hired' ? 'text-green-600' :
                        candidate?.status === 'rejected' ? 'text-red-600' :
                        'text-[#2A2A2A]'
                      }`}>{candidate?.status || 'new'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Current Round</span>
                      <span className="font-semibold text-[#2A2A2A]">{currentRoundIndex}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-0.5">Recommendation</span>
                      <span className={`font-semibold ${
                        candidate?.recommendation === 'Strong' ? 'text-green-600' :
                        candidate?.recommendation === 'Moderate' ? 'text-amber-600' :
                        'text-red-600'
                      }`}>{candidate?.recommendation || 'N/A'}</span>
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
                      isLastRound ? 'bg-[#22C55E] hover:bg-[#166534] text-white shadow-green-600/20' : 'bg-[#C8871A] hover:bg-[#A06B10] text-white shadow-orange-500/20'
                    }`}
                  >
                    {isLastRound ? '🎉 Hire Candidate' : 'Forward to Next →'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

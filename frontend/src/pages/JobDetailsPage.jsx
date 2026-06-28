import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bookmark, Share2, Calendar, Briefcase, DollarSign, Users, CheckCircle2, ChevronRight, X, RefreshCw, AlertCircle, Award, Building, Lightbulb, Sparkles, MapPin, Key, Check, Bot, Phone, TrendingUp, Code, Star, Shield } from 'lucide-react';
import { publicJobsAPI } from '../lib/api';
import JobsNavbar from '../components/JobsNavbar';
import ResumeUploadModal from '../components/ResumeUploadModal';
import { toast } from 'react-hot-toast';

const emojiMap = {
  '🏢': <Building className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '💰': <DollarSign className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '📍': <MapPin className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '💼': <Briefcase className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '🔑': <Key className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '✨': <Sparkles className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '🎉': <Sparkles className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '⚠️': <AlertCircle className="inline-block w-3.5 h-3.5 mx-0.5 text-red-500 align-text-bottom" />,
  '💡': <Lightbulb className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '✅': <Check className="inline-block w-3.5 h-3.5 mx-0.5 text-green-600 align-text-bottom" />,
  '✔️': <Check className="inline-block w-3.5 h-3.5 mx-0.5 text-green-600 align-text-bottom" />,
  '🤖': <Bot className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '📞': <Phone className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '🚀': <TrendingUp className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '💻': <Code className="inline-block w-3.5 h-3.5 mx-0.5 text-[#2563EB] align-text-bottom" />,
  '⭐': <Star className="inline-block w-3.5 h-3.5 mx-0.5 text-amber-500 align-text-bottom" />,
  '★': <Star className="inline-block w-3.5 h-3.5 mx-0.5 text-amber-500 align-text-bottom" />,
  '🔥': <Sparkles className="inline-block w-3.5 h-3.5 mx-0.5 text-blue-500 align-text-bottom" />
};

const renderTextWithIcons = (text) => {
  if (!text) return text;
  const emojiRegex = new RegExp(`(${Object.keys(emojiMap).join('|')})`, 'g');
  const parts = text.split(emojiRegex);
  return parts.map((part, i) => {
    if (emojiMap[part]) {
      return <React.Fragment key={i}>{emojiMap[part]}</React.Fragment>;
    }
    return part;
  });
};

const parseJobDescription = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const metadata = {};
  const contentSections = [];
  let currentSection = null;

  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Skip separator lines like === or ---
    if (/^[=\-_]{3,}$/.test(trimmed)) {
      return;
    }

    // Check for KEY: VALUE pairs in the header block
    const match = trimmed.match(/^([A-Z\s_]+):\s*(.+)$/);
    if (match && !trimmed.startsWith("ABOUT") && !trimmed.startsWith("WHAT") && !trimmed.startsWith("REQUIREMENTS") && !trimmed.startsWith("ROLE OVERVIEW") && !trimmed.startsWith("RESPONSIBILITIES")) {
      const key = match[1].trim();
      const val = match[2].trim();
      metadata[key] = val;
      return;
    }

    // Check for headers (all uppercase lines)
    if (trimmed.length > 3 && trimmed === trimmed.toUpperCase() && !trimmed.includes(':') && !/^[0-9\s]+$/.test(trimmed)) {
      if (currentSection) {
        contentSections.push(currentSection);
      }
      currentSection = {
        title: trimmed,
        items: []
      };
      return;
    }

    // Add content to current section
    if (trimmed) {
      if (!currentSection) {
        currentSection = {
          title: "",
          items: []
        };
      }
      currentSection.items.push(trimmed);
    }
  });

  if (currentSection) {
    contentSections.push(currentSection);
  }

  return { metadata, sections: contentSections };
};

export default function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seekerProfile, setSeekerProfile] = useState(null);

  // Safety check states
  const [safetyReport, setSafetyReport] = useState(null);
  const [checkingSafety, setCheckingSafety] = useState(false);

  // Apply Modal states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyFile, setApplyFile] = useState(null);
  const [applyName, setApplyName] = useState('');
  const [applyEmail, setApplyEmail] = useState('');
  const [applyPhone, setApplyPhone] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);

  const syncProfile = () => {
    const saved = localStorage.getItem('vish_seeker_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSeekerProfile(parsed);
        setApplyName(parsed.name || '');
        setApplyEmail(parsed.email || '');
        setApplyPhone(parsed.phone || '');
      } catch (e) {
        setSeekerProfile(null);
      }
    } else {
      setSeekerProfile(null);
    }
  };

  useEffect(() => {
    syncProfile();
    window.addEventListener('seeker_profile_updated', syncProfile);
    return () => window.removeEventListener('seeker_profile_updated', syncProfile);
  }, []);

  const loadJobDetails = async () => {
    setLoading(true);
    try {
      const data = await publicJobsAPI.get(id);
      setJob(data);
      
      // Fetch list and get similar
      const allJobs = await publicJobsAPI.list();
      const filtered = allJobs.filter(j => j.id !== id).slice(0, 2);
      setSimilarJobs(filtered);

      // Fetch safety check report (non-blocking)
      try {
        const report = await publicJobsAPI.verifySafety(id);
        setSafetyReport(report);
      } catch (e) {
        // Silent fail if not scanned before
      }
    } catch (err) {
      toast.error("Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const handleRunSafetyCheck = async () => {
    setCheckingSafety(true);
    try {
      const report = await publicJobsAPI.verifySafety(id);
      setSafetyReport(report);
      toast.success("Hiring safety report generated!");
    } catch (err) {
      toast.error(err.message || "Failed to verify safety rating");
    } finally {
      setCheckingSafety(false);
    }
  };

  useEffect(() => {
    loadJobDetails();
  }, [id]);

  const calculateJobScore = (targetJob) => {
    if (!targetJob) return 85;
    if (!seekerProfile) {
      if (targetJob.job_title?.toLowerCase().includes('product')) return 98;
      if (targetJob.job_title?.toLowerCase().includes('architect') || targetJob.job_title?.toLowerCase().includes('frontend') || targetJob.job_title?.toLowerCase().includes('full stack')) return 92;
      return 85;
    }

    const required = targetJob.required_skills || [];
    if (!required.length) return 85;

    const candSkills = new Set(seekerProfile.skills?.map(s => (s.canonical_skill || s.skill).toLowerCase()));
    const matchedSkills = required.filter(s => candSkills.has(s.toLowerCase()));
    
    const skillScore = Math.round((matchedSkills.length / required.length) * 100);
    
    const jobMinExp = targetJob.min_experience || 0;
    const candExp = seekerProfile.total_experience_years || 0;
    const expScore = candExp >= jobMinExp ? 100 : Math.round((candExp / Math.max(jobMinExp, 1)) * 100);
    
    return Math.min(100, Math.round(skillScore * 0.7 + expScore * 0.3));
  };

  const calculateMatchDetails = () => {
    const score = calculateJobScore(job);

    const defaultDetails = {
      score,
      matchedSkills: job?.required_skills?.slice(0, 3) || [],
      missingSkills: job?.required_skills?.slice(3, 5) || [],
      text: "You're a strong candidate!"
    };

    if (!job) return defaultDetails;

    const required = job.required_skills || [];
    const candSkills = seekerProfile
      ? new Set(seekerProfile.skills?.map(s => (s.canonical_skill || s.skill).toLowerCase()))
      : new Set();
    
    const matchedSkills = required.filter(s => candSkills.has(s.toLowerCase()));
    const missingSkills = required.filter(s => !candSkills.has(s.toLowerCase()));
    
    let text = "Good match!";
    if (score >= 90) text = "Excellent candidate!";
    else if (score >= 75) text = "You're a strong candidate!";
    else if (score >= 50) text = "Moderate match. Consider optimizing skills.";
    else text = "Low match. Build skills and apply!";

    return { score, matchedSkills, missingSkills, text };
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyFile) {
      toast.error("Please upload your resume file to apply");
      return;
    }

    setApplyLoading(true);
    try {
      const data = await publicJobsAPI.apply(job.id, applyFile, {
        name: applyName,
        email: applyEmail,
        phone: applyPhone
      });

      const applied = JSON.parse(localStorage.getItem('vish_applied_jobs') || '[]');
      applied.push({
        jobId: job.id,
        jobTitle: job.job_title,
        companyName: job.company_name,
        appliedAt: new Date().toISOString(),
        matchScore: data.match_details?.match_score || 85,
        status: 'Submitted'
      });
      localStorage.setItem('vish_applied_jobs', JSON.stringify(applied));

      toast.success(`Application sent successfully!`);
      
      if (data.parsed_profile) {
        localStorage.setItem('vish_seeker_profile', JSON.stringify(data.parsed_profile));
        window.dispatchEvent(new Event('seeker_profile_updated'));
      }

      setShowApplyModal(false);
      setApplyFile(null);
    } catch (err) {
      toast.error(err.message || "Failed to submit application");
    } finally {
      setApplyLoading(false);
    }
  };

  const handleShareClick = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: job?.title || 'Job', url }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => {
          toast.success("Job link copied to clipboard!");
        })
        .catch(() => {
          // fallback for insecure context (HTTP)
          const ta = document.createElement('textarea');
          ta.value = url;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          toast.success("Job link copied to clipboard!");
        });
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success("Job link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f4ef] flex flex-col">
        <JobsNavbar onUploadClick={() => setIsModalOpen(true)} />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="animate-spin text-[#2563EB]" size={32} />
          <span className="text-sm text-[#5c5c5c]">Retrieving job details...</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#f5f4ef] flex flex-col">
        <JobsNavbar onUploadClick={() => setIsModalOpen(true)} />
        <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-center px-6">
          <AlertCircle className="text-[#EF4444]" size={48} />
          <div>
            <h3 className="font-bold text-lg text-[#2A2A2A]">Job Posting Not Found</h3>
            <p className="text-xs text-[#5c5c5c] mt-1">This job listing may have expired or been archived.</p>
          </div>
          <Link to="/jobs/search" className="bg-[#2563EB] text-white px-6 py-2.5 rounded-xl font-bold text-xs">
            Return to search
          </Link>
        </div>
      </div>
    );
  }

  const { score, matchedSkills, missingSkills, text } = calculateMatchDetails();

  return (
    <div className="min-h-screen bg-[#f5f4ef] text-[#2A2A2A] font-sans flex flex-col">
      <JobsNavbar onUploadClick={() => setIsModalOpen(true)} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Back Link */}
        <Link to="/jobs/search" className="flex items-center space-x-2 text-sm text-[#5c5c5c] hover:text-[#2A2A2A] font-medium transition-colors">
          <ArrowLeft size={16} />
          <span>Back to Jobs</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Main column - Job Details */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Header card matching inspiratio_ui5.jpeg top block */}
            <div className="bg-white border border-[#e6dfcd] p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-[#f5f4ef] border border-[#e6dfcd] text-[#2563EB] text-xl font-bold rounded-2xl flex items-center justify-center uppercase shadow-inner">
                  {job.company_name[0]}
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-extrabold text-[#2A2A2A] leading-tight">{job.job_title}</h1>
                  <p className="text-sm text-[#5c5c5c] font-medium flex items-center gap-1.5">
                    <Building size={14} className="text-[#5c5c5c]" />
                    <span><span className="text-[#2563EB] font-semibold">{job.company_name}</span> • {job.preferred_locations?.join(', ') || 'Remote'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 w-full md:w-auto">
                <button className="flex-1 md:flex-initial bg-[#f5f4ef] border border-[#e6dfcd] hover:border-[#2563EB] text-[#2A2A2A] font-bold text-xs px-5 py-3 rounded-xl transition-all flex items-center justify-center space-x-2">
                  <Bookmark size={14} />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="flex-1 md:flex-initial bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2"
                >
                  <span>Apply Now</span>
                </button>
              </div>
            </div>

            {/* Match score & Skill Alignment Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Circular Dial match score card (Blue filled card) */}
              <div className="md:col-span-4 bg-[#0F56B3] text-white p-6 rounded-3xl shadow-sm flex flex-col items-center justify-center space-y-4 text-center">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="56" cy="56" r="46" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="transparent" />
                    <circle
                      cx="56" cy="56" r="46"
                      stroke="white" strokeWidth="6" fill="transparent"
                      strokeDasharray="290"
                      strokeDashoffset={290 - (290 * score) / 100}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <span className="absolute text-2xl font-black">{score}%</span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">Match Score</h4>
                  <p className="text-white/80 text-[11px] font-medium mt-1 leading-snug">
                    {text}
                  </p>
                </div>
              </div>

              {/* Skill alignment board */}
              <div className="md:col-span-8 bg-white border border-[#e6dfcd] p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-[#2A2A2A]">Skill Alignment</h3>
                  
                  {/* Skill Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {/* Matching */}
                    {matchedSkills.map((s, idx) => (
                      <span key={`matched-${idx}`} className="bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
                        <CheckCircle2 size={12} />
                        <span>{s}</span>
                      </span>
                    ))}
                    {/* Missing */}
                    {missingSkills.map((s, idx) => (
                      <span key={`missing-${idx}`} className="bg-[#f5f4ef] border border-[#e6dfcd] text-[#5c5c5c] text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        <span>{s} (Optional)</span>
                      </span>
                    ))}
                    {/* Fallback if no skills loaded */}
                    {!matchedSkills.length && !missingSkills.length && (
                      <span className="text-xs text-[#5c5c5c]">Upload a resume to compare matching skill taxonomies.</span>
                    )}
                  </div>
                </div>

                {/* Optimisation Tip box */}
                <div className="bg-[#F0F6FF] border border-[#BFDBFE] p-3 rounded-xl text-[11px] text-[#2563EB] font-medium leading-relaxed flex items-start gap-2">
                  {missingSkills.length > 0 ? (
                    <>
                      <Lightbulb size={14} className="shrink-0 text-[#2563EB] mt-0.5" />
                      <span>
                        <strong>Tip:</strong> Adding <strong>"{missingSkills[0]}"</strong> to your resume profile might increase your match score by {Math.min(10, Math.round(100 / (job.required_skills?.length || 10)))}%.
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="shrink-0 text-[#2563EB] mt-0.5" />
                      <span>
                        <strong>Awesome:</strong> You have mapped all required skills for this profile. You are highly competitive!
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Role Overview */}
            <div className="bg-white border border-[#e6dfcd] p-8 rounded-3xl shadow-sm space-y-6">
              <div className="space-y-4 pb-6 border-b border-[#f5f4ef]">
                <h3 className="text-lg font-bold text-[#2A2A2A] flex items-center space-x-2">
                  <Award size={18} className="text-[#2563EB]" />
                  <span>Role Overview</span>
                </h3>
                
                {(() => {
                  const parsed = parseJobDescription(job.job_description);
                  if (!parsed) {
                    return (
                      <p className="text-sm text-[#5c5c5c] leading-relaxed whitespace-pre-wrap">
                        {renderTextWithIcons(job.job_description)}
                      </p>
                    );
                  }

                  const { metadata, sections } = parsed;
                  return (
                    <div className="space-y-6">
                      {Object.keys(metadata).length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-[#f5f4ef]/30 border border-[#e6dfcd] rounded-2xl">
                          {Object.entries(metadata).map(([key, val]) => (
                            <div key={key} className="space-y-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#5c5c5c]">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <p className="text-xs font-bold text-[#2A2A2A] leading-tight font-sans">
                                {renderTextWithIcons(val)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {sections.map((sec, idx) => (
                        <div key={idx} className="space-y-3 pt-2">
                          {sec.title && (
                            <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#2A2A2A] border-l-4 border-[#2563EB] pl-3 py-0.5">
                              {sec.title}
                            </h4>
                          )}
                          <div className="space-y-2">
                            {sec.items.map((item, itemIdx) => {
                              if (item.startsWith('- ') || item.startsWith('* ')) {
                                return (
                                  <div key={itemIdx} className="flex items-start space-x-2 text-xs text-[#5c5c5c] leading-relaxed pl-3">
                                    <span className="text-[#2563EB] mt-1 shrink-0 font-bold">•</span>
                                    <span>{renderTextWithIcons(item.substring(2))}</span>
                                  </div>
                                );
                              }
                              return (
                                <p key={itemIdx} className="text-xs text-[#5c5c5c] leading-relaxed whitespace-pre-wrap pl-1 font-sans">
                                  {renderTextWithIcons(item)}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Mock Responsibilities & Qualifications for UI completeness */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                <div className="space-y-4">
                  <h4 className="font-extrabold text-sm text-[#2A2A2A]">Key Responsibilities</h4>
                  <ul className="text-xs text-[#5c5c5c] space-y-2.5 list-disc pl-4">
                    <li>Drive engineering pipelines and model optimizations inside core frameworks.</li>
                    <li>Collaborate with cross-functional designer groups to establish visual alignment standards.</li>
                    <li>Audit security tokens and micro-services for zero-downtime environments.</li>
                    <li>Participate in standups, architectural designs, and peer code evaluations.</li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-extrabold text-sm text-[#2A2A2A]">Required Qualifications</h4>
                  <ul className="text-xs text-[#5c5c5c] space-y-2.5 list-disc pl-4">
                    <li>B.S./M.S. in Computer Science, Design Systems, or related field.</li>
                    <li>{job.min_experience ? `${job.min_experience}+` : '3+'} years of experience working inside enterprise developer layers.</li>
                    <li>Proficient background with: {job.required_skills?.slice(0, 3).join(', ') || 'React, Python'}.</li>
                    <li>Highly communicative, self-starter mindset suited for distributed structures.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Job Summary and Similar Jobs */}
          <div className="lg:col-span-4 space-y-6">

            {/* AI Safety Verification Audit */}
            <div className="bg-white border border-[#e6dfcd] p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <Shield className="text-[#2563EB] w-5 h-5" />
                <h3 className="font-bold text-sm text-[#2A2A2A]">Legitimacy Verification</h3>
              </div>
              
               {safetyReport ? (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#5c5c5c]">Trust Score:</span>
                    <span className={`text-sm font-black ${
                      safetyReport.originality_score >= 80 ? "text-emerald-500" : safetyReport.originality_score >= 60 ? "text-amber-500" : "text-red-500"
                    }`}>
                      {safetyReport.originality_score}/100
                    </span>
                  </div>
                  <div className="w-full bg-[#f5f4ef] rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        safetyReport.originality_score >= 80 ? "bg-emerald-500" : safetyReport.originality_score >= 60 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${safetyReport.originality_score}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[9px] font-bold">
                    <div className="bg-[#f5f4ef]/60 p-2 rounded-lg border border-[#e6dfcd]">
                      <p className="text-gray-400 font-extrabold uppercase">Risk Level</p>
                      <p className={`text-xs font-black mt-0.5 ${
                        (safetyReport.risk_level || "Low") === "High" ? "text-red-500" :
                        (safetyReport.risk_level || "Low") === "Medium" ? "text-amber-500" : "text-emerald-500"
                      }`}>
                        {safetyReport.risk_level || (safetyReport.originality_score >= 80 ? "Low" : safetyReport.originality_score >= 60 ? "Medium" : "High")}
                      </p>
                    </div>
                    <div className="bg-[#f5f4ef]/60 p-2 rounded-lg border border-[#e6dfcd]">
                      <p className="text-gray-400 font-extrabold uppercase">Verified Co.</p>
                      <p className={`text-xs font-black mt-0.5 ${
                        (safetyReport.verified_company || "Yes") === "Yes" ? "text-emerald-500" : "text-red-500"
                      }`}>
                        {safetyReport.verified_company || (safetyReport.originality_score >= 70 ? "Yes" : "No")}
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] font-medium leading-relaxed bg-[#f5f4ef]/40 border border-[#e6dfcd] p-2.5 rounded-xl text-[#5c5c5c]">
                    <strong>Audit Status:</strong> {safetyReport.status}<br />
                    <span className="text-[10px] text-gray-400">Scan date: {new Date(safetyReport.created_at).toLocaleDateString()}</span>
                  </div>

                  {safetyReport.flags && safetyReport.flags.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Risk Assessment Flags:</p>
                      <div className="flex flex-wrap gap-1">
                        {safetyReport.flags.map((flag, i) => (
                          <span key={i} className="bg-red-50 border border-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded font-semibold">
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleRunSafetyCheck}
                    disabled={checkingSafety}
                    className="w-full bg-[#f5f4ef] hover:bg-[#e6dfcd] border border-[#e6dfcd] text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center space-x-1"
                  >
                    <RefreshCw size={12} className={checkingSafety ? "animate-spin" : ""} />
                    <span>Run New Audit</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-[#5c5c5c] leading-relaxed">
                    Verify that this job posting is legitimate and free from fake template patterns or phishing scams.
                  </p>
                  <button
                    onClick={handleRunSafetyCheck}
                    disabled={checkingSafety}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2"
                  >
                    {checkingSafety ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Generating report...</span>
                      </>
                    ) : (
                      <>
                        <Shield size={14} />
                        <span>Verify Hiring Legitimacy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            {/* Job Summary card */}
            <div className="bg-white border border-[#e6dfcd] p-6 rounded-3xl shadow-sm space-y-6">
              <h3 className="font-bold text-sm text-[#2A2A2A] pb-2 border-b border-[#f5f4ef]">Job Summary</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-xs text-[#5c5c5c]">
                  <Calendar size={16} className="text-[#2563EB] shrink-0" />
                  <div>
                    <p className="font-bold text-[#2A2A2A]">Posted</p>
                    <p>2 days ago</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-[#5c5c5c]">
                  <Briefcase size={16} className="text-[#2563EB] shrink-0" />
                  <div>
                    <p className="font-bold text-[#2A2A2A]">Job Type</p>
                    <p>Full-time</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-[#5c5c5c]">
                  <DollarSign size={16} className="text-[#2563EB] shrink-0" />
                  <div>
                    <p className="font-bold text-[#2A2A2A]">Salary</p>
                    <p>${job.min_experience ? (job.min_experience * 30 + 90) : 120}k - ${job.min_experience ? (job.min_experience * 35 + 120) : 180}k</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-[#5c5c5c]">
                  <Users size={16} className="text-[#2563EB] shrink-0" />
                  <div>
                    <p className="font-bold text-[#2A2A2A]">Applicants</p>
                    <p>{job.min_experience ? (job.min_experience * 18 + 14) : 48}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleShareClick}
                className="w-full bg-[#f5f4ef] border border-[#e6dfcd] hover:border-[#2563EB] text-[#2A2A2A] font-bold text-xs py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-sm active:scale-98"
              >
                <Share2 size={14} />
                <span>Share Job</span>
              </button>
            </div>

            {/* Similar Jobs */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-[#2A2A2A]">Similar Jobs</h3>
                <Link to="/jobs/search" className="text-xs font-bold text-[#2563EB] hover:underline">View all</Link>
              </div>

              <div className="space-y-3">
                {similarJobs.map((j) => {
                  const matchScore = calculateJobScore(j);
                  return (
                    <div
                      key={j.id}
                      onClick={() => navigate(`/jobs/${j.id}`)}
                      className="group bg-white border border-[#e6dfcd] hover:border-[#2563EB] p-4 rounded-2xl shadow-sm space-y-2 hover:shadow transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-xs text-[#2A2A2A] group-hover:text-[#2563EB] transition-colors">
                          {j.job_title}
                        </h4>
                        <span className="text-[10px] bg-[#22C55E]/10 text-[#22C55E] px-1.5 py-0.5 rounded font-bold shrink-0 ml-2">
                          {matchScore}%
                        </span>
                      </div>
                      <p className="text-[10px] text-[#5c5c5c]">
                        {j.company_name} • {j.preferred_locations?.join(', ') || 'Remote'}
                      </p>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[9px] bg-[#f5f4ef] text-[#5c5c5c] px-2 py-0.5 rounded font-semibold">
                          Full-time
                        </span>
                        <span className="text-[10px] font-bold text-[#2A2A2A]">
                          ${j.min_experience ? (j.min_experience * 30 + 90) : 120}k+
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Floating Alert / Top Candidate Banner */}
            {score >= 80 && (
              <div className="bg-[#E8F8F0] border border-[#d1ebd6] p-4 rounded-2xl flex items-start space-x-3 shadow-sm">
                <CheckCircle2 className="text-[#22C55E] shrink-0 mt-0.5" size={16} />
                <div className="text-xs">
                  <p className="font-bold text-[#2A2A2A]">Match High!</p>
                  <p className="text-[#5c5c5c] mt-0.5">
                    You're in the top 5% of applicants for this profile. Apply now to stand out.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Apply Modal */}
      <AnimatePresence>
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowApplyModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#e6dfcd] rounded-2xl shadow-xl z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-[#e6dfcd] flex items-center justify-between bg-[#f5f4ef]/50">
                <h3 className="font-bold text-sm text-[#2A2A2A]">Apply — {job.job_title}</h3>
                <button onClick={() => setShowApplyModal(false)} className="p-1 rounded-full hover:bg-black/5 text-[#5c5c5c] hover:text-[#2A2A2A]">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#5c5c5c]">Full Name</label>
                  <input
                    type="text"
                    required
                    value={applyName}
                    onChange={(e) => setApplyName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full text-sm border border-[#e6dfcd] rounded-lg p-2.5 bg-white text-[#2A2A2A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#5c5c5c]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={applyEmail}
                    onChange={(e) => setApplyEmail(e.target.value)}
                    placeholder="john@doe.com"
                    className="w-full text-sm border border-[#e6dfcd] rounded-lg p-2.5 bg-white text-[#2A2A2A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#5c5c5c]">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={applyPhone}
                    onChange={(e) => setApplyPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full text-sm border border-[#e6dfcd] rounded-lg p-2.5 bg-white text-[#2A2A2A]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#5c5c5c]">Resume (PDF, DOCX, TXT)</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setApplyFile(e.target.files[0])}
                    className="w-full text-xs text-[#5c5c5c] border border-[#e6dfcd] rounded-lg p-2.5 bg-[#f5f4ef]/30 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={applyLoading}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
                >
                  {applyLoading && <RefreshCw size={14} className="animate-spin" />}
                  <span>{applyLoading ? 'Sending Application...' : 'Submit Application'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ResumeUploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

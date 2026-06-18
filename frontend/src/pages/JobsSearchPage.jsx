import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, SlidersHorizontal, Check, RefreshCw, X, Bookmark, FileText, Upload, Sparkles, Briefcase, DollarSign, Building, Key, AlertCircle, Lightbulb, Bot, Phone, TrendingUp, Code, Star } from 'lucide-react';
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

const POPULAR_TITLES = [
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Engineer',
  'Software Engineer',
  'Data Scientist',
  'Product Manager',
  'UI/UX Designer',
  'QA Automation Engineer',
  'DevOps Engineer'
];

const LOCATION_STATE_MAP = {
  'bangalore': 'Bangalore, Karnataka',
  'bangaluru': 'Bengaluru, Karnataka',
  'bengaluru': 'Bengaluru, Karnataka',
  'mumbai': 'Mumbai, Maharashtra',
  'pune': 'Pune, Maharashtra',
  'delhi': 'Delhi NCR',
  'new delhi': 'New Delhi, Delhi',
  'noida': 'Noida, Uttar Pradesh',
  'gurugram': 'Gurugram, Haryana',
  'gurgaon': 'Gurugram, Haryana',
  'hyderabad': 'Hyderabad, Telangana',
  'chennai': 'Chennai, Tamil Nadu',
  'kolkata': 'Kolkata, West Bengal',
  'ahmedabad': 'Ahmedabad, Gujarat',
  'jaipur': 'Jaipur, Rajasthan'
};

const POPULAR_LOCATIONS = [
  'Bengaluru, Karnataka',
  'Bangalore, Karnataka',
  'Mumbai, Maharashtra',
  'Pune, Maharashtra',
  'Delhi NCR',
  'Noida, Uttar Pradesh',
  'Gurugram, Haryana',
  'Hyderabad, Telangana',
  'Chennai, Tamil Nadu',
  'Remote'
];

const getFormattedLocation = (input) => {
  const clean = input.trim().toLowerCase();
  if (!clean) return '';
  if (LOCATION_STATE_MAP[clean]) {
    return LOCATION_STATE_MAP[clean];
  }
  const foundKey = Object.keys(LOCATION_STATE_MAP).find(k => k === clean || k.startsWith(clean));
  if (foundKey) {
    return LOCATION_STATE_MAP[foundKey];
  }
  return input;
};

const getCleanDescriptionPreview = (text) => {
  if (!text) return '';
  const lines = text.split('\n');
  const cleanLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    
    // Skip divider lines
    if (/^[=\-_]{3,}$/.test(trimmed)) {
      continue;
    }
    
    // Skip key-value metadata lines
    if (/^([A-Z\s_]+):\s*(.+)$/.test(trimmed)) {
      continue;
    }
    
    // Skip uppercase headings
    if (trimmed.length > 3 && trimmed === trimmed.toUpperCase() && !trimmed.includes(':') && !/^[0-9\s]+$/.test(trimmed)) {
      continue;
    }
    
    // Clean up bullets
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      cleanLines.push(trimmed.substring(2));
      continue;
    }
    
    if (trimmed) {
      cleanLines.push(trimmed);
    }
  }
  
  return cleanLines.join(' ');
};

export default function JobsSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Search input states
  const [queryInput, setQueryInput] = useState(searchParams.get('query') || '');
  const [locationInput, setLocationInput] = useState(searchParams.get('location') || '');

  // Active filters states
  const [jobTypes, setJobTypes] = useState({
    FullTime: true,
    Contract: false,
    Remote: false
  });
  const [salaryRange, setSalaryRange] = useState(150); // in thousands
  const [experienceLevel, setExperienceLevel] = useState('Senior'); // Junior, Mid-Level, Senior

  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [seekerProfile, setSeekerProfile] = useState(null);

  // Autocomplete suggestions UI states
  const [querySuggestions, setQuerySuggestions] = useState([]);
  const [showQuerySuggestions, setShowQuerySuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  // Apply Modal states
  const [applyingJob, setApplyingJob] = useState(null);
  const [applyFile, setApplyFile] = useState(null);
  const [applyName, setApplyName] = useState('');
  const [applyEmail, setApplyEmail] = useState('');
  const [applyPhone, setApplyPhone] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);

  // Sync profile from local storage
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
    
    const handleOutsideClick = () => {
      setShowQuerySuggestions(false);
      setShowLocationSuggestions(false);
    };
    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('seeker_profile_updated', syncProfile);
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Filter job title suggestions
  useEffect(() => {
    if (!queryInput.trim()) {
      setQuerySuggestions(POPULAR_TITLES.slice(0, 5));
      return;
    }
    const titlesSet = new Set();
    jobs.forEach(j => {
      if (j.job_title) titlesSet.add(j.job_title.trim());
    });
    POPULAR_TITLES.forEach(t => titlesSet.add(t));

    const filtered = Array.from(titlesSet).filter(t =>
      t.toLowerCase().includes(queryInput.toLowerCase())
    ).slice(0, 5);
    setQuerySuggestions(filtered);
  }, [queryInput, jobs]);

  // Filter location suggestions
  useEffect(() => {
    if (!locationInput.trim()) {
      setLocationSuggestions(POPULAR_LOCATIONS.slice(0, 5));
      return;
    }
    const searchVal = locationInput.toLowerCase().trim();
    const mappedLocs = [];
    Object.entries(LOCATION_STATE_MAP).forEach(([key, val]) => {
      if (key.includes(searchVal) && !mappedLocs.includes(val)) {
        mappedLocs.push(val);
      }
    });

    const locationsSet = new Set();
    jobs.forEach(j => {
      (j.preferred_locations || []).forEach(loc => {
        if (loc) locationsSet.add(loc.trim());
      });
    });
    POPULAR_LOCATIONS.forEach(l => locationsSet.add(l));

    const filtered = Array.from(locationsSet).filter(loc =>
      loc.toLowerCase().includes(searchVal)
    );

    const combined = Array.from(new Set([...mappedLocs, ...filtered])).slice(0, 5);
    setLocationSuggestions(combined);
  }, [locationInput, jobs]);

  // Fetch jobs
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await publicJobsAPI.list(
        searchParams.get('query') || '',
        searchParams.get('location') || ''
      );
      setJobs(data);
    } catch (err) {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [searchParams]);

  // Apply filters on the retrieved jobs
  useEffect(() => {
    let result = [...jobs];

    // Filter by Job Types
    if (jobTypes.Remote) {
      result = result.filter(j => j.job_description.toLowerCase().includes('remote') || j.preferred_locations.some(l => l.toLowerCase().includes('remote')));
    }

    // Filter by Experience Level
    // If job has minimum experience, match with the level selected
    // Junior: < 2 years, Mid-Level: 2-5 years, Senior: 5+ years
    result = result.filter(j => {
      const minExp = j.min_experience || 0;
      if (experienceLevel === 'Junior') return minExp <= 2;
      if (experienceLevel === 'Mid-Level') return minExp <= 5;
      return true; // Senior can view everything
    });

    setFilteredJobs(result);
  }, [jobs, jobTypes, salaryRange, experienceLevel]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const resolvedLocation = getFormattedLocation(locationInput);
    if (resolvedLocation) setLocationInput(resolvedLocation);
    const params = {};
    if (queryInput) params.query = queryInput;
    if (resolvedLocation) params.location = resolvedLocation;
    setSearchParams(params);
  };

  const calculateMatchScore = (job) => {
    if (!seekerProfile) {
      // Return simulated scores if no profile uploaded
      if (job.job_title.toLowerCase().includes('product')) return 98;
      if (job.job_title.toLowerCase().includes('architect') || job.job_title.toLowerCase().includes('frontend')) return 92;
      return 85;
    }

    // Dynamic frontend match score calculation based on skills
    const requiredSkills = job.required_skills || [];
    if (!requiredSkills.length) return 85;

    const candSkills = new Set(seekerProfile.skills?.map(s => (s.canonical_skill || s.skill).toLowerCase()));
    let matched = 0;
    requiredSkills.forEach(skill => {
      if (candSkills.has(skill.toLowerCase())) {
        matched++;
      }
    });

    const skillScore = Math.round((matched / requiredSkills.length) * 100);
    
    // Combine experience and skill score
    const jobMinExp = job.min_experience || 0;
    const candExp = seekerProfile.total_experience_years || 0;
    const expScore = candExp >= jobMinExp ? 100 : Math.round((candExp / Math.max(jobMinExp, 1)) * 100);
    
    return Math.min(100, Math.round(skillScore * 0.7 + expScore * 0.3));
  };

  const getMatchBadgeStyle = (score) => {
    if (score >= 95) return 'bg-blue-600 text-white';
    if (score >= 90) return 'bg-[#22C55E] text-white';
    return 'bg-gray-300 text-gray-700';
  };

  const handleApplyClick = (job) => {
    setApplyingJob(job);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyFile) {
      toast.error("Please upload your resume file to apply");
      return;
    }

    setApplyLoading(true);
    try {
      const data = await publicJobsAPI.apply(applyingJob.id, applyFile, {
        name: applyName,
        email: applyEmail,
        phone: applyPhone
      });

      // Save applied state in local storage
      const applied = JSON.parse(localStorage.getItem('vish_applied_jobs') || '[]');
      applied.push({
        jobId: applyingJob.id,
        jobTitle: applyingJob.job_title,
        companyName: applyingJob.company_name,
        appliedAt: new Date().toISOString(),
        matchScore: data.match_details?.match_score || 85,
        status: 'Submitted'
      });
      localStorage.setItem('vish_applied_jobs', JSON.stringify(applied));

      toast.success(`Application sent for ${applyingJob.job_title}!`);
      
      // Update local storage profile with parsed details if changed
      if (data.parsed_profile) {
        localStorage.setItem('vish_seeker_profile', JSON.stringify(data.parsed_profile));
        window.dispatchEvent(new Event('seeker_profile_updated'));
      }

      setApplyingJob(null);
      setApplyFile(null);
    } catch (err) {
      toast.error(err.message || "Failed to submit application");
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f4ef] text-[#2A2A2A] font-sans flex flex-col">
      <JobsNavbar onUploadClick={() => setIsModalOpen(true)} />

      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side Filters Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[#e6dfcd] p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-[#e6dfcd]">
              <h3 className="font-extrabold text-sm text-[#2A2A2A] flex items-center space-x-1.5">
                <SlidersHorizontal size={16} />
                <span>Filters</span>
              </h3>
              <button 
                onClick={() => {
                  setJobTypes({ FullTime: true, Contract: false, Remote: false });
                  setSalaryRange(150);
                  setExperienceLevel('Senior');
                }}
                className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold"
              >
                Clear All
              </button>
            </div>

            {/* Job Type Filter */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-wider text-[#5c5c5c] font-bold">Job Type</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm text-[#2A2A2A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobTypes.FullTime}
                    onChange={(e) => setJobTypes({ ...jobTypes, FullTime: e.target.checked })}
                    className="accent-[#2563EB] h-4 w-4 rounded"
                  />
                  <span>Full-time</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-[#2A2A2A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobTypes.Contract}
                    onChange={(e) => setJobTypes({ ...jobTypes, Contract: e.target.checked })}
                    className="accent-[#2563EB] h-4 w-4 rounded"
                  />
                  <span>Contract</span>
                </label>
                <label className="flex items-center space-x-2 text-sm text-[#2A2A2A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={jobTypes.Remote}
                    onChange={(e) => setJobTypes({ ...jobTypes, Remote: e.target.checked })}
                    className="accent-[#2563EB] h-4 w-4 rounded"
                  />
                  <span>Remote</span>
                </label>
              </div>
            </div>

            {/* Salary Range Filter */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-wider text-[#5c5c5c] font-bold">Salary Range</label>
                <span className="text-xs font-bold text-[#2563EB]">${salaryRange}k+</span>
              </div>
              <input
                type="range"
                min="50"
                max="300"
                value={salaryRange}
                onChange={(e) => setSalaryRange(Number(e.target.value))}
                className="w-full h-1 bg-[#f5f4ef] rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
              />
              <div className="flex justify-between text-[10px] text-[#5c5c5c]">
                <span>$50k</span>
                <span>$300k+</span>
              </div>
            </div>

            {/* Experience Levels */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-wider text-[#5c5c5c] font-bold">Experience</label>
              <div className="flex flex-wrap gap-2">
                {['Junior', 'Mid-Level', 'Senior'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setExperienceLevel(level)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all border ${
                      experienceLevel === level
                        ? 'bg-[#2563EB] text-white border-[#2563EB]'
                        : 'bg-white text-[#5c5c5c] border-[#e6dfcd] hover:text-[#2A2A2A] hover:border-[#2563EB]'
                    }`}
                  >
                    {level === 'Senior' ? 'Senior (5+ yr)' : level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Resume Boost CTA Card */}
          <div className="bg-[#2A2A2A] text-white p-6 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute right-[-10px] top-[-10px] text-white/5 rotate-12">
              <Sparkles size={120} />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#2563EB]/20 text-[#2563EB] flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div className="space-y-1.5 relative z-10">
              <h4 className="font-bold text-sm">AI Resume Boost</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Unlock jobs that match your skills by 99% with dynamic relevance checks.
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold py-2.5 rounded-lg transition-all shadow-md relative z-10"
            >
              {seekerProfile ? 'Update Resume Data' : 'Try Engine AI'}
            </button>
          </div>
        </aside>

        {/* Right Side Search & Results List */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Header search controls */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-[#2A2A2A]">Find Your Perfect Role</h2>
              <p className="text-xs text-[#5c5c5c] mt-0.5">
                Showing {filteredJobs.length} results for "{queryInput || 'All Categories'}"
              </p>
            </div>
            <form onSubmit={handleSearchSubmit} className="w-full md:w-auto bg-white border border-[#e6dfcd] rounded-xl p-1.5 shadow-sm flex items-center space-x-2 relative" onClick={(e) => e.stopPropagation()}>
              <div className="relative flex items-center">
                <Search size={14} className="text-[#5c5c5c] ml-1" />
                <input
                  type="text"
                  placeholder="Job title or keywords..."
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onFocus={() => { setShowQuerySuggestions(true); setShowLocationSuggestions(false); }}
                  className="px-2 py-1.5 text-sm focus:outline-none w-44 bg-transparent text-[#2A2A2A]"
                />
                {showQuerySuggestions && querySuggestions.length > 0 && (
                  <div className="absolute left-0 w-64 top-[110%] bg-white border border-[#e6dfcd] rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto text-left">
                    {querySuggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setQueryInput(sug);
                          setShowQuerySuggestions(false);
                          const params = {};
                          if (sug) params.query = sug;
                          const loc = searchParams.get('location');
                          if (loc) params.location = loc;
                          setSearchParams(params);
                        }}
                        className="px-4 py-2 text-sm text-[#2A2A2A] hover:bg-[#f5f4ef] cursor-pointer transition-colors flex items-center space-x-2"
                      >
                        <Search size={12} className="text-[#5c5c5c]" />
                        <span>{sug}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="w-[1px] h-6 bg-[#e6dfcd]" />
              
              <div className="relative flex items-center">
                <MapPin size={14} className="text-[#5c5c5c] ml-1" />
                <input
                  type="text"
                  placeholder="Location..."
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onFocus={() => { setShowLocationSuggestions(true); setShowQuerySuggestions(false); }}
                  className="px-2 py-1.5 text-sm focus:outline-none w-36 bg-transparent text-[#2A2A2A]"
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute left-0 w-56 top-[110%] bg-white border border-[#e6dfcd] rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto text-left">
                    {locationSuggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setLocationInput(sug);
                          setShowLocationSuggestions(false);
                          const params = {};
                          const q = searchParams.get('query');
                          if (q) params.query = q;
                          if (sug) params.location = sug;
                          setSearchParams(params);
                        }}
                        className="px-4 py-2 text-sm text-[#2A2A2A] hover:bg-[#f5f4ef] cursor-pointer transition-colors flex items-center space-x-2"
                      >
                        <MapPin size={12} className="text-[#5c5c5c]" />
                        <span>{sug}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white p-2 rounded-lg transition-all shrink-0">
                <Search size={14} />
              </button>
            </form>
          </div>

          {/* Active Filters Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#5c5c5c] font-medium mr-1">Active Filters:</span>
            {experienceLevel && (
              <span className="bg-white border border-[#e6dfcd] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center space-x-1">
                <span>{experienceLevel}</span>
                <X size={12} className="cursor-pointer text-[#5c5c5c]" onClick={() => setExperienceLevel('Senior')} />
              </span>
            )}
            {jobTypes.Remote && (
              <span className="bg-white border border-[#e6dfcd] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center space-x-1">
                <span>Remote</span>
                <X size={12} className="cursor-pointer text-[#5c5c5c]" onClick={() => setJobTypes({ ...jobTypes, Remote: false })} />
              </span>
            )}
            {salaryRange > 50 && (
              <span className="bg-white border border-[#e6dfcd] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center space-x-1">
                <span>&gt; ${salaryRange}k</span>
                <X size={12} className="cursor-pointer text-[#5c5c5c]" onClick={() => setSalaryRange(50)} />
              </span>
            )}
          </div>

          {/* Job Postings list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw className="animate-spin text-[#2563EB]" size={28} />
              <span className="text-sm text-[#5c5c5c]">Loading jobs...</span>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white border border-[#e6dfcd] text-center p-12 rounded-2xl shadow-sm text-[#5c5c5c]">
              <Briefcase size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="font-bold">No jobs match your criteria</p>
              <p className="text-xs mt-1">Try adjusting your keyword search or removing some filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => {
                const matchScore = calculateMatchScore(job);
                return (
                  <motion.div
                    key={job.id}
                    className="bg-white border border-[#e6dfcd] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 transition-all hover:shadow-md"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Job Info Left Side */}
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-[#f5f4ef] border border-[#e6dfcd] text-[#2563EB] font-bold rounded-xl flex items-center justify-center uppercase shadow-inner shrink-0">
                        {job.company_name[0]}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-base text-[#2A2A2A] hover:underline cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                            {job.job_title}
                          </h3>
                          <Bookmark size={14} className="text-[#5c5c5c] hover:text-[#2563EB] cursor-pointer" />
                        </div>
                        <p className="text-xs text-[#5c5c5c] font-medium">
                          <span className="text-[#2563EB] font-semibold">{job.company_name}</span> • {job.preferred_locations?.join(', ') || 'Remote'}
                        </p>
                        <p className="text-xs text-[#6B7280] font-medium flex items-center">
                          <DollarSign size={12} className="text-[#5c5c5c] mr-0.5 relative -top-[0.5px]" />
                          <span>${job.min_experience ? (job.min_experience * 30 + 90) : 120}k - ${job.min_experience ? (job.min_experience * 35 + 120) : 180}k • 2 hours ago • <span className="text-[#22C55E] font-semibold">Hiring Rapidly</span></span>
                        </p>
                        <p className="text-xs text-[#5c5c5c] max-w-xl line-clamp-2 pt-1.5 font-sans">
                          {renderTextWithIcons(getCleanDescriptionPreview(job.job_description))}
                        </p>
                      </div>
                    </div>

                    {/* Score and Apply Right Side */}
                    <div className="flex md:flex-col items-end justify-between w-full md:w-auto shrink-0 md:space-y-3 pt-4 md:pt-0 border-t md:border-t-0 border-[#f5f4ef]">
                      {/* Match Score Badge */}
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c5c5c]">
                          {seekerProfile ? 'Your Match:' : 'Est. Match:'}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${getMatchBadgeStyle(matchScore)}`}>
                          {matchScore}% Match
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="bg-white border border-[#e6dfcd] hover:border-[#2563EB] text-[#2A2A2A] font-bold text-xs px-4 py-2.5 rounded-lg transition-all shadow-sm"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleApplyClick(job)}
                          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-all shadow-sm active:scale-95"
                        >
                          Quick Apply
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Quick Apply modal */}
      <AnimatePresence>
        {applyingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setApplyingJob(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#e6dfcd] rounded-2xl shadow-xl z-10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-[#e6dfcd] flex items-center justify-between bg-[#f5f4ef]/50">
                <h3 className="font-bold text-sm text-[#2A2A2A]">Quick Apply — {applyingJob.job_title}</h3>
                <button onClick={() => setApplyingJob(null)} className="p-1 rounded-full hover:bg-black/5 text-[#5c5c5c] hover:text-[#2A2A2A]">
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

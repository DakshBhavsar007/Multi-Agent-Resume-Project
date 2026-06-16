import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Sparkles, CheckCircle2, TrendingUp, Compass, Cpu, FileText, ChevronRight } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import JobsNavbar from '../components/JobsNavbar';
import ResumeUploadModal from '../components/ResumeUploadModal';
import { publicJobsAPI } from '../lib/api';

const salaryData = [
  { name: 'Q1', growth: 4.2 },
  { name: 'Q2', growth: 6.8 },
  { name: 'Q3', growth: 9.1 },
  { name: 'Q4', growth: 12.4 }
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

export default function JobsLandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [jobsList, setJobsList] = useState([]);

  // Autocomplete UI states
  const [querySuggestions, setQuerySuggestions] = useState([]);
  const [showQuerySuggestions, setShowQuerySuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await publicJobsAPI.list();
        setJobsList(data || []);
      } catch (err) {
        console.error("Failed to load jobs list for autocomplete", err);
      }
    };
    fetchJobs();

    const checkProfile = () => {
      const saved = localStorage.getItem('vish_seeker_profile');
      if (saved) {
        try {
          setProfile(JSON.parse(saved));
        } catch (e) {
          setProfile(null);
        }
      }
    };
    checkProfile();
    window.addEventListener('seeker_profile_updated', checkProfile);

    // Global click outside listener to dismiss dropdowns
    const handleOutsideClick = () => {
      setShowQuerySuggestions(false);
      setShowLocationSuggestions(false);
    };
    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('seeker_profile_updated', checkProfile);
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Filter job titles
  useEffect(() => {
    if (!query.trim()) {
      setQuerySuggestions(POPULAR_TITLES.slice(0, 5));
      return;
    }
    const titlesSet = new Set();
    jobsList.forEach(j => {
      if (j.job_title) titlesSet.add(j.job_title.trim());
    });
    POPULAR_TITLES.forEach(t => titlesSet.add(t));

    const filtered = Array.from(titlesSet).filter(t =>
      t.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
    setQuerySuggestions(filtered);
  }, [query, jobsList]);

  // Filter locations
  useEffect(() => {
    if (!location.trim()) {
      setLocationSuggestions(POPULAR_LOCATIONS.slice(0, 5));
      return;
    }
    const searchVal = location.toLowerCase().trim();
    const mappedLocs = [];
    Object.entries(LOCATION_STATE_MAP).forEach(([key, val]) => {
      if (key.includes(searchVal) && !mappedLocs.includes(val)) {
        mappedLocs.push(val);
      }
    });

    const locationsSet = new Set();
    jobsList.forEach(j => {
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
  }, [location, jobsList]);

  const handleSearch = (e) => {
    e.preventDefault();
    const resolvedLocation = getFormattedLocation(location);
    const params = [];
    if (query) params.push(`query=${encodeURIComponent(query)}`);
    if (resolvedLocation) params.push(`location=${encodeURIComponent(resolvedLocation)}`);
    navigate(`/jobs/search${params.length ? '?' + params.join('&') : ''}`);
  };

  return (
    <div className="min-h-screen bg-[#f5f4ef] text-[#2A2A2A] font-sans flex flex-col">
      <JobsNavbar onUploadClick={() => setIsModalOpen(true)} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 space-y-16">
        
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-6 pt-6">
          <span className="bg-[#22C55E]/10 text-[#22C55E] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            Next-Gen Job Platform
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-[#2A2A2A] leading-tight">
            Search for your <span className="text-[#C8871A] italic">next move</span>
          </h1>
          <p className="text-[#5c5c5c] text-lg max-w-2xl mx-auto">
            Connecting global talent with industry-leading companies through intelligent matching and real-time market data.
          </p>

          {/* Double Search Bar */}
          <form onSubmit={handleSearch} className="bg-white border border-[#e6dfcd] p-2 rounded-2xl md:rounded-full shadow-lg flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 max-w-2xl mx-auto mt-4 w-full">
            <div className="flex items-center space-x-2 px-4 py-2 w-full md:w-1/2 relative" onClick={(e) => e.stopPropagation()}>
              <Search className="text-[#5c5c5c]" size={20} />
              <input
                type="text"
                placeholder="Job title, keywords, or..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { setShowQuerySuggestions(true); setShowLocationSuggestions(false); }}
                className="w-full text-[#2A2A2A] placeholder-[#9CA3AF] focus:outline-none text-sm bg-transparent"
              />
              {showQuerySuggestions && querySuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[110%] bg-white border border-[#e6dfcd] rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto text-left">
                  {querySuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setQuery(sug);
                        setShowQuerySuggestions(false);
                      }}
                      className="px-4 py-2 text-sm text-[#2A2A2A] hover:bg-[#f5f4ef] cursor-pointer transition-colors flex items-center space-x-2"
                    >
                      <Search size={14} className="text-[#5c5c5c]" />
                      <span>{sug}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden md:block w-[1px] h-8 bg-[#e6dfcd]" />
            <div className="flex items-center space-x-2 px-4 py-2 w-full md:w-1/2 relative" onClick={(e) => e.stopPropagation()}>
              <MapPin className="text-[#5c5c5c]" size={20} />
              <input
                type="text"
                placeholder="City, state, or remote"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onFocus={() => { setShowLocationSuggestions(true); setShowQuerySuggestions(false); }}
                className="w-full text-[#2A2A2A] placeholder-[#9CA3AF] focus:outline-none text-sm bg-transparent"
              />
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[110%] bg-white border border-[#e6dfcd] rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto text-left">
                  {locationSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setLocation(sug);
                        setShowLocationSuggestions(false);
                      }}
                      className="px-4 py-2 text-sm text-[#2A2A2A] hover:bg-[#f5f4ef] cursor-pointer transition-colors flex items-center space-x-2"
                    >
                      <MapPin size={14} className="text-[#5c5c5c]" />
                      <span>{sug}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="bg-[#C8871A] hover:bg-[#B07314] text-white px-8 py-3 rounded-xl md:rounded-full font-semibold text-sm transition-all w-full md:w-auto shadow active:scale-95 shrink-0"
            >
              Search
            </button>
          </form>

          {/* Companies List */}
          <div className="pt-6 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-sm font-semibold text-[#6B7280]">
            <span className="font-medium text-[#9CA3AF]">Trusted by:</span>
            <span className="hover:text-[#2A2A2A] transition-colors">slack</span>
            <span className="hover:text-[#2A2A2A] transition-colors">amazon</span>
            <span className="hover:text-[#2A2A2A] italic transition-colors">Kellogg's</span>
            <span className="hover:text-[#2A2A2A] transition-colors">Bemis</span>
            <span className="hover:text-[#2A2A2A] transition-colors">Deribit</span>
          </div>
        </section>

        {/* Feature Overview: Resume Matcher Visualization */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center bg-white border border-[#e6dfcd] p-8 md:p-12 rounded-3xl shadow-sm">
          <div className="lg:col-span-5 space-y-6">
            <div className="w-10 h-10 bg-[#fcebd1] text-[#C8871A] rounded-xl flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <h2 className="text-3xl font-extrabold text-[#2A2A2A] tracking-tight">
              Tailored for your <span className="text-[#C8871A]">unique trajectory</span>
            </h2>
            <p className="text-[#5c5c5c] text-sm leading-relaxed">
              Our Match Engine goes beyond keywords. We analyze your complete resume structure, normalized skill graphs, and experience timeline to map your compatibility against active enterprise job postings.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-[#2A2A2A] font-medium">
                <CheckCircle2 size={16} className="text-[#22C55E]" />
                <span>99% parsing precision with AI OCR backup</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-[#2A2A2A] font-medium">
                <CheckCircle2 size={16} className="text-[#22C55E]" />
                <span>Immediate matching score & feedback loop</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-[#2A2A2A] font-medium">
                <CheckCircle2 size={16} className="text-[#22C55E]" />
                <span>One-click Quick Apply mapping directly to ATS portals</span>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#C8871A] hover:bg-[#B07314] text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-md active:scale-95"
            >
              {profile ? 'Verify Extracted Skills' : 'Try Engine AI Now'}
            </button>
          </div>

          {/* Visual card mimicking inspiratio_ui1.jpeg */}
          <div className="lg:col-span-7 bg-[#f5f4ef]/50 border border-[#e6dfcd] rounded-2xl p-6 md:p-8 space-y-6">
            <div className="bg-white border border-[#e6dfcd] rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-[#fcebd1] p-3 rounded-lg text-[#C8871A]">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-[#2A2A2A] text-sm">Resume Matcher</h4>
                  <p className="text-xs text-[#5c5c5c]">AI-Powered Extraction</p>
                </div>
              </div>
              <span className="mt-2 md:mt-0 bg-[#22C55E]/10 text-[#22C55E] text-xs font-bold px-2.5 py-1 rounded-full">
                Active Match Analysis
              </span>
            </div>

            <div className="space-y-3">
              <div className="bg-white border border-[#e6dfcd] rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="text-green-500" size={18} />
                  <div>
                    <h5 className="font-bold text-xs text-[#2A2A2A]">Technical Skills Found</h5>
                    <p className="text-[10px] text-[#5c5c5c] mt-0.5">React, Node.js, AWS</p>
                  </div>
                </div>
                <span className="text-[#22C55E] text-xs font-bold">98% match</span>
              </div>

              <div className="bg-white border border-[#e6dfcd] rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-[18px] h-[18px] border-2 border-dashed border-[#C8871A] rounded-full animate-spin" />
                  <div>
                    <h5 className="font-bold text-xs text-[#2A2A2A]">Soft Skills Analysis</h5>
                    <p className="text-[10px] text-[#5c5c5c] mt-0.5">Analyzing communication and leadership profiles</p>
                  </div>
                </div>
                <span className="text-[#C8871A] text-xs font-bold">Processing...</span>
              </div>
            </div>
          </div>
        </section>

        {/* Hiring Safety Banner */}
        <section className="bg-gradient-to-br from-[#FFF9F2] to-white border border-[#f5e3ce] p-8 md:p-10 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-3 max-w-2xl text-left">
            <span className="bg-[#C8871A]/10 text-[#C8871A] text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              Safety Verification
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#2A2A2A] tracking-tight">
              Verify your job application safety before applying
            </h2>
            <p className="text-[#5c5c5c] text-sm leading-relaxed">
              Recruitment scams, phishing links, and ghost job listings are on the rise. Run our real-time hiring safety audit to check company domain authenticity, scam likelihood, and text originality.
            </p>
          </div>
          <button
            onClick={() => navigate('/jobs/safety-checker')}
            className="bg-[#2A2A2A] hover:bg-black text-white px-6 py-3.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-2"
          >
            <span>Scan External Job Listing</span>
            <ChevronRight size={14} />
          </button>
        </section>

        {/* Market Insights Section matching inspiratio_ui2.jpeg */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#C8871A] uppercase tracking-wider">Real-Time Insights</span>
              <h2 className="text-3xl font-extrabold text-[#2A2A2A] tracking-tight">Market Insights</h2>
              <p className="text-[#5c5c5c] text-sm max-w-xl">
                Stay ahead of the curve with real-time analytics on salary trends, high-demand skills, and industry growth sectors.
              </p>
            </div>
            <button
              onClick={() => navigate('/jobs/trends')}
              className="text-[#C8871A] hover:text-[#B07314] text-sm font-bold flex items-center space-x-1 mt-4 md:mt-0 transition-colors"
            >
              <span>View full report</span>
              <span className="text-lg">&rarr;</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Salary Growth (with Recharts BarChart) */}
            <div className="bg-[#FFFFFF] border border-[#e6dfcd] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-[#fcebd1]/50 text-[#C8871A] flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
                <h3 className="font-extrabold text-lg text-[#2A2A2A]">Salary Growth</h3>
                <p className="text-[#5c5c5c] text-xs">
                  Tech sector saw an average of +12.4% increase in specialized roles this quarter.
                </p>
              </div>
              
              {/* Bar chart container */}
              <div className="w-full h-24">
                <ResponsiveContainer width="100%" height="100%" minHeight={96} minWidth={100}>
                  <BarChart data={salaryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(200, 135, 26, 0.05)' }} contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                    <Bar dataKey="growth" fill="#C8871A" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hiring Velocity (green background) */}
            <div className="bg-[#E8F8F0] border border-[#d1ebd6] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-white text-[#22C55E] flex items-center justify-center">
                  <Compass size={16} />
                </div>
                <h3 className="font-extrabold text-lg text-[#2A2A2A]">Hiring Velocity</h3>
                <p className="text-[#5c5c5c] text-xs">
                  Remote roles are closing 3 days faster than traditional on-site positions.
                </p>
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-4xl font-extrabold text-[#22C55E]">32%</span>
                <span className="text-sm font-semibold text-[#5c5c5c]">faster</span>
              </div>
            </div>

            {/* Top Skills */}
            <div className="bg-[#FFF9F2] border border-[#f5e3ce] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-white text-[#C8871A] flex items-center justify-center">
                  <Cpu size={16} />
                </div>
                <h3 className="font-extrabold text-lg text-[#2A2A2A]">Top Skills</h3>
                <p className="text-[#5c5c5c] text-xs">
                  Prompt Engineering and AI Strategy are the fastest-growing required competencies.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="bg-white border border-[#f5e3ce] text-[#C8871A] text-[10px] font-bold px-2 py-0.5 rounded-md">AI / ML</span>
                <span className="bg-white border border-[#f5e3ce] text-[#C8871A] text-[10px] font-bold px-2 py-0.5 rounded-md">Product</span>
                <span className="bg-white border border-[#f5e3ce] text-[#C8871A] text-[10px] font-bold px-2 py-0.5 rounded-md">Design</span>
                <span className="bg-white border border-[#f5e3ce] text-[#C8871A] text-[10px] font-bold px-2 py-0.5 rounded-md">Strategy</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full bg-[#FFFFFF] border-t border-[#e6dfcd] px-6 py-8 mt-12 text-center text-xs text-[#5c5c5c]">
        &copy; {new Date().getFullYear()} Vishleshan Job Engine. Built for recruitment intelligence and career path mapping.
      </footer>

      {/* Upload modal */}
      <ResumeUploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

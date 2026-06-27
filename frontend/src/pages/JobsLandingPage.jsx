import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Sparkles, CheckCircle2, TrendingUp, Compass, Cpu, FileText, ChevronRight } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import JobsNavbar from '../components/JobsNavbar';
import ResumeUploadModal from '../components/ResumeUploadModal';
import { publicJobsAPI } from '../lib/api';
import { Footer } from '../components/user/site-chrome';

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
    <div className="min-h-screen bg-[#FDFCFB] text-[#2A2A2A] font-sans flex flex-col">
      <JobsNavbar onUploadClick={() => setIsModalOpen(true)} />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-16 space-y-20">
        


        {/* Search Section */}
        <section className="text-center max-w-3xl mx-auto space-y-6 pt-4">
          <span className="bg-[#DCFCE7] text-[#15803D] text-[10px] font-black px-4 py-1.5 rounded-full tracking-wider uppercase">
            Next-Gen Job Platform
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#2A2A2A] leading-tight">
            Search for your <span className="text-[#111111] italic font-semibold">next move</span>
          </h1>
          <p className="text-gray-500 font-medium text-sm max-w-xl mx-auto">
            Connecting global talent with industry-leading companies through intelligent matching and real-time market data.
          </p>

          <div className="pt-6">
            {/* Popular Searches Marquee */}
            <div className="max-w-xl mx-auto flex items-center space-x-3 text-xs font-bold text-gray-500 overflow-hidden pb-4">
              <span className="shrink-0 text-gray-700">Popular Searches:</span>
              <div className="overflow-hidden w-full relative h-6 flex items-center">
                <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#FDFCFB] to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#FDFCFB] to-transparent z-10 pointer-events-none" />
                
                <div className="animate-marquee whitespace-nowrap flex space-x-12 shrink-0">
                  <span className="text-gray-500 font-medium text-xs tracking-wide flex items-center gap-3">
                    <span>Software Engineer</span> <span className="text-gray-300">&bull;</span>
                    <span>Product Manager</span> <span className="text-gray-300">&bull;</span>
                    <span>Product Designer</span> <span className="text-gray-300">&bull;</span>
                    <span>Marketing Specialist</span> <span className="text-gray-300">&bull;</span>
                    <span>Data Analyst</span> <span className="text-gray-300">&bull;</span>
                    <span>UI/UX Designer</span> <span className="text-gray-300">&bull;</span>
                    <span>DevOps Engineer</span> <span className="text-gray-300">&bull;</span>
                  </span>
                  <span className="text-gray-500 font-medium text-xs tracking-wide flex items-center gap-3">
                    <span>Software Engineer</span> <span className="text-gray-300">&bull;</span>
                    <span>Product Manager</span> <span className="text-gray-300">&bull;</span>
                    <span>Product Designer</span> <span className="text-gray-300">&bull;</span>
                    <span>Marketing Specialist</span> <span className="text-gray-300">&bull;</span>
                    <span>Data Analyst</span> <span className="text-gray-300">&bull;</span>
                    <span>UI/UX Designer</span> <span className="text-gray-300">&bull;</span>
                    <span>DevOps Engineer</span> <span className="text-gray-300">&bull;</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Glowing Gradient Search Bar */}
            <form 
              onSubmit={handleSearch} 
              className="relative p-[2px] rounded-full max-w-3xl mx-auto bg-gradient-to-r from-indigo-500 via-pink-500 to-orange-400 focus-within:shadow-[0_0_25px_rgba(236,72,153,0.35)] transition-shadow duration-300"
            >
              <div className="bg-white rounded-full p-1.5 flex flex-col md:flex-row items-center justify-between w-full gap-2 md:gap-0">
                
                {/* Query Input */}
                <div className="flex items-center space-x-2.5 px-4 flex-1 w-full relative" onClick={(e) => e.stopPropagation()}>
                  <Search className="text-gray-400 shrink-0" size={18} />
                  <input
                    type="text"
                    placeholder="Job title, keywords, or company..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                      setShowQuerySuggestions(true);
                      setShowLocationSuggestions(false);
                    }}
                    className="w-full text-black placeholder-gray-400 font-medium focus:outline-none text-sm bg-transparent"
                  />
                  
                  {showQuerySuggestions && querySuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[125%] bg-white border border-gray-150 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto text-left">
                      {querySuggestions.map((sug, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setQuery(sug);
                            setShowQuerySuggestions(false);
                          }}
                          className="px-4 py-2.5 text-xs font-semibold text-charcoal hover:bg-gray-50 cursor-pointer transition-colors flex items-center space-x-2"
                        >
                          <Search size={12} className="text-gray-400" />
                          <span>{sug}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vertical Separator */}
                <div className="hidden md:block h-8 w-[1px] bg-gray-200" />

                {/* Location Input */}
                <div className="flex items-center space-x-2.5 px-4 flex-1 w-full relative" onClick={(e) => e.stopPropagation()}>
                  <MapPin className="text-gray-400 shrink-0" size={18} />
                  <input
                    type="text"
                    placeholder="City, state, or remote..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onFocus={() => {
                      setShowLocationSuggestions(true);
                      setShowQuerySuggestions(false);
                    }}
                    className="w-full text-black placeholder-gray-400 font-medium focus:outline-none text-sm bg-transparent"
                  />
                  
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[125%] bg-white border border-gray-150 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto text-left">
                      {locationSuggestions.map((sug, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setLocation(sug);
                            setShowLocationSuggestions(false);
                          }}
                          className="px-4 py-2.5 text-xs font-semibold text-charcoal hover:bg-gray-50 cursor-pointer transition-colors flex items-center space-x-2"
                        >
                          <MapPin size={12} className="text-gray-400" />
                          <span>{sug}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="bg-black hover:bg-neutral-900 text-white px-7 py-3 rounded-full font-extrabold text-sm transition-all shadow-md active:scale-95 w-full md:w-auto shrink-0"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Companies List */}
          <div className="pt-8 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-xs font-bold text-gray-400">
            <span className="font-semibold text-gray-300">Trusted by:</span>
            <span className="hover:text-charcoal transition-colors">slack</span>
            <span className="hover:text-charcoal transition-colors">amazon</span>
            <span className="hover:text-charcoal italic transition-colors">Kellogg's</span>
            <span className="hover:text-charcoal transition-colors">Bemis</span>
            <span className="hover:text-charcoal transition-colors">Deribit</span>
          </div>
        </section>

        {/* Feature Overview: Resume Matcher Visualization */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center bg-white border border-gray-100 p-8 md:p-12 rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="lg:col-span-5 space-y-6">
            <div className="w-10 h-10 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <h2 className="text-3xl font-extrabold text-charcoal tracking-tight">
              Tailored for your <span className="text-[#111111] font-black">unique trajectory</span>
            </h2>
            <p className="text-gray-500 font-medium text-sm leading-relaxed">
              Our Match Engine goes beyond keywords. We analyze your complete resume structure, normalized skill graphs, and experience timeline to map your compatibility against active enterprise job postings.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3 text-xs text-charcoal font-bold">
                <CheckCircle2 size={16} className="text-[#22C55E]" />
                <span>99% parsing precision with AI OCR backup</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-charcoal font-bold">
                <CheckCircle2 size={16} className="text-[#22C55E]" />
                <span>Immediate matching score & feedback loop</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-charcoal font-bold">
                <CheckCircle2 size={16} className="text-[#22C55E]" />
                <span>One-click Quick Apply mapping directly to ATS portals</span>
              </div>
            </div>
            <div className="pt-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-black hover:bg-neutral-800 text-white px-6 py-3.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95"
              >
                {profile ? 'Verify Extracted Skills' : 'Try Engine AI Now'}
              </button>
            </div>
          </div>

          {/* Visual card mimicking inspiratio_ui1.jpeg */}
          <div className="lg:col-span-7 bg-[#F9F8F6] border border-gray-100 rounded-2xl p-6 md:p-8 space-y-6 shadow-inner">
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-100 p-2.5 rounded-xl text-gray-600 shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-charcoal text-sm">Resume Matcher</h4>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">AI-Powered Extraction</p>
                </div>
              </div>
              <span className="mt-2 md:mt-0 bg-[#22C55E]/10 text-[#22C55E] text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-[#22C55E]/20">
                Active Match Analysis
              </span>
            </div>

            <div className="space-y-3">
              <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="text-[#22C55E]" size={18} />
                  <div>
                    <h5 className="font-bold text-xs text-charcoal">Technical Skills Found</h5>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">React, Node.js, AWS</p>
                  </div>
                </div>
                <span className="text-[#22C55E] text-xs font-bold">98% match</span>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-[18px] h-[18px] border-2 border-dashed border-gray-400 rounded-full animate-spin shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs text-charcoal">Soft Skills Analysis</h5>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">Analyzing communication and leadership profiles</p>
                  </div>
                </div>
                <span className="text-gray-500 text-xs font-bold">Processing...</span>
              </div>
            </div>
          </div>
        </section>

        {/* Hiring Safety Banner */}
        <section className="bg-gradient-to-br from-[#F0F6FF] to-[#F8FAFC] border border-[#BFDBFE] p-8 md:p-12 rounded-3xl shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8">
          <div className="space-y-3 max-w-3xl text-left">
            <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border border-gray-200">
              Safety Verification
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-charcoal tracking-tight leading-tight">
              Verify your job application safety before applying
            </h2>
            <p className="text-gray-500 font-medium text-sm leading-relaxed">
              Recruitment scams, phishing links, and ghost job listings are on the rise. Run our real-time hiring safety audit to check company domain authenticity, scam likelihood, and text originality.
            </p>
          </div>
          <button
            onClick={() => navigate('/jobs/safety-checker')}
            className="bg-charcoal hover:bg-black text-white px-6 py-3.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 shrink-0 flex items-center gap-2"
          >
            <span>Scan External Job Listing</span>
            <ChevronRight size={14} />
          </button>
        </section>

        {/* Market Insights Section matching inspiratio_ui2.jpeg */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Real-Time Insights</span>
              <h2 className="text-3xl font-black text-charcoal tracking-tight">Market Insights</h2>
              <p className="text-gray-500 font-medium text-sm max-w-xl">
                Stay ahead of the curve with real-time analytics on salary trends, high-demand skills, and industry growth sectors.
              </p>
            </div>
            <button
              onClick={() => navigate('/jobs/trends')}
              className="text-gray-600 hover:text-black text-xs font-bold flex items-center space-x-1 mt-4 md:mt-0 transition-colors"
            >
              <span>View full report</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Salary Growth (with Recharts BarChart) */}
            <div className="bg-[#F3F4F6] border border-gray-200/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-white text-gray-600 flex items-center justify-center shadow-sm">
                  <TrendingUp size={16} />
                </div>
                <h3 className="font-extrabold text-base text-charcoal">Salary Growth</h3>
                <p className="text-gray-500 text-xs font-medium">
                  Tech sector saw an average of +12.4% increase in specialized roles this quarter.
                </p>
              </div>
              
              {/* Bar chart container */}
              <div className="w-full h-24">
                <ResponsiveContainer width="100%" height="100%" minHeight={96} minWidth={100}>
                  <BarChart data={salaryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={9} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(37, 99, 235, 0.03)' }} contentStyle={{ fontSize: 9, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="growth" fill="#111111" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hiring Velocity (green background) */}
            <div className="bg-[#E8F8F0] border border-[#d1ebd6] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-white text-[#059669] flex items-center justify-center shadow-sm">
                  <Compass size={16} />
                </div>
                <h3 className="font-extrabold text-base text-charcoal">Hiring Velocity</h3>
                <p className="text-gray-500 text-xs font-medium">
                  Remote roles are closing 3 days faster than traditional on-site positions.
                </p>
              </div>
              <div className="text-5xl font-black text-[#059669] tracking-tight">
                32% <span className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">faster</span>
              </div>
            </div>

            {/* Top Skills */}
            <div className="bg-[#F0F6FF] border border-[#BFDBFE] rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-white text-gray-600 flex items-center justify-center shadow-sm">
                  <Cpu size={16} />
                </div>
                <h3 className="font-extrabold text-base text-charcoal">Top Skills</h3>
                <p className="text-gray-500 text-xs font-medium">
                  Prompt Engineering and AI Strategy are the fastest-growing required competencies.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white border border-gray-200 text-gray-700 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">AI / ML</span>
                <span className="bg-white border border-gray-200 text-gray-700 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">Product</span>
                <span className="bg-white border border-gray-200 text-gray-700 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">Design</span>
                <span className="bg-white border border-gray-200 text-gray-700 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">Strategy</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer />

      {/* Upload modal */}
      <ResumeUploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

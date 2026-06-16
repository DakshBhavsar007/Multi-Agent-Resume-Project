import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderGit, Calendar, CheckCircle2, ChevronRight, Briefcase, RefreshCw, X } from 'lucide-react';
import JobsNavbar from '../components/JobsNavbar';
import ResumeUploadModal from '../components/ResumeUploadModal';

export default function JobsApplicationsPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState([]);

  const loadApplications = () => {
    const list = JSON.parse(localStorage.getItem('vish_applied_jobs') || '[]');
    setAppliedJobs(list);
  };

  useEffect(() => {
    loadApplications();
    window.addEventListener('seeker_profile_updated', loadApplications);
    return () => window.removeEventListener('seeker_profile_updated', loadApplications);
  }, []);

  const getStatusBadgeStyle = (status) => {
    if (status === 'Submitted') return 'bg-gray-100 text-gray-700 border border-gray-200';
    if (status === 'Interviewing') return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (status === 'Offer Extended') return 'bg-[#fcebd1]/50 text-[#C8871A] border border-[#fcebd1]';
    return 'bg-green-50 text-green-700 border border-green-200';
  };

  const getScoreBadgeStyle = (score) => {
    if (score >= 90) return 'bg-blue-600 text-white';
    if (score >= 75) return 'bg-[#22C55E] text-white';
    return 'bg-gray-200 text-gray-700';
  };

  const handleClearApplications = () => {
    localStorage.removeItem('vish_applied_jobs');
    setAppliedJobs([]);
  };

  return (
    <div className="min-h-screen bg-[#f5f4ef] text-[#2A2A2A] font-sans flex flex-col">
      <JobsNavbar onUploadClick={() => setIsModalOpen(true)} />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#C8871A] uppercase tracking-wider">Application Tracking</span>
            <h1 className="text-3xl font-extrabold text-[#2A2A2A]">My Applications</h1>
            <p className="text-sm text-[#5c5c5c]">
              Track the statuses of resumes processed and matched directly inside recruiter ATS workflows.
            </p>
          </div>

          {appliedJobs.length > 0 && (
            <button
              onClick={handleClearApplications}
              className="text-xs text-red-500 hover:text-red-700 font-bold border border-transparent hover:border-red-200 px-3 py-1.5 rounded-lg transition-all"
            >
              Clear Log
            </button>
          )}
        </div>

        {/* Applications list */}
        {appliedJobs.length === 0 ? (
          <div className="bg-white border border-[#e6dfcd] text-center p-16 rounded-3xl shadow-sm space-y-6 text-[#5c5c5c]">
            <FolderGit size={48} className="mx-auto text-gray-300" />
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-[#2A2A2A]">No Applications Found</h3>
              <p className="text-xs max-w-sm mx-auto leading-relaxed">
                You haven't applied to any job postings yet. Head over to the Job Search page to explore active roles.
              </p>
            </div>
            <Link
              to="/jobs/search"
              className="inline-block bg-[#C8871A] hover:bg-[#B07314] text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md active:scale-95"
            >
              Explore Active Openings
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {appliedJobs.map((app, index) => (
              <motion.div
                key={index}
                className="bg-white border border-[#e6dfcd] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 transition-all hover:shadow-md"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {/* Info block */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[#f5f4ef] border border-[#e6dfcd] text-[#C8871A] font-bold rounded-xl flex items-center justify-center uppercase shadow-inner shrink-0">
                    {app.companyName ? app.companyName[0] : 'J'}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-[#2A2A2A] hover:underline cursor-pointer" onClick={() => navigate(`/jobs/${app.jobId}`)}>
                      {app.jobTitle}
                    </h3>
                    <p className="text-xs text-[#5c5c5c] font-medium">
                      {app.companyName}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF] font-medium flex items-center space-x-1">
                      <Calendar size={12} />
                      <span>Applied on {new Date(app.appliedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </p>
                  </div>
                </div>

                {/* Score & Status */}
                <div className="flex items-center justify-between w-full md:w-auto md:space-x-6 pt-4 md:pt-0 border-t md:border-t-0 border-[#f5f4ef]">
                  {/* Match score pill */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5c5c5c]">Match Score:</span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${getScoreBadgeStyle(app.matchScore)}`}>
                      {app.matchScore}% Match
                    </span>
                  </div>

                  {/* Status badge */}
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${getStatusBadgeStyle(app.status)}`}>
                    {app.status}
                  </span>

                  <button
                    onClick={() => navigate(`/jobs/${app.jobId}`)}
                    className="p-1.5 rounded-full hover:bg-[#f5f4ef] text-[#5c5c5c] hover:text-[#2A2A2A] hidden md:block transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#FFFFFF] border-t border-[#e6dfcd] px-6 py-8 mt-12 text-center text-xs text-[#5c5c5c]">
        &copy; {new Date().getFullYear()} Vishleshan Job Engine. Built for recruitment intelligence and career path mapping.
      </footer>

      <ResumeUploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

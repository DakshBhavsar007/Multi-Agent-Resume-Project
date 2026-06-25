import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { publicJobsAPI } from '../lib/api';
import { toast } from 'react-hot-toast';

export default function ResumeUploadModal({ isOpen, onClose, preselectedFile }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0); // 0: upload, 1: loading, 2: success
  const [parsedProfile, setParsedProfile] = useState(null);
  const [loadingText, setLoadingText] = useState("Reading file...");

  const onDrop = useCallback(async (acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.pdf') && !selectedFile.name.endsWith('.docx') && !selectedFile.name.endsWith('.txt')) {
      toast.error("Please upload a PDF, DOCX, or TXT file");
      return;
    }

    setFile(selectedFile);
    setLoading(true);
    setStep(1);

    // Simulate stepping for premium visual effect
    const steps = [
      "Uploading document...",
      "Extracting raw content...",
      "Analyzing skill nodes...",
      "Structuring timeline...",
      "Finalizing profile matching..."
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setLoadingText(steps[stepIndex]);
      }
    }, 1200);

    try {
      const data = await publicJobsAPI.parseOnly(selectedFile);
      clearInterval(interval);
      setLoadingText("Done!");
      
      const profile = data.parsed_profile;
      
      // Store seeker profile in localStorage
      localStorage.setItem('vish_seeker_profile', JSON.stringify(profile));
      setParsedProfile(profile);
      setStep(2);
      
      // Notify components that seeker profile has changed
      window.dispatchEvent(new Event('seeker_profile_updated'));
      toast.success("AI resume profile generated!");
    } catch (err) {
      clearInterval(interval);
      setLoading(false);
      setStep(0);
      toast.error(err.message || "Failed to parse resume");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && preselectedFile) {
      onDrop([preselectedFile]);
    }
  }, [isOpen, preselectedFile, onDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    multiple: false
  });

  const handleReset = () => {
    setFile(null);
    setParsedProfile(null);
    setStep(0);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-white rounded-2xl shadow-xl z-10 overflow-hidden border border-[#e6dfcd]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#e6dfcd] flex items-center justify-between bg-[#f5f4ef]/50">
            <h3 className="text-lg font-bold text-[#2A2A2A]">AI Resume Boost</h3>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 rounded-full hover:bg-black/5 text-[#5c5c5c] hover:text-[#2A2A2A] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {step === 0 && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-[#2563EB] bg-[#EFF6FF]/10'
                    : 'border-[#e6dfcd] hover:border-[#2563EB] hover:bg-[#f5f4ef]/30'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#2A2A2A]">
                      {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume file'}
                    </p>
                    <p className="text-xs text-[#5c5c5c] mt-1">
                      Supports PDF, DOCX, or TXT (Max 10MB)
                    </p>
                  </div>
                  <button className="bg-white border border-[#e6dfcd] hover:border-[#2563EB] text-[#2A2A2A] font-medium text-xs rounded-lg px-4 py-2 shadow-sm transition-all hover:bg-[#f5f4ef]/20">
                    Browse Files
                  </button>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Loader className="w-12 h-12 text-[#2563EB] animate-spin" />
                <div className="text-center">
                  <h4 className="text-base font-bold text-[#2A2A2A]">{loadingText}</h4>
                  <p className="text-xs text-[#5c5c5c] mt-1">
                    Between is parsing your resume utilizing local models...
                  </p>
                </div>
                {/* Simulated bar */}
                <div className="w-48 h-1.5 bg-[#f5f4ef] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#2563EB]"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 7, ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}

            {step === 2 && parsedProfile && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 bg-green-50 p-4 rounded-xl border border-green-200">
                  <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-[#2A2A2A]">Resume Analyzed Successfully!</h4>
                    <p className="text-xs text-[#5c5c5c]">
                      Your AI profile has been generated. Matches will now load automatically.
                    </p>
                  </div>
                </div>

                <div className="border border-[#e6dfcd] rounded-xl p-4 bg-[#f5f4ef]/20 space-y-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#5c5c5c] font-bold">Candidate Name</label>
                    <div className="text-sm font-bold text-[#2A2A2A]">{parsedProfile.name}</div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-[#5c5c5c] font-bold">Extracted Skills</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {parsedProfile.skills?.slice(0, 10).map((s, idx) => (
                        <span key={idx} className="bg-[#EFF6FF]/50 border border-[#e6dfcd] text-[#2563EB] text-xs font-semibold px-2 py-0.5 rounded-full">
                          {s.canonical_skill || s.skill}
                        </span>
                      ))}
                      {parsedProfile.skills?.length > 10 && (
                        <span className="text-xs text-[#5c5c5c] font-medium self-center ml-1">
                          +{parsedProfile.skills.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                  {parsedProfile.total_experience_years > 0 && (
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[#5c5c5c] font-bold">Years of Experience</label>
                      <div className="text-sm font-bold text-[#2A2A2A]">
                        {parsedProfile.total_experience_years.toFixed(1)} years
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-white border border-[#e6dfcd] hover:border-red-400 text-sm font-medium text-[#2A2A2A] hover:text-[#EF4444] rounded-lg py-2.5 transition-all"
                  >
                    Reset & Re-upload
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-sm font-medium text-white rounded-lg py-2.5 transition-all shadow-sm"
                  >
                    Explore Job Matches
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

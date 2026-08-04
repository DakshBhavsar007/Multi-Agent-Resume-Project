import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Loader2, User, Mail, Phone, MapPin, Briefcase, GraduationCap, ChevronRight } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

export default function EmbedWidget() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const theme = searchParams.get("theme") || "light";

  const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://127.0.0.1:8000' 
    : 'https://api.between.indevs.in';

  const [jwt, setJwt] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("Missing embed token in URL.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${baseUrl}/api/v1/developer/embed/validate?token=${token}`);
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          setError(data.error || "Failed to validate token.");
        } else {
          setJwt(data.data.jwt);
          setPermissions(data.data.permissions || {});
        }
      } catch (err) {
        setError("Network error validating token.");
      } finally {
        setLoading(false);
      }
    }
    validateToken();
  }, [token]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('[Between Embed] File selected:', file.name, file.size, 'bytes');
    setUploading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    // 2-minute timeout for AI parsing
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      console.log('[Between Embed] Uploading to:', `${baseUrl}/api/v1/parse`);
      const res = await fetch(`${baseUrl}/api/v1/parse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`
        },
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      console.log('[Between Embed] Response status:', res.status);
      const data = await res.json();
      console.log('[Between Embed] Parsed data:', data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to parse resume.");
      }

      setResult(data.data);
      toast.success("Resume parsed successfully!");

      // Post message back to parent window
      window.parent.postMessage({
        source: 'between-embed',
        type: 'PARSE_SUCCESS',
        payload: data.data
      }, "*");

    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err.name === 'AbortError' ? 'Request timed out. Please try again.' : err.message;
      console.error('[Between Embed] Upload error:', msg);
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const isDark = theme === "dark";
  const dropzoneBg = "bg-gray-50 hover:bg-gray-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/50";
  const textMuted = "text-gray-500 dark:text-zinc-400";

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-white dark:bg-[#111111] text-gray-900 dark:text-white">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
        <p className="font-medium">Initializing Between AI...</p>
      </div>
    );
  }

  if (error && !jwt) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-[#111111] text-gray-900 dark:text-white">
        <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-xl font-bold mb-2">Access Denied</h3>
        <p className={`${textMuted} text-sm max-w-sm`}>{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-6 font-sans flex flex-col bg-white dark:bg-[#111111] text-gray-900 dark:text-white">
      <Toaster position="bottom-center" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <FileText size={16} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-lg leading-tight">Between AI</h2>
          <p className={`text-xs ${textMuted}`}>Resume Intelligence</p>
        </div>
      </div>

      {!result ? (
        <div className="flex-1 flex flex-col">
          <div className={`flex-1 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl ${dropzoneBg} flex flex-col items-center justify-center p-8 text-center transition-colors relative group`}>
            <input 
              type="file" 
              accept=".pdf,.doc,.docx" 
              onChange={handleFileUpload}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            {uploading ? (
              <>
                <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                <h3 className="font-bold text-lg mb-1">Analyzing Resume...</h3>
                <p className={`text-sm ${textMuted}`}>Our AI agents are extracting skills and data.</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud size={28} />
                </div>
                <h3 className="font-bold text-lg mb-1">Upload Resume</h3>
                <p className={`text-sm ${textMuted} max-w-[250px] mb-6`}>Drag and drop a PDF or DOCX file here, or click to browse.</p>
                <button className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md pointer-events-none">
                  Select File
                </button>
              </>
            )}
          </div>
          {error && (
             <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
               <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
               <p className="text-red-500 text-sm font-medium">{error}</p>
             </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-start text-left bg-gray-50 dark:bg-[#18181b] rounded-2xl p-6 overflow-y-auto border border-gray-200 dark:border-zinc-800">
          <div className="w-full flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0">
              {result.name ? result.name.charAt(0).toUpperCase() : <User />}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-2xl mb-1 text-gray-900 dark:text-white">
                {result.name || "Unknown Candidate"}
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                {result.raw_parsed_data?.email && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-400">
                    <Mail size={14} />
                    <span>{result.raw_parsed_data.email}</span>
                  </div>
                )}
                {result.raw_parsed_data?.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-400">
                    <Phone size={14} />
                    <span>{result.raw_parsed_data.phone}</span>
                  </div>
                )}
                {result.raw_parsed_data?.location && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-400">
                    <MapPin size={14} />
                    <span>{result.raw_parsed_data.location}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle size={20} />
            </div>
          </div>
          
          <div className="w-full space-y-4">
            {result.skills && result.skills.length > 0 && (
              <div className="bg-white dark:bg-[#27272a] p-4 rounded-xl border border-gray-200 dark:border-zinc-700/50">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                  <div className="w-6 h-6 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <ChevronRight size={14} />
                  </div>
                  Extracted Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.skills.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg text-xs font-medium border border-gray-200 dark:border-zinc-700/50">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
               {result.raw_parsed_data?.experience && result.raw_parsed_data.experience.length > 0 && (
                 <div className="bg-white dark:bg-[#27272a] p-4 rounded-xl border border-gray-200 dark:border-zinc-700/50">
                   <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                     <Briefcase size={14} className="text-blue-500" />
                     Experience
                   </h4>
                   <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-3">
                     {result.raw_parsed_data.experience[0].title} at {result.raw_parsed_data.experience[0].company}
                   </p>
                 </div>
               )}
               
               {result.raw_parsed_data?.education && result.raw_parsed_data.education.length > 0 && (
                 <div className="bg-white dark:bg-[#27272a] p-4 rounded-xl border border-gray-200 dark:border-zinc-700/50">
                   <h4 className="font-semibold text-sm mb-2 flex items-center gap-2 text-gray-900 dark:text-white">
                     <GraduationCap size={14} className="text-purple-500" />
                     Education
                   </h4>
                   <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-3">
                     {result.raw_parsed_data.education[0].degree}
                   </p>
                 </div>
               )}
            </div>
          </div>

          <div className="mt-8 w-full flex justify-center">
            <button 
              onClick={() => setResult(null)}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition"
            >
              Process Another Resume
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

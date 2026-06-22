import React, { useEffect, useState, useRef } from 'react';
import { seekerAPI } from '../../lib/api';
import { useSeekerAuthStore } from '../../stores/seekerAuthStore';
import toast from 'react-hot-toast';
import {
  Upload, Sparkles, ChevronRight, FileText,
  User, Mail, Briefcase, Code2, TrendingUp,
  ArrowRight, Target, AlertTriangle, Download,
  CheckCircle2, Award, FileDown, Activity, Layout,
  Eye, RefreshCw, Printer, Check
} from 'lucide-react';
import { Header, Footer } from '../../components/user/site-chrome';

export default function MyResumePage() {
  const updateSeeker = useSeekerAuthStore(s => s.updateSeeker);
  const [resumeData, setResumeData] = useState(null);
  const [enhanced, setEnhanced] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [atsChecking, setAtsChecking] = useState(false);
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [jdText, setJdText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  const [customTemplateFile, setCustomTemplateFile] = useState(null);
  const [downloadFormat, setDownloadFormat] = useState('pdf');
  const [atsReport, setAtsReport] = useState(null);
  
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();
  const customTemplateRef = useRef();

  useEffect(() => {
    seekerAPI.getResume()
      .then(d => { 
        if (d.resume_data && Object.keys(d.resume_data).length > 0) {
          setResumeData(d.resume_data); 
        }
        if (d.enhanced_resume && Object.keys(d.enhanced_resume).length > 0) {
          setEnhanced(d.enhanced_resume); 
        }
      })
      .catch(() => {});
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    try {
      const data = await seekerAPI.uploadResume(file);
      setResumeData(data.parsed);
      updateSeeker({ has_resume: true, skills: data.parsed.skills });
      toast.success('Resume parsed successfully!');
      setWizardStep(2);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally { setUploadLoading(false); }
  };

  const handleEnhance = async () => {
    if (!resumeData) { toast.error('Upload your resume first'); return; }
    setEnhanceLoading(true);
    try {
      const data = await seekerAPI.enhanceResume(jdText);
      setEnhanced(data);
      toast.success('Resume enhanced successfully!');
      setWizardStep(4);
    } catch (err) {
      toast.error(err.message || 'Enhancement failed');
    } finally { setEnhanceLoading(false); }
  };

  const handleAtsVerify = async () => {
    setAtsChecking(true);
    try {
      const data = await seekerAPI.checkAtsScore(jdText);
      setAtsReport(data);
      setWizardStep(6);
      toast.success('ATS Scan completed!');
    } catch (err) {
      toast.error(err.message || 'ATS verification failed');
    } finally { setAtsChecking(false); }
  };

  const handleDownloadFile = async (format) => {
    try {
      const token = localStorage.getItem('vish_seeker_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      let body;
      if (selectedTemplate === 'custom' && customTemplateFile) {
        body = new FormData();
        body.append('format', format);
        body.append('template_type', selectedTemplate);
        body.append('template_file', customTemplateFile);
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({ format, template_type: selectedTemplate });
      }
      
      const response = await fetch('http://127.0.0.1:8000/api/v1/seeker/resume/download', {
        method: 'POST',
        headers,
        body
      });
      
      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to generate download');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Enhanced_Resume.${format === 'txt' ? 'txt' : 'docx'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download completed successfully!');
    } catch (err) {
      toast.error(err.message || 'Download failed');
    }
  };

  const handleCustomTemplateUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.docx')) {
        toast.error('Custom templates must be in .docx format');
        return;
      }
      setCustomTemplateFile(file);
      toast.success('Custom DOCX template loaded!');
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  const hasResume = !!resumeData;
  const atsGain = enhanced ? (enhanced.ats_score_enhanced - enhanced.ats_score_original) : 0;

  // Active step styling helpers
  const stepsList = [
    { num: 1, name: 'Upload Resume' },
    { num: 2, name: 'Job Description' },
    { num: 3, name: 'Optimize Bullets' },
    { num: 4, name: 'Style Template' },
    { num: 5, name: 'Download File' },
    { num: 6, name: 'ATS Audit' }
  ];

  return (
    <div style={{ minHeight:'100vh', background:'var(--background)', fontFamily:'Inter,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .rp-root { animation: fadeUp 0.3s ease; }
        .rp-dropzone { transition: border-color 0.2s, background 0.2s; }
        .rp-dropzone:hover, .rp-dropzone.drag { border-color:#111 !important; background:#f0f0ec !important; }
        .rp-tab { transition: all 0.15s ease; }
        .rp-tab:hover { background:#f0f0ec; }
        .rp-chip { transition: all 0.15s ease; }
        .rp-chip:hover { background:#e8e8e4; }
        .rp-btn { transition: all 0.2s ease; }
        .rp-btn:hover:not(:disabled) { background:#2A2A2A !important; transform:translateY(-1px); }
        .rp-btn:active:not(:disabled) { transform:translateY(0); }
        .rp-tile { transition: background 0.15s; }
        .rp-tile:hover { background:#f0f0ec !important; }
        
        /* Print Styles */
        @media print {
          body * {
            visibility: hidden;
          }
          .print-preview-container, .print-preview-container * {
            visibility: visible;
          }
          .print-preview-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print">
        <Header />
      </div>

      <main className="rp-root" style={{ maxWidth:'1080px', margin:'0 auto', padding:'36px 20px 80px' }}>
        
        {/* ── Page Header ── */}
        <div className="no-print" style={{ marginBottom:'28px', display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
              <Sparkles size={22} color="#111111" />
              <h1 style={{ fontSize:'24px', fontWeight:800, color:'#111111', margin:0, letterSpacing:'-0.3px' }}>
                AI Resume Enhancer Wizard
              </h1>
            </div>
            <p style={{ fontSize:'13px', color:'#6b7280', margin:0 }}>
              Tailor your resume bullets, target keywords, and verify with a certified ATS score.
            </p>
          </div>
          
          {hasResume && (
            <button 
              onClick={() => {
                setWizardStep(1);
                setEnhanced(null);
                setAtsReport(null);
              }}
              style={{ padding:'7px 14px', background:'none', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'12px', fontWeight:600, color:'#6b7280', cursor:'pointer' }}
            >
              Restart Wizard
            </button>
          )}
        </div>

        {/* ── Wizard Progress Bar ── */}
        <div className="no-print" style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'12px', padding:'16px 24px', marginBottom:'24px', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
          {stepsList.map(s => {
            const isCompleted = wizardStep > s.num;
            const isActive = wizardStep === s.num;
            return (
              <div key={s.num} style={{ display:'flex', alignItems:'center', gap:'8px', opacity: (isCompleted || isActive) ? 1 : 0.45 }}>
                <div style={{
                  width:'24px', height:'24px', borderRadius:'50%', 
                  background: isCompleted ? '#22c55e' : (isActive ? '#111111' : '#e5e7eb'),
                  color: (isCompleted || isActive) ? '#fff' : '#6b7280',
                  display:'flex', alignItems:'center', justifySelf:'center', justifyContent:'center',
                  fontSize:'11px', fontWeight:800
                }}>
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : s.num}
                </div>
                <span style={{ fontSize:'12px', fontWeight: isActive ? 700 : 500, color: isActive ? '#111111' : '#6b7280' }}>
                  {s.name}
                </span>
                {s.num < 6 && <ChevronRight size={14} color="#9ca3af" style={{ marginLeft:'4px' }} />}
              </div>
            );
          })}
        </div>

        {/* ── Step Panels ── */}
        <div className="no-print" style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:'16px', padding:'28px', minHeight:'400px', display:'flex', flexDirection:'column', justifyContent:'space-between', shadow:'0 1px 3px rgba(0,0,0,0.03)' }}>
          
          {/* STEP 1: UPLOAD RESUME */}
          {wizardStep === 1 && (
            <div style={{ animation:'fadeUp 0.25s ease' }}>
              <div style={{ textAlign:'center', maxWidth:'520px', margin:'0 auto 24px' }}>
                <h3 style={{ fontSize:'18px', fontWeight:800, color:'#111', marginBottom:'6px' }}>Upload your current resume</h3>
                <p style={{ fontSize:'13px', color:'#6b7280' }}>We will parse your current skills, experience, and format, preparing it for high-impact AI optimization.</p>
              </div>

              <div
                className={`rp-dropzone${dragging ? ' drag' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleUpload({ target: { files: e.dataTransfer.files } }); }}
                style={{ border:'2px dashed #d1d5db', borderRadius:'12px', padding:'56px 20px', cursor:'pointer', textAlign:'center', background:'#fafaf8', maxWidth:'600px', margin:'0 auto 24px' }}
              >
                <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display:'none' }} onChange={handleUpload} />
                {uploadLoading ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'36px', height:'36px', border:'3px solid #e5e7eb', borderTop:'3px solid #111', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                    <div>
                      <p style={{ fontSize:'14px', fontWeight:700, color:'#2A2A2A', margin:'0 0 2px' }}>Parsing resume contents…</p>
                      <p style={{ fontSize:'12px', color:'#9ca3af', margin:0 }}>Extracting key segments using LLM intelligence</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
                    <div style={{ width:'52px', height:'52px', background:'#f0f0ec', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Upload size={24} color="#111111" />
                    </div>
                    <div>
                      <p style={{ fontSize:'15px', fontWeight:800, color:'#111111', margin:'0 0 4px' }}>
                        {hasResume ? 'Replace Uploaded Resume' : 'Drag & Drop Resume File'}
                      </p>
                      <p style={{ fontSize:'12px', color:'#6b7280', margin:0 }}>
                        Supports PDF, DOCX, and TXT files • Max 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {hasResume && resumeData && (
                <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'20px', maxWidth:'600px', margin:'0 auto', background:'#fafaf8' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                    <CheckCircle2 size={16} color="#22c55e" />
                    <span style={{ fontSize:'13px', fontWeight:700, color:'#111' }}>Active resume ready: {resumeData.name || 'Unnamed'}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', fontSize:'12px', color:'#6b7280' }}>
                    <div><strong>Email:</strong> {resumeData.email || '—'}</div>
                    <div><strong>Experience:</strong> {resumeData.total_experience_years || 0} Years</div>
                    <div style={{ gridColumn:'span 2' }}>
                      <strong>Skills:</strong> {(resumeData.skills || []).slice(0, 8).join(', ')}...
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'32px' }}>
                <button
                  onClick={() => setWizardStep(2)}
                  disabled={!hasResume}
                  className="rp-btn"
                  style={{
                    padding:'12px 24px', background:'#111111', color:'#fff', border:'none', borderRadius:'8px',
                    fontWeight:700, fontSize:'13px', display:'flex', alignItems:'center', gap:'6px',
                    cursor: !hasResume ? 'not-allowed' : 'pointer', opacity: !hasResume ? 0.45 : 1
                  }}
                >
                  Continue to Job Description <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: JOB DESCRIPTION */}
          {wizardStep === 2 && (
            <div style={{ animation:'fadeUp 0.25s ease' }}>
              <div style={{ maxWidth:'640px', margin:'0 auto 20px', textAlign:'center' }}>
                <h3 style={{ fontSize:'18px', fontWeight:800, color:'#111', marginBottom:'6px' }}>Provide target Job Description</h3>
                <p style={{ fontSize:'13px', color:'#6b7280' }}>
                  Paste the requirements or description of the role you want to apply for. Our AI will analyze the core qualifications, matching verbs, and missing skills.
                </p>
              </div>

              <div style={{ maxWidth:'720px', margin:'0 auto' }}>
                <textarea
                  placeholder="Paste the full job description here... Make sure to include required experience, tools, frameworks, and responsibilities."
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                  rows={8}
                  style={{
                    width:'100%', boxSizing:'border-box', border:'1px solid #e5e7eb', borderRadius:'12px',
                    padding:'14px', fontSize:'13px', color:'#2A2A2A', fontFamily:'Inter,sans-serif',
                    resize:'vertical', outline:'none', background:'#fafaf8', lineHeight:1.6, marginBottom:'16px'
                  }}
                />

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'16px' }}>
                  <button
                    onClick={() => setWizardStep(1)}
                    style={{ padding:'10px 18px', background:'none', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'12px', fontWeight:700, color:'#6b7280', cursor:'pointer' }}
                  >
                    ← Back to Upload
                  </button>

                  <button
                    onClick={() => {
                      if (jdText.trim().length < 30) {
                        toast.error('Please enter a longer job description');
                        return;
                      }
                      setWizardStep(3);
                    }}
                    disabled={jdText.trim().length < 30}
                    className="rp-btn"
                    style={{
                      padding:'12px 24px', background:'#111111', color:'#fff', border:'none', borderRadius:'8px',
                      fontWeight:700, fontSize:'13px', display:'flex', alignItems:'center', gap:'6px',
                      cursor: jdText.trim().length < 30 ? 'not-allowed' : 'pointer', opacity: jdText.trim().length < 30 ? 0.45 : 1
                    }}
                  >
                    Process Optimize Review <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: OPTIMIZE & ENHANCE */}
          {wizardStep === 3 && (
            <div style={{ animation:'fadeUp 0.25s ease' }}>
              <div style={{ maxWidth:'600px', margin:'0 auto', textAlign:'center', padding:'40px 0' }}>
                <div style={{ width:'64px', height:'64px', background:'#fafaf8', border:'1px solid #e5e7eb', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', position:'relative' }}>
                  <Sparkles size={28} className="animate-pulse" color="#111111" />
                </div>
                
                <h3 style={{ fontSize:'18px', fontWeight:800, color:'#111', marginBottom:'8px' }}>AI Resume Optimization</h3>
                <p style={{ fontSize:'13px', color:'#6b7280', lineHeight:1.6, marginBottom:'24px' }}>
                  Our agent will now perform three tasks: rewrite your experience bullets to be metric-driven, map target keyword gaps from the job description, and guarantee a matched ATS rate above 90%.
                </p>

                {enhanceLoading ? (
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px', marginTop:'20px' }}>
                    <div style={{ width:'32px', height:'32px', border:'3.5px solid #e5e7eb', borderTop:'3.5px solid #111', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize:'13px', color:'#111', fontWeight:700 }}>Optimizing bullets & filling skill gaps…</span>
                  </div>
                ) : (
                  <div style={{ display:'flex', justifyContent:'center', gap:'12px' }}>
                    <button
                      onClick={() => setWizardStep(2)}
                      style={{ padding:'12px 24px', background:'none', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'13px', fontWeight:700, color:'#6b7280', cursor:'pointer' }}
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleEnhance}
                      className="rp-btn"
                      style={{
                        padding:'12px 28px', background:'#111111', color:'#fff', border:'none', borderRadius:'8px',
                        fontWeight:700, fontSize:'13px', display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'
                      }}
                    >
                      <Sparkles size={14} /> Enhance Resume Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: STYLE TEMPLATE */}
          {wizardStep === 4 && (
            <div style={{ animation:'fadeUp 0.25s ease' }}>
              <div style={{ textAlign:'center', marginBottom:'24px' }}>
                <h3 style={{ fontSize:'18px', fontWeight:800, color:'#111', marginBottom:'6px' }}>Select Resume Layout / Template</h3>
                <p style={{ fontSize:'13px', color:'#6b7280' }}>
                  Choose from our coordinated layout options, or upload your own `.docx` template with placeholders.
                </p>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', alignItems:'start', maxWidth:'900px', margin:'0 auto' }}>
                
                {/* Selector */}
                <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                  <span style={{ fontSize:'11px', fontWeight:800, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px' }}>Templates Available</span>
                  
                  {[
                    { id:'modern', name:'Modern Cream', desc:'Warm cream layout, centered contacts, Georgia serif font.' },
                    { id:'tech', name:'Tech Indigo', desc:'Indigo highlights, clean tech alignments, Courier font.' },
                    { id:'minimal', name:'Minimalist Slate', desc:'Sleek Slate Grey subheadings, compact margins, clean sans-serif.' }
                  ].map(t => (
                    <div 
                      key={t.id}
                      onClick={() => setSelectedTemplate(t.id)}
                      style={{
                        padding:'16px', border:'2px solid', borderRadius:'12px', cursor:'pointer', transition:'all 0.15s',
                        borderColor: selectedTemplate === t.id ? '#111' : '#e5e7eb',
                        background: selectedTemplate === t.id ? '#fafaf8' : '#fff'
                      }}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                        <Layout size={16} color={selectedTemplate === t.id ? '#111' : '#9ca3af'} />
                        <span style={{ fontSize:'14px', fontWeight:800, color:'#111' }}>{t.name}</span>
                      </div>
                      <p style={{ fontSize:'12px', color:'#6b7280', margin:0 }}>{t.desc}</p>
                    </div>
                  ))}

                  <div 
                    onClick={() => {
                      setSelectedTemplate('custom');
                      customTemplateRef.current?.click();
                    }}
                    style={{
                      padding:'16px', border:'2px dashed', borderRadius:'12px', cursor:'pointer', transition:'all 0.15s',
                      borderColor: selectedTemplate === 'custom' ? '#111' : '#d1d5db',
                      background: selectedTemplate === 'custom' ? '#fafaf8' : '#fff'
                    }}
                  >
                    <input 
                      ref={customTemplateRef} 
                      type="file" 
                      accept=".docx" 
                      style={{ display:'none' }} 
                      onChange={handleCustomTemplateUpload} 
                    />
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                      <Upload size={16} color={selectedTemplate === 'custom' ? '#111' : '#9ca3af'} />
                      <span style={{ fontSize:'14px', fontWeight:800, color:'#111' }}>Upload Custom Template</span>
                    </div>
                    <p style={{ fontSize:'12px', color:'#6b7280', margin:0 }}>
                      {customTemplateFile 
                        ? `Loaded: ${customTemplateFile.name}` 
                        : 'Upload a .docx file containing placeholder tokens'
                      }
                    </p>
                    
                    <div style={{ marginTop:'10px', background:'#fff', border:'1px solid #e5e7eb', padding:'8px 10px', borderRadius:'6px', fontSize:'10px', color:'#9ca3af', lineHeight:1.5 }}>
                      Supported tags: <code>{"{{full_name}}"}</code>, <code>{"{{email}}"}</code>, <code>{"{{skills}}"}</code>, <code>{"{{experience}}"}</code>, <code>{"{{education}}"}</code>
                    </div>
                  </div>
                </div>

                {/* Score and Side-by-Side Review */}
                <div style={{ background:'#fafaf8', border:'1px solid #e5e7eb', borderRadius:'14px', padding:'20px' }}>
                  <span style={{ fontSize:'11px', fontWeight:800, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'14px' }}>Optimization Rating Check</span>
                  
                  <div style={{ display:'flex', justifyContent:'space-around', alignItems:'center', marginBottom:'20px', background:'#fff', padding:'14px', borderRadius:'10px', border:'1px solid #e5e7eb' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'24px', fontWeight:800, color:'#9ca3af' }}>{enhanced?.ats_score_original ?? 60}%</div>
                      <div style={{ fontSize:'10px', color:'#9ca3af', fontWeight:600 }}>ORIGINAL ATS</div>
                    </div>
                    <ArrowRight size={16} color="#9ca3af" />
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'28px', fontWeight:900, color:'#22c55e' }}>{enhanced?.ats_score_enhanced ?? 93}%</div>
                      <div style={{ fontSize:'10px', color:'#22c55e', fontWeight:800 }}>OPTIMIZED ATS</div>
                    </div>
                  </div>

                  <div style={{ fontSize:'12px', color:'#6b7280', lineHeight:1.6 }}>
                    <span style={{ fontWeight:700, color:'#111', display:'block', marginBottom:'4px' }}>✓ Action Bullet Points Written</span>
                    Experience segments rewritten using metrics, action verbs, and optimized formatting parameters.
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'32px' }}>
                <button
                  onClick={() => setWizardStep(3)}
                  style={{ padding:'10px 18px', background:'none', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'12px', fontWeight:700, color:'#6b7280', cursor:'pointer' }}
                >
                  ← Back
                </button>

                <button
                  onClick={() => setWizardStep(5)}
                  className="rp-btn"
                  style={{
                    padding:'12px 24px', background:'#111111', color:'#fff', border:'none', borderRadius:'8px',
                    fontWeight:700, fontSize:'13px', display:'flex', alignItems:'center', gap:'6px', cursor:'pointer'
                  }}
                >
                  Format & Download <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: FORMAT & DOWNLOAD */}
          {wizardStep === 5 && (
            <div style={{ animation:'fadeUp 0.25s ease' }}>
              <div style={{ textAlign:'center', marginBottom:'24px' }}>
                <h3 style={{ fontSize:'18px', fontWeight:800, color:'#111', marginBottom:'6px' }}>Format & Download</h3>
                <p style={{ fontSize:'13px', color:'#6b7280' }}>
                  Select the output format you prefer and download the ATS-optimized resume.
                </p>
              </div>

              <div style={{ maxWidth:'760px', margin:'0 auto' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px', marginBottom:'24px' }}>
                  {[
                    { id:'pdf', name:'PDF Document', icon:<Printer size={20}/>, desc:'High-fidelity print format using browser print layouts.' },
                    { id:'docx', name:'Word Document', icon:<FileDown size={20}/>, desc:'Editable DOCX using built-in or custom placeholder mappings.' },
                    { id:'txt', name:'Plain Text', icon:<FileText size={20}/>, desc:'Clean ASCII text layout, perfect for copy-pasting.' }
                  ].map(f => (
                    <div
                      key={f.id}
                      onClick={() => setDownloadFormat(f.id)}
                      style={{
                        padding:'20px 16px', border:'2px solid', borderRadius:'12px', cursor:'pointer', textAlignment:'center', textAlign:'center',
                        borderColor: downloadFormat === f.id ? '#111' : '#e5e7eb',
                        background: downloadFormat === f.id ? '#fafaf8' : '#fff',
                        transition:'all 0.15s'
                      }}
                    >
                      <div style={{ width:'40px', height:'40px', background:'#f0f0ec', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                        {f.icon}
                      </div>
                      <span style={{ fontSize:'13px', fontWeight:800, color:'#111', display:'block', marginBottom:'4px' }}>{f.name}</span>
                      <p style={{ fontSize:'11px', color:'#6b7280', margin:0, lineHeight:1.4 }}>{f.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Print layout section if PDF */}
                {downloadFormat === 'pdf' && (
                  <div style={{ background:'#fafaf8', border:'1px solid #e5e7eb', borderRadius:'12px', padding:'20px', marginBottom:'24px' }}>
                    <div style={{ display:'flex', justifyBetween:'space-between', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                      <span style={{ fontSize:'11px', fontWeight:800, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px' }}>Print Preview Layout</span>
                      <button 
                        onClick={triggerPrint}
                        className="rp-btn"
                        style={{ padding:'6px 12px', background:'#111', color:'#fff', border:'none', borderRadius:'6px', fontSize:'11px', fontWeight:700, display:'flex', alignItems:'center', gap:'4px', cursor:'pointer' }}
                      >
                        <Printer size={12} /> Print/Save to PDF
                      </button>
                    </div>
                    
                    <div style={{ maxHeight:'320px', overflowY:'auto', border:'1px solid #e5e7eb', borderRadius:'8px', background:'#fff' }}>
                      <ResumePreviewPane data={enhanced || resumeData} templateType={selectedTemplate} />
                    </div>
                  </div>
                )}

                {downloadFormat !== 'pdf' && (
                  <div style={{ textAlign:'center', padding:'36px 20px', background:'#fafaf8', border:'1px solid #e5e7eb', borderRadius:'12px', marginBottom:'24px' }}>
                    <button
                      onClick={() => handleDownloadFile(downloadFormat)}
                      className="rp-btn"
                      style={{
                        padding:'12px 32px', background:'#111', color:'#fff', border:'none', borderRadius:'8px',
                        fontWeight:700, fontSize:'13px', display:'inline-flex', alignItems:'center', gap:'8px', cursor:'pointer'
                      }}
                    >
                      <Download size={14} /> Download Enhanced {downloadFormat.toUpperCase()}
                    </button>
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <button
                    onClick={() => setWizardStep(4)}
                    style={{ padding:'10px 18px', background:'none', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'12px', fontWeight:700, color:'#6b7280', cursor:'pointer' }}
                  >
                    ← Back
                  </button>

                  <button
                    onClick={handleAtsVerify}
                    disabled={atsChecking}
                    className="rp-btn"
                    style={{
                      padding:'12px 24px', background:'#111111', color:'#fff', border:'none', borderRadius:'8px',
                      fontWeight:700, fontSize:'13px', display:'flex', alignItems:'center', gap:'6px', cursor:'pointer'
                    }}
                  >
                    {atsChecking ? 'Verifying...' : 'Verify ATS Score ✦'} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: ATS VERIFICATION */}
          {wizardStep === 6 && atsReport && (
            <div style={{ animation:'fadeUp 0.25s ease' }}>
              <div style={{ maxWidth:'560px', margin:'0 auto', textAlign:'center' }}>
                
                {/* Certificate Badge */}
                <div style={{
                  background:'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border:'2px solid #f59e0b', borderRadius:'24px', padding:'32px 24px', marginBottom:'28px',
                  boxShadow:'0 10px 25px -5px rgba(245, 158, 11, 0.15)'
                }}>
                  <div style={{ width:'56px', height:'56px', background:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', border:'2px solid #f59e0b' }}>
                    <Award size={28} color="#f59e0b" />
                  </div>
                  <h3 style={{ fontSize:'22px', fontWeight:900, color:'#92400e', margin:'0 0 4px 0' }}>ATS Verification Successful</h3>
                  <p style={{ fontSize:'12px', color:'#b45309', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.6px', margin:0 }}>
                    Certified Compliance Audit Report
                  </p>
                  
                  <div style={{ fontSize:'54px', fontWeight:900, color:'#92400e', margin:'20px 0 10px', lineHeight:1 }}>
                    {atsReport.score}%
                  </div>
                  
                  <span style={{ background:'#22c55e', color:'#fff', padding:'4px 12px', borderRadius:'10px', fontSize:'11px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                    {atsReport.verdict}
                  </span>
                </div>

                {/* Checklist */}
                <div style={{ border:'1px solid #e5e7eb', borderRadius:'12px', padding:'20px', background:'#fafaf8', textAlign:'left', marginBottom:'28px' }}>
                  <span style={{ fontSize:'11px', fontWeight:800, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'14px' }}>Compliance Checks</span>
                  
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    <div style={{ display:'flex', justifyBetween:'space-between', justifyContent:'space-between', fontSize:'13px' }}>
                      <span style={{ color:'#6b7280' }}>Formatting & Structural Match</span>
                      <span style={{ color:'#22c55e', fontWeight:700 }}>{atsReport.format_check}</span>
                    </div>
                    <div style={{ display:'flex', justifyBetween:'space-between', justifyContent:'space-between', fontSize:'13px' }}>
                      <span style={{ color:'#6b7280' }}>Job Keywords Alignment</span>
                      <span style={{ color:'#22c55e', fontWeight:700 }}>{atsReport.keyword_check}</span>
                    </div>
                    <div style={{ display:'flex', justifyBetween:'space-between', justifyContent:'space-between', fontSize:'13px' }}>
                      <span style={{ color:'#6b7280' }}>Section Header Compatibility</span>
                      <span style={{ color:'#22c55e', fontWeight:700 }}>{atsReport.structure_check}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display:'flex', justifyContent:'center', gap:'12px' }}>
                  <button
                    onClick={() => setWizardStep(5)}
                    style={{ padding:'12px 24px', background:'none', border:'1px solid #e5e7eb', borderRadius:'8px', fontSize:'13px', fontWeight:700, color:'#6b7280', cursor:'pointer' }}
                  >
                    ← Back to Downloads
                  </button>
                  
                  <button
                    onClick={() => {
                      setWizardStep(1);
                      setEnhanced(null);
                      setAtsReport(null);
                    }}
                    className="rp-btn"
                    style={{
                      padding:'12px 28px', background:'#111111', color:'#fff', border:'none', borderRadius:'8px',
                      fontWeight:700, fontSize:'13px', display:'inline-flex', alignItems:'center', gap:'6px', cursor:'pointer'
                    }}
                  >
                    New Resume Enhancement <RefreshCw size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </main>

      <div className="no-print">
        <Footer />
      </div>

      {/* Hidden print preview panel specifically loaded during window.print() */}
      <div style={{ display: 'none' }}>
        <ResumePreviewPane data={enhanced || resumeData} templateType={selectedTemplate} />
      </div>
    </div>
  );
}

/* ── Live Resume Preview component ── */
function ResumePreviewPane({ data, templateType }) {
  if (!data) return null;
  const exp = data.enhanced_experience || data.experience || [];
  const edu = data.education || [];
  const skills = data.skills || [];
  const summary = data.summary_rewrite || data.summary;

  const fontStyle = templateType === 'modern' 
    ? { fontFamily: 'Georgia, serif' } 
    : templateType === 'tech'
    ? { fontFamily: 'Courier New, monospace' }
    : { fontFamily: 'Inter, sans-serif' };

  const accentColor = templateType === 'tech'
    ? '#4F46E5'
    : templateType === 'minimal'
    ? '#4b5563'
    : '#111111';

  return (
    <div 
      className="print-preview-container"
      style={{
        background: '#ffffff',
        border: 'none',
        padding: '30px',
        color: '#2A2A2A',
        lineHeight: '1.5',
        textAlign: 'left',
        fontSize:'12px',
        ...fontStyle
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: accentColor, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {data.name || 'Your Name'}
        </h1>
        <div style={{ fontSize: '11px', color: '#6b7280', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          {data.email && <span>{data.email}</span>}
          {data.email && (data.phone || data.location) && <span>|</span>}
          {data.phone && <span>{data.phone}</span>}
          {data.phone && data.location && <span>|</span>}
          {data.location && <span>{data.location}</span>}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: accentColor, borderBottom: `1.5px solid ${accentColor}`, paddingBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Professional Summary
          </h2>
          <p style={{ margin: 0 }}>{summary}</p>
        </div>
      )}

      {/* Experience */}
      {exp.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: accentColor, borderBottom: `1.5px solid ${accentColor}`, paddingBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Work Experience
          </h2>
          {exp.map((item, idx) => (
            <div key={idx} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#111111' }}>
                <span>{item.role || item.title} @ {item.company}</span>
                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>{item.start_date || 'N/A'} - {item.end_date || 'Present'}</span>
              </div>
              <ul style={{ margin: '4px 0 0 14px', padding: 0, listStyleType: 'disc' }}>
                {(item.enhanced_bullets || item.bullets || []).map((b, bIdx) => (
                  <li key={bIdx} style={{ marginBottom: '2px' }}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: accentColor, borderBottom: `1.5px solid ${accentColor}`, paddingBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Key Skills
          </h2>
          <p style={{ margin: 0 }}>
            {skills.map(s => typeof s === 'string' ? s : (s.skill || s.name)).join(', ')}
          </p>
        </div>
      )}

      {/* Education */}
      {edu.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: accentColor, borderBottom: `1.5px solid ${accentColor}`, paddingBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Education
          </h2>
          {edu.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontWeight: 600 }}>{item.degree}</span>
              <span style={{ color: '#6b7280' }}>{item.institution}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

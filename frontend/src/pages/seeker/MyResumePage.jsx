import React, { useEffect, useState, useRef } from 'react';
import { seekerAPI } from '../../lib/api';
import { useSeekerAuthStore } from '../../stores/seekerAuthStore';
import toast from 'react-hot-toast';
import {
  Upload, Sparkles, ChevronRight, FileText,
  User, Mail, Briefcase, Code2, TrendingUp,
  ArrowRight, Target, AlertTriangle
} from 'lucide-react';
import JobsNavbar from '../../components/JobsNavbar';

/* ─── Palette ──────────────────────────────────────────────────
   bg page      : #f5f4ef  (warm cream)
   card bg      : #ffffff
   border       : #e5e7eb
   charcoal     : #2A2A2A
   accent       : #111111
   muted text   : #6b7280
   muted bg     : #f9f9f7
────────────────────────────────────────────────────────────── */

export default function MyResumePage() {
  const updateSeeker = useSeekerAuthStore(s => s.updateSeeker);
  const [resumeData, setResumeData] = useState(null);
  const [enhanced, setEnhanced]     = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [jdText, setJdText] = useState('');
  const [tab, setTab]       = useState('upload');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    seekerAPI.getResume()
      .then(d => { setResumeData(d.resume_data); setEnhanced(d.enhanced_resume); })
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
      setTab('upload');
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
      setTab('enhanced');
      toast.success('Resume enhanced!');
    } catch (err) {
      toast.error(err.message || 'Enhancement failed');
    } finally { setEnhanceLoading(false); }
  };

  const hasResume = !!resumeData;
  const atsGain   = enhanced ? (enhanced.ats_score_enhanced - enhanced.ats_score_original) : 0;

  return (
    <div style={{ minHeight:'100vh', background:'#f5f4ef', fontFamily:'Inter,sans-serif' }}>
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
      `}</style>

      <JobsNavbar onUploadClick={() => fileRef.current?.click()} />

      <main className="rp-root" style={{ maxWidth:'960px', margin:'0 auto', padding:'36px 20px 80px' }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom:'28px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'4px' }}>
            <FileText size={20} color="#2A2A2A" />
            <h1 style={{ fontSize:'22px', fontWeight:800, color:'#111111', margin:0, letterSpacing:'-0.3px' }}>
              My Resume
            </h1>
          </div>
          <p style={{ fontSize:'13px', color:'#9ca3af', margin:0 }}>
            Upload your resume and let AI improve it for higher ATS scores
          </p>

          {enhanced && atsGain > 0 && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:'6px', marginTop:'10px', background:'#fff', border:'1px solid #e5e7eb', borderRadius:'8px', padding:'6px 12px' }}>
              <TrendingUp size={13} color="#111" />
              <span style={{ fontSize:'12px', color:'#2A2A2A', fontWeight:600 }}>
                ATS score improved by +{atsGain} points
              </span>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        {hasResume && (
          <div style={{ display:'flex', gap:'4px', marginBottom:'20px', borderBottom:'2px solid #e5e7eb', paddingBottom:'0' }}>
            {[
              { key:'upload',   label:'Resume Details',  icon:<FileText size={13}/> },
              { key:'enhanced', label:'AI Enhancement',  icon:<Sparkles size={13}/> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                className="rp-tab"
                onClick={() => setTab(key)}
                style={{
                  padding:'9px 16px', border:'none', background:'none', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:'6px', fontSize:'13px',
                  fontWeight: tab===key ? 700 : 500,
                  color: tab===key ? '#111111' : '#9ca3af',
                  borderBottom: tab===key ? '2px solid #111111' : '2px solid transparent',
                  marginBottom:'-2px', borderRadius:'0',
                }}
              >
                {icon} {label}
                {key==='enhanced' && enhanced?.ats_score_enhanced && (
                  <span style={{ background:'#f0f0ec', color:'#2A2A2A', borderRadius:'4px', padding:'1px 6px', fontSize:'10px', fontWeight:700 }}>
                    +{atsGain}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 288px', gap:'16px', alignItems:'start' }}>

          {/* Left panel */}
          <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb' }}>

            {tab==='upload' || !hasResume ? (
              <>
                {/* Dropzone */}
                <div style={{ padding:'20px' }}>
                  <div
                    className={`rp-dropzone${dragging ? ' drag' : ''}`}
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={e => { e.preventDefault(); setDragging(false); handleUpload({ target: { files: e.dataTransfer.files } }); }}
                    style={{ border:'1.5px dashed #d1d5db', borderRadius:'10px', padding:'44px 20px', cursor:'pointer', textAlign:'center', background:'#fafaf8' }}
                  >
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display:'none' }} onChange={handleUpload} />
                    {uploadLoading ? (
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
                        <div style={{ width:'32px', height:'32px', border:'2.5px solid #e5e7eb', borderTop:'2.5px solid #111', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                        <div>
                          <p style={{ fontSize:'14px', fontWeight:600, color:'#2A2A2A', margin:'0 0 2px' }}>Parsing resume…</p>
                          <p style={{ fontSize:'12px', color:'#9ca3af', margin:0 }}>Extracting skills & experience</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px' }}>
                        <div style={{ width:'48px', height:'48px', background:'#f0f0ec', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <Upload size={22} color="#2A2A2A" />
                        </div>
                        <div>
                          <p style={{ fontSize:'14px', fontWeight:700, color:'#111111', margin:'0 0 4px' }}>
                            {hasResume ? 'Replace Resume' : 'Upload Your Resume'}
                          </p>
                          <p style={{ fontSize:'12px', color:'#9ca3af', margin:0 }}>
                            Drag & drop or click to browse · PDF, DOCX, TXT · max 10MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parsed info */}
                {hasResume && resumeData && (
                  <div style={{ padding:'0 20px 20px', borderTop:'1px solid #f3f4f6' }}>
                    <div style={{ fontSize:'11px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', margin:'16px 0 12px' }}>
                      Parsed Information
                    </div>

                    {/* Info grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'20px' }}>
                      {[
                        { icon:<User size={14} color="#6b7280"/>,     label:'Name',         value: resumeData.name },
                        { icon:<Mail size={14} color="#6b7280"/>,     label:'Email',        value: resumeData.email },
                        { icon:<Briefcase size={14} color="#6b7280"/>,label:'Experience',   value: resumeData.total_experience_years ? `${resumeData.total_experience_years} yrs` : '—' },
                        { icon:<Code2 size={14} color="#6b7280"/>,    label:'Skills',       value: `${(resumeData.skills||[]).length} extracted` },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="rp-tile" style={{ background:'#fafaf8', borderRadius:'8px', padding:'12px 14px', border:'1px solid #f0f0ec' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
                            {icon}
                            <span style={{ fontSize:'10px', color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px' }}>{label}</span>
                          </div>
                          <div style={{ fontSize:'13px', color:'#111111', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value || '—'}</div>
                        </div>
                      ))}
                    </div>

                    {/* Skills */}
                    {resumeData.skills?.length > 0 && (
                      <div>
                        <div style={{ fontSize:'11px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'10px' }}>
                          Extracted Skills
                        </div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                          {resumeData.skills.slice(0, 22).map((s, idx) => {
                            const label = typeof s === 'string' ? s : (s?.skill || s?.name || JSON.stringify(s));
                            return (
                              <span key={`${label}-${idx}`} className="rp-chip" style={{ background:'#f5f4ef', color:'#2A2A2A', border:'1px solid #e5e7eb', padding:'4px 10px', borderRadius:'6px', fontSize:'12px', fontWeight:500, cursor:'default' }}>
                                {label}
                              </span>
                            );
                          })}
                          {resumeData.skills.length > 22 && (
                            <span className="rp-chip" style={{ background:'#f5f4ef', color:'#9ca3af', border:'1px solid #e5e7eb', padding:'4px 10px', borderRadius:'6px', fontSize:'12px', fontWeight:500 }}>
                              +{resumeData.skills.length - 22} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* ── AI Enhancement Tab ── */
              enhanced ? (
                <div style={{ padding:'20px' }}>

                  {/* Score row */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'10px', alignItems:'center', marginBottom:'24px' }}>
                    <ScoreBlock label="Original ATS" score={enhanced.ats_score_original} muted />
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                      <ArrowRight size={18} color="#9ca3af" />
                      {atsGain > 0 && (
                        <span style={{ fontSize:'11px', fontWeight:700, color:'#2A2A2A', background:'#f0f0ec', padding:'2px 7px', borderRadius:'4px', border:'1px solid #e5e7eb' }}>
                          +{atsGain}
                        </span>
                      )}
                    </div>
                    <ScoreBlock label="Enhanced ATS" score={enhanced.ats_score_enhanced} />
                  </div>

                  {/* Tips */}
                  {enhanced.improvement_tips?.length > 0 && (
                    <div style={{ background:'#fafaf8', border:'1px solid #e5e7eb', borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
                      <p style={{ fontSize:'11px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', margin:'0 0 10px' }}>
                        Improvement Tips
                      </p>
                      {enhanced.improvement_tips.map((tip, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'13px', color:'#2A2A2A', marginBottom:'7px', lineHeight:1.6 }}>
                          <ChevronRight size={13} color="#9ca3af" style={{ flexShrink:0, marginTop:'3px' }} />
                          {tip}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Missing Keywords */}
                  {enhanced.missing_keywords?.length > 0 && (
                    <div style={{ marginBottom:'16px' }}>
                      <div style={{ fontSize:'11px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'10px', display:'flex', alignItems:'center', gap:'6px' }}>
                        <Target size={11} color="#9ca3af" />
                        Missing Keywords — add to your resume
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                        {enhanced.missing_keywords.map(k => (
                          <span key={k} style={{ background:'#fff5f5', color:'#dc2626', border:'1px solid #fee2e2', padding:'4px 10px', borderRadius:'6px', fontSize:'12px', fontWeight:500 }}>
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enhanced Experience Bullets */}
                  {enhanced.enhanced_experience?.map((exp, i) => (
                    <div key={i} style={{ border:'1px solid #e5e7eb', borderRadius:'10px', overflow:'hidden', marginTop:'12px' }}>
                      <div style={{ padding:'12px 14px', background:'#fafaf8', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:'8px' }}>
                        <Briefcase size={13} color="#6b7280" />
                        <span style={{ fontSize:'13px', fontWeight:700, color:'#111111' }}>{exp.role}</span>
                        <span style={{ fontSize:'13px', color:'#9ca3af' }}>@ {exp.company}</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0' }}>
                        <div style={{ padding:'14px', borderRight:'1px solid #e5e7eb' }}>
                          <div style={{ fontSize:'10px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Original</div>
                          {exp.original_bullets?.map((b, j) => (
                            <div key={j} style={{ fontSize:'12px', color:'#9ca3af', lineHeight:1.6, marginBottom:'5px' }}>• {b}</div>
                          ))}
                        </div>
                        <div style={{ padding:'14px' }}>
                          <div style={{ fontSize:'10px', fontWeight:700, color:'#111111', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Enhanced ✦</div>
                          {exp.enhanced_bullets?.map((b, j) => (
                            <div key={j} style={{ fontSize:'12px', color:'#111111', lineHeight:1.6, marginBottom:'5px' }}>• {b}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding:'60px 24px', textAlign:'center' }}>
                  <div style={{ width:'48px', height:'48px', background:'#f0f0ec', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                    <Sparkles size={22} color="#d1d5db" />
                  </div>
                  <p style={{ fontSize:'14px', fontWeight:600, color:'#9ca3af', margin:'0 0 4px' }}>No enhancements yet</p>
                  <p style={{ fontSize:'12px', color:'#d1d5db', margin:0 }}>Use the sidebar to run AI enhancement</p>
                </div>
              )
            )}
          </div>

          {/* ── Right Sidebar ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

            {/* Enhance card */}
            <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', padding:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                <div style={{ width:'36px', height:'36px', background:'#111111', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Sparkles size={16} color="#ffffff" />
                </div>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:800, color:'#111111' }}>AI Resume Enhancer</div>
                  <div style={{ fontSize:'11px', color:'#9ca3af' }}>Powered by Gemini AI</div>
                </div>
              </div>

              <p style={{ fontSize:'12px', color:'#6b7280', lineHeight:1.7, margin:'0 0 14px', paddingBottom:'14px', borderBottom:'1px solid #f3f4f6' }}>
                Rewrites bullet points with stronger action verbs, adds missing keywords, and improves your ATS score automatically.
              </p>

              <label style={{ fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'6px' }}>
                Target Job Description
                <span style={{ fontWeight:400, textTransform:'none', color:'#9ca3af', marginLeft:'4px' }}>(optional)</span>
              </label>
              <textarea
                placeholder="Paste a job description for role-specific improvements…"
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                rows={4}
                style={{
                  width:'100%', boxSizing:'border-box',
                  border:'1px solid #e5e7eb', borderRadius:'8px',
                  padding:'10px 12px', fontSize:'12px', color:'#2A2A2A',
                  fontFamily:'Inter,sans-serif', resize:'vertical', outline:'none',
                  background:'#fafaf8', lineHeight:1.6, marginBottom:'12px',
                  transition:'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#2A2A2A'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />

              <button
                className="rp-btn"
                onClick={handleEnhance}
                disabled={enhanceLoading || !hasResume}
                style={{
                  width:'100%', padding:'12px', cursor:(enhanceLoading||!hasResume)?'not-allowed':'pointer',
                  background:'#111111', color:'#fff', border:'none', borderRadius:'8px',
                  fontWeight:700, fontSize:'13px', display:'flex', alignItems:'center',
                  justifyContent:'center', gap:'7px',
                  opacity:(enhanceLoading||!hasResume) ? 0.45 : 1,
                }}
              >
                {enhanceLoading ? (
                  <>
                    <div style={{ width:'14px', height:'14px', border:'2px solid rgba(255,255,255,0.3)', borderTop:'2px solid #fff', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                    Enhancing…
                  </>
                ) : (
                  <><Sparkles size={14}/> Enhance My Resume</>
                )}
              </button>

              {!hasResume && (
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'10px', padding:'9px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'7px' }}>
                  <AlertTriangle size={12} color="#d97706" />
                  <span style={{ fontSize:'11px', color:'#92400e', fontWeight:500 }}>Upload a resume first to enable</span>
                </div>
              )}
            </div>

            {/* Resume summary card */}
            {hasResume && (
              <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', padding:'16px 20px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'12px' }}>
                  Summary
                </div>
                {[
                  { label:'Skills extracted', value:(resumeData?.skills||[]).length },
                  { label:'Experience',        value: resumeData?.total_experience_years ? `${resumeData.total_experience_years} yrs` : '—' },
                  { label:'AI enhanced',       value: enhanced ? '✓ Done' : 'Not yet' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
                    <span style={{ fontSize:'12px', color:'#6b7280' }}>{label}</span>
                    <span style={{ fontSize:'12px', color:'#111111', fontWeight:700 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

/* ── Score block component ── */
function ScoreBlock({ label, score, muted }) {
  return (
    <div style={{
      textAlign:'center', padding:'18px 12px',
      background: muted ? '#fafaf8' : '#111111',
      borderRadius:'10px', border:'1px solid #e5e7eb',
    }}>
      <div style={{ fontSize:'32px', fontWeight:800, color: muted ? '#9ca3af' : '#ffffff', lineHeight:1 }}>
        {score ?? '—'}
      </div>
      <div style={{ fontSize:'10px', color: muted ? '#d1d5db' : 'rgba(255,255,255,0.5)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginTop:'6px' }}>
        {label}
      </div>
    </div>
  );
}

import React, { useEffect, useState, useRef } from 'react';
import { seekerAPI } from '../../lib/api';
import { useSeekerAuthStore } from '../../stores/seekerAuthStore';
import toast from 'react-hot-toast';
import { Upload, Sparkles, CheckCircle2, AlertCircle, ChevronRight, FileText } from 'lucide-react';
import JobsNavbar from '../../components/JobsNavbar';

export default function MyResumePage() {
  const seeker = useSeekerAuthStore(s => s.seeker);
  const updateSeeker = useSeekerAuthStore(s => s.updateSeeker);
  const [resumeData, setResumeData] = useState(null);
  const [enhanced, setEnhanced] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [jdText, setJdText] = useState('');
  const [tab, setTab] = useState('upload'); // 'upload' | 'enhanced'
  const fileRef = useRef();

  useEffect(() => {
    seekerAPI.getResume()
      .then(d => {
        setResumeData(d.resume_data);
        setEnhanced(d.enhanced_resume);
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
      setTab('upload');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!resumeData) { toast.error('Upload your resume first'); return; }
    setEnhanceLoading(true);
    try {
      const data = await seekerAPI.enhanceResume(jdText);
      setEnhanced(data);
      setTab('enhanced');
      toast.success('Resume enhanced! Check the AI improvements below.');
    } catch (err) {
      toast.error(err.message || 'Enhancement failed');
    } finally {
      setEnhanceLoading(false);
    }
  };

  const hasResume = !!resumeData;

  return (
    <div className="min-h-screen bg-[#f5f4ef] text-[#2A2A2A] font-sans flex flex-col">
      <JobsNavbar onUploadClick={() => fileRef.current?.click()} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex justify-center">
        <div style={styles.page}>
          <div style={styles.header}>
            <h1 style={styles.title}>My Resume</h1>
            <p style={styles.subtitle}>Upload your resume and let AI enhance it for better ATS scores</p>
          </div>

      {/* Tab switcher */}
      {hasResume && (
        <div style={styles.tabs}>
          {[['upload', 'Resume Details'], ['enhanced', 'AI Enhancement']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ ...styles.tab, ...(tab === key ? styles.tabActive : {}) }}>
              {key === 'enhanced' && <Sparkles size={14} />} {label}
              {key === 'enhanced' && enhanced?.ats_score_enhanced && (
                <span style={styles.scoreBadge}>+{enhanced.ats_score_enhanced - enhanced.ats_score_original} pts</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div style={styles.grid}>
        {/* Upload Panel */}
        <div style={styles.panel}>
          {tab === 'upload' || !hasResume ? (
            <>
              {/* Dropzone */}
              <div
                style={styles.dropzone}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleUpload({ target: { files: e.dataTransfer.files } }); }}
              >
                <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: 'none' }} onChange={handleUpload} />
                {uploadLoading ? (
                  <div style={styles.dropzoneInner}>
                    <div style={styles.spinner} />
                    <p style={styles.dropzoneText}>Parsing your resume with AI…</p>
                  </div>
                ) : (
                  <div style={styles.dropzoneInner}>
                    <div style={styles.dropzoneIcon}><Upload size={28} color="#2563eb" /></div>
                    <p style={styles.dropzoneTitle}>{hasResume ? 'Replace Resume' : 'Upload Your Resume'}</p>
                    <p style={styles.dropzoneText}>Drag & drop or click to browse · PDF, DOCX, TXT up to 10MB</p>
                  </div>
                )}
              </div>

              {/* Parsed Preview */}
              {hasResume && resumeData && (
                <div style={styles.parsedSection}>
                  <h3 style={styles.sectionTitle}>Parsed Information</h3>
                  <div style={styles.infoGrid}>
                    <InfoRow label="Name" value={resumeData.name} />
                    <InfoRow label="Email" value={resumeData.email} />
                    <InfoRow label="Experience" value={resumeData.total_experience_years ? `${resumeData.total_experience_years} years` : '—'} />
                    <InfoRow label="Skills Found" value={`${(resumeData.skills || []).length} skills`} />
                  </div>
                  {resumeData.skills?.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={styles.skillsLabel}>Extracted Skills</div>
                      <div style={styles.skillsWrap}>
                        {resumeData.skills.slice(0, 18).map(s => (
                          <span key={s} style={styles.skillChip}>{s}</span>
                        ))}
                        {resumeData.skills.length > 18 && (
                          <span style={{ ...styles.skillChip, background: '#f3f4f6', color: '#6b7280' }}>
                            +{resumeData.skills.length - 18} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* AI Enhancement Tab */
            enhanced ? (
              <div style={styles.enhancedSection}>
                {/* ATS Score */}
                <div style={styles.scoreRow}>
                  <ScoreCard label="Original ATS Score" score={enhanced.ats_score_original} color="#6b7280" />
                  <div style={styles.scoreArrow}>→</div>
                  <ScoreCard label="Enhanced ATS Score" score={enhanced.ats_score_enhanced} color="#22c55e" highlight />
                </div>

                {/* Improvement Tips */}
                {enhanced.improvement_tips?.length > 0 && (
                  <div style={styles.tipsBox}>
                    <h4 style={styles.tipsTitle}>💡 Improvement Tips</h4>
                    {enhanced.improvement_tips.map((tip, i) => (
                      <div key={i} style={styles.tipRow}><ChevronRight size={14} color="#2563eb" style={{ flexShrink: 0 }} /> {tip}</div>
                    ))}
                  </div>
                )}

                {/* Missing Keywords */}
                {enhanced.missing_keywords?.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={styles.skillsLabel}>Missing Keywords (add to resume)</div>
                    <div style={styles.skillsWrap}>
                      {enhanced.missing_keywords.map(k => (
                        <span key={k} style={{ ...styles.skillChip, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>{k}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enhanced bullets */}
                {enhanced.enhanced_experience?.map((exp, i) => (
                  <div key={i} style={styles.expCard}>
                    <div style={styles.expRole}>{exp.role} @ {exp.company}</div>
                    <div style={styles.bulletsCols}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px', fontWeight: 600 }}>ORIGINAL</div>
                        {exp.original_bullets?.map((b, j) => <div key={j} style={styles.bulletOld}>• {b}</div>)}
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#22c55e', marginBottom: '6px', fontWeight: 600 }}>ENHANCED ✨</div>
                        {exp.enhanced_bullets?.map((b, j) => <div key={j} style={styles.bulletNew}>• {b}</div>)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                <Sparkles size={32} color="#d1d5db" style={{ marginBottom: '12px' }} />
                <p>Run AI Enhancement to see improvements here</p>
              </div>
            )
          )}
        </div>

        {/* Enhance Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.enhanceCard}>
            <div style={styles.enhanceIcon}><Sparkles size={22} color="#8b5cf6" /></div>
            <h3 style={styles.enhanceTitle}>AI Resume Enhancer</h3>
            <p style={styles.enhanceDesc}>
              Our AI rewrites your bullet points with stronger action verbs, adds missing keywords, and boosts your ATS score.
            </p>

            <label style={styles.label}>Target Job Description (Optional)</label>
            <textarea
              placeholder="Paste the job description to get role-specific improvements…"
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              style={styles.textarea}
              rows={5}
            />

            <button
              onClick={handleEnhance}
              disabled={enhanceLoading || !hasResume}
              style={{ ...styles.enhanceBtn, opacity: (enhanceLoading || !hasResume) ? 0.6 : 1 }}
            >
              {enhanceLoading ? 'Enhancing…' : '✨ Enhance My Resume'}
            </button>

            {!hasResume && (
              <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px', textAlign: 'center' }}>
                Upload your resume first to enable this feature
              </p>
            )}
          </div>
        </div>
      </div>
     </div>
    </main>
   </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>{label.toUpperCase()}</span>
      <span style={{ fontSize: '14px', color: '#111827', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );
}

function ScoreCard({ label, score, color, highlight }) {
  return (
    <div style={{
      flex: 1, background: highlight ? '#f0fdf4' : '#f9fafb',
      border: `2px solid ${highlight ? '#bbf7d0' : '#e5e7eb'}`,
      borderRadius: '14px', padding: '20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '36px', fontWeight: 800, color }}>{score}</div>
      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

const styles = {
  page: { maxWidth: '980px' },
  header: { marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 4px' },
  subtitle: { fontSize: '14px', color: '#6b7280', margin: 0 },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
  tab: {
    padding: '8px 18px', borderRadius: '8px', border: '1.5px solid #e5e7eb',
    background: '#fff', color: '#6b7280', fontWeight: 500, fontSize: '14px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
  },
  tabActive: { background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe', fontWeight: 600 },
  scoreBadge: { background: '#dcfce7', color: '#16a34a', borderRadius: '10px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' },
  panel: { background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden' },
  dropzone: {
    border: '2px dashed #d1d5db', borderRadius: '14px', margin: '20px',
    padding: '40px 20px', cursor: 'pointer', textAlign: 'center',
    background: '#f9fafb', transition: 'border-color 0.2s',
  },
  dropzoneInner: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  dropzoneIcon: { width: '56px', height: '56px', background: '#eff6ff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dropzoneTitle: { fontSize: '15px', fontWeight: 600, color: '#111827', margin: 0 },
  dropzoneText: { fontSize: '13px', color: '#6b7280', margin: 0 },
  spinner: { width: '28px', height: '28px', border: '3px solid #e5e7eb', borderTop: '3px solid #2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  parsedSection: { padding: '0 20px 20px' },
  sectionTitle: { fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 14px' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', background: '#f9fafb', padding: '16px', borderRadius: '12px' },
  skillsLabel: { fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '8px' },
  skillsWrap: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  skillChip: { background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500 },
  enhancedSection: { padding: '20px' },
  scoreRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' },
  scoreArrow: { fontSize: '24px', color: '#9ca3af' },
  tipsBox: { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '16px' },
  tipsTitle: { fontSize: '14px', fontWeight: 600, color: '#0369a1', margin: '0 0 10px' },
  tipRow: { display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '13px', color: '#0c4a6e', marginBottom: '6px', lineHeight: 1.5 },
  expCard: { background: '#f9fafb', borderRadius: '12px', padding: '16px', marginTop: '16px' },
  expRole: { fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px' },
  bulletsCols: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  bulletOld: { fontSize: '12px', color: '#9ca3af', lineHeight: 1.5, marginBottom: '4px' },
  bulletNew: { fontSize: '12px', color: '#065f46', lineHeight: 1.5, marginBottom: '4px' },
  sidebar: {},
  enhanceCard: {
    background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '16px',
    padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px',
  },
  enhanceIcon: { width: '44px', height: '44px', background: '#ede9fe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  enhanceTitle: { fontSize: '16px', fontWeight: 700, color: '#111827', margin: 0 },
  enhanceDesc: { fontSize: '13px', color: '#6b7280', lineHeight: 1.6, margin: 0 },
  label: { fontSize: '12px', fontWeight: 600, color: '#374151' },
  textarea: {
    border: '1.5px solid #e9d5ff', borderRadius: '10px', padding: '10px 12px',
    fontSize: '13px', color: '#111827', fontFamily: 'inherit', resize: 'vertical',
    outline: 'none', background: '#fff',
  },
  enhanceBtn: {
    padding: '12px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
    color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 600,
    fontSize: '14px', cursor: 'pointer',
  },
};

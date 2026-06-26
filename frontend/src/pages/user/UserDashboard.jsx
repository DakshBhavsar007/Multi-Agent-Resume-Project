import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header, Footer } from "../../components/user/site-chrome";
import { CompanyLogo } from "../../components/user/company-logo";
import { seekerAPI } from "../../lib/api";
import { Bookmark, Briefcase, CheckCircle2, Clock, TrendingUp, Sparkles, AlertCircle, Edit, Plus, Check, FileText } from "lucide-react";
import toast from "react-hot-toast";

const statuses = ["Applied", "Interview", "Offer", "Saved"];

const statusColor = {
  Applied: "var(--google-blue)",
  Interview: "var(--google-yellow)",
  Offer: "var(--google-green)",
  Saved: "var(--google-red)",
};

export default function UserDashboard() {
  const [seeker, setSeeker] = useState(null);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [activeDraft, setActiveDraft] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      seekerAPI.getMe().catch(() => null),
      seekerAPI.getApplications().catch(() => ({ applications: [] })),
      seekerAPI.getSavedJobs().catch(() => ({ jobs: [] })),
      seekerAPI.getDrafts().catch(() => [])
    ])
      .then(([profile, appsData, savedData, draftsData]) => {
        setSeeker(profile);
        setApplications(appsData?.applications || []);
        setSavedJobs(savedData?.jobs || []);
        
        const active = draftsData?.find(d => d.isActive || d.id === profile?.active_resume_draft_id);
        setActiveDraft(active || null);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load dashboard data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const getPipelineList = (status) => {
    if (status === "Saved") {
      return savedJobs.map(j => ({
        id: j.id,
        jobId: j.id,
        title: j.job_title,
        company: j.company_name,
        date: "Saved",
        logoPath: j.company_logo_path,
        status: "saved",
      }));
    }
    
    // Map applications status choices
    return applications
      .filter((app) => {
        const s = app.status.toLowerCase();
        if (status === "Applied") return s === "applied" || (s === "rejected" && app.visible_round_index === 1);
        if (status === "Interview") return s === "interview" || s === "shortlisted" || (s === "rejected" && app.visible_round_index > 1);
        if (status === "Offer") return s === "hired" || s === "offer" || s === "accepted";
        return false;
      })
      .map(app => ({
        id: app.id,
        jobId: app.job_id,
        title: app.job_title,
        company: app.company_name,
        date: app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "Recently",
        logoPath: app.company_logo_path,
        status: app.status.toLowerCase(),
      }));
  };

  const counts = {
    Applied: applications.length,
    Interviews: applications.filter(a => 
      a.status === "shortlisted" || 
      a.status === "interview" || 
      a.status === "hired" || 
      a.status === "accepted" || 
      (a.status === "rejected" && a.visible_round_index > 1)
    ).length,
    Offers: applications.filter(a => a.status === "hired" || a.status === "accepted").length,
    Saved: savedJobs.length
  };

  const overallScore = activeDraft?.atsScore || 0;
  const atsReport = activeDraft?.atsReport || {};
  const strengths = atsReport.strengths || [];
  const weaknesses = atsReport.weaknesses || [];
  const topSuggestions = atsReport.topSuggestions || [];
  const getDetailedBreakdown = (report) => {
    if (!report) return null;
    if (report.detailed_breakdown) return report.detailed_breakdown;
    
    const legacy = report.breakdown || {};
    return {
      keyword_match: {
        score: legacy.keywords?.score ?? 0,
        matched: legacy.keywords?.matchedKeywords ?? [],
        missing: legacy.keywords?.missingKeywords ?? []
      },
      skills_match: {
        score: legacy.integrity?.score ?? 0,
        matched: [],
        missing: []
      },
      experience_relevance: {
        score: legacy.content?.score ?? 0,
        details: "Derived from content score",
        years: 0,
        required_years: 0
      },
      project_relevance: {
        score: legacy.content?.score ?? 0,
        details: "Derived from content score"
      },
      education_match: {
        score: legacy.structure?.score ?? 0,
        details: "Derived from structure score"
      },
      ats_formatting: {
        score: legacy.formatting?.score ?? 0,
        issues: legacy.formatting?.issues ?? []
      }
    };
  };

  const bd = getDetailedBreakdown(atsReport) || {
    keyword_match: { score: 0, matched: [], missing: [] },
    skills_match: { score: 0, matched: [], missing: [] },
    experience_relevance: { score: 0, details: "Not analyzed", years: 0, required_years: 0 },
    project_relevance: { score: 0, details: "Not analyzed" },
    education_match: { score: 0, details: "Not analyzed" },
    ats_formatting: { score: 0, issues: [] }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <Header />
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-7xl px-6 pt-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wider text-[var(--google-blue)]">Dashboard</div>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Welcome back, {seeker?.full_name?.split(" ")[0] || "Seeker"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              Here's where you are with your job search. Plan:{" "}
              <span className={`font-bold ${seeker?.tier === 'premium' ? 'text-amber-600' : 'text-gray-500'} uppercase`}>
                {seeker?.tier || 'Free'}
              </span>
              {seeker?.tier !== 'premium' && (
                <Link to="/jobs/billing" className="ml-3 text-xs font-black text-indigo-600 hover:text-indigo-800 underline underline-offset-2">
                  Upgrade to Premium ⚡
                </Link>
              )}
            </p>
          </div>
          <Link to="/jobs/search" className="pill shrink-0 bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Find more jobs</Link>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          {[
            { i: Briefcase, k: "Applied", v: String(counts.Applied), c: "var(--google-blue)" },
            { i: Clock, k: "Interviews", v: String(counts.Interviews), c: "var(--google-yellow)" },
            { i: CheckCircle2, k: "Offers", v: String(counts.Offers), c: "var(--google-green)" },
            { i: Bookmark, k: "Saved", v: String(counts.Saved), c: "var(--google-red)" },
          ].map((s) => (
            <div key={s.k} className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: `color-mix(in oklab, ${s.c} 14%, transparent)` }}>
                  <s.i className="h-5 w-5" style={{ color: s.c }} />
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-4 text-xs text-muted-foreground">{s.k}</div>
              <div className="font-display text-3xl font-semibold">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--google-blue)]">Resume Health</div>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">ATS Scoring & Diagnostics</h2>
              <p className="text-sm text-muted-foreground">Detailed assessment of your active resume draft.</p>
            </div>
            {activeDraft && (
              <Link 
                to={`/resume-builder/edit/${activeDraft.id}`}
                className="pill bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition flex items-center gap-2 w-fit"
              >
                <Edit className="h-4 w-4" /> Optimize in Builder
              </Link>
            )}
          </div>

          {!activeDraft ? (
            <div className="mt-8 flex flex-col items-center justify-center text-center py-8">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[color-mix(in_oklab,var(--google-blue)_10%,transparent)] text-[var(--google-blue)] mb-4">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold">No Active Resume Builder Draft</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md">
                Create an industry-standard resume in our builder, or import your existing resume file to get real-time ATS scoring, keyword match verification, and AI-powered recommendations.
              </p>
              <Link 
                to="/resume-builder"
                className="mt-6 pill bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Launch Resume Builder
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Col 1: Score & Breakdown */}
              <div className="space-y-6 flex flex-col items-center lg:items-start">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ATS Match Score</div>
                
                <div className="relative flex items-center justify-center">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className="stroke-border"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className={`transition-all duration-500 ease-in-out ${
                        overallScore >= 80 ? 'stroke-[var(--google-green)]' :
                        overallScore >= 50 ? 'stroke-[var(--google-yellow)]' :
                        'stroke-[var(--google-red)]'
                      }`}
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 64}
                      strokeDashoffset={2 * Math.PI * 64 * (1 - overallScore / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="font-display text-4xl font-bold">{overallScore}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">/ 100</span>
                  </div>
                </div>

                <div className="w-full text-center lg:text-left space-y-1">
                  <div className="text-sm font-bold">
                    {overallScore >= 80 ? '🎉 Excellent Match!' :
                     overallScore >= 50 ? '⚡ Good Progress (Needs Tweaks)' :
                     '⚠️ Strong Gap Detected'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Active Draft: <span className="font-medium text-foreground">{activeDraft.title}</span>
                  </div>
                </div>

                {/* Mini Horizontal sub-scores list */}
                <div className="w-full space-y-3 pt-2">
                  {[
                    { label: "Keywords (35%)", val: bd.keyword_match?.score || 0 },
                    { label: "Skills (25%)", val: bd.skills_match?.score || 0 },
                    { label: "Experience (15%)", val: bd.experience_relevance?.score || 0 },
                    { label: "Projects (10%)", val: bd.project_relevance?.score || 0 },
                    { label: "Education (5%)", val: bd.education_match?.score || 0 },
                    { label: "Formatting (10%)", val: bd.ats_formatting?.score || 0 },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span>{item.val}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${
                            item.val >= 80 ? 'bg-[var(--google-green)]' :
                            item.val >= 50 ? 'bg-[var(--google-yellow)]' :
                            'bg-[var(--google-red)]'
                          }`}
                          style={{ width: `${item.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Col 2: Target Gap Analysis */}
              <div className="space-y-6 border-t lg:border-t-0 lg:border-x border-border pt-6 lg:pt-0 lg:px-6">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Target Gap Analysis</div>
                
                {/* Missing Keywords */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--google-red)]">Missing Keywords</span>
                    <span className="rounded-full bg-red-100 dark:bg-red-950/40 text-[var(--google-red)] text-[10px] font-bold px-2 py-0.5">
                      {bd.keyword_match?.missing?.length || 0} missing
                    </span>
                  </div>
                  {bd.keyword_match?.missing?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {bd.keyword_match.missing.map((kw, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 font-medium">
                          {kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-2xl p-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--google-green)] shrink-0" />
                      <span>No missing keywords identified! Excellent keyword density.</span>
                    </div>
                  )}
                </div>

                {/* Missing Skills */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--google-yellow)]">Missing Skills</span>
                    <span className="rounded-full bg-yellow-100 dark:bg-yellow-950/40 text-[var(--google-yellow)] text-[10px] font-bold px-2 py-0.5">
                      {bd.skills_match?.missing?.length || 0} missing
                    </span>
                  </div>
                  {bd.skills_match?.missing?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {bd.skills_match.missing.map((sk, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 font-medium">
                          {sk}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-2xl p-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--google-green)] shrink-0" />
                      <span>All core skills from the JD are declared on your resume!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Col 3: Suggestions & Health Report */}
              <div className="space-y-6 border-t lg:border-t-0 border-border pt-6 lg:pt-0">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI Suggestions & Report</div>
                
                {/* Top Suggestions */}
                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--google-blue)]">Actionable Checklist</div>
                  {topSuggestions.length > 0 ? (
                    <ul className="space-y-2">
                      {topSuggestions.map((sug, i) => (
                        <li key={i} className="flex gap-2 text-xs text-foreground bg-muted/50 p-2.5 rounded-xl border border-border">
                          <Sparkles className="h-4 w-4 text-[var(--google-blue)] shrink-0 mt-0.5" />
                          <span className="font-medium leading-relaxed">{sug}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-muted-foreground">No suggestions available. Try targeting a specific Job Description.</div>
                  )}
                </div>

                {/* Resume Health Report (Strengths & Weaknesses) */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">General Health Report</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {strengths.map((str, i) => (
                      <div key={`str-${i}`} className="flex gap-2 items-start text-xs text-green-700 dark:text-green-400">
                        <Check className="h-3.5 w-3.5 text-[var(--google-green)] shrink-0 mt-0.5" />
                        <span>{str}</span>
                      </div>
                    ))}
                    {weaknesses.map((weak, i) => (
                      <div key={`weak-${i}`} className="flex gap-2 items-start text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3.5 w-3.5 text-[var(--google-red)] shrink-0 mt-0.5" />
                        <span>{weak}</span>
                      </div>
                    ))}
                    {strengths.length === 0 && weaknesses.length === 0 && (
                      <div className="text-xs text-muted-foreground">No health reports generated yet. Add more sections to get feedback.</div>
                    )}
                  </div>
                </div>
              </div>
              
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Your pipeline</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          {statuses.map((status) => {
            const list = getPipelineList(status);
            return (
              <div key={status} className="rounded-3xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: statusColor[status] }} />
                    <span className="font-display font-semibold">{status}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{list.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {list.map((a) => (
                    <Link
                      key={a.id}
                      to={`/jobs/${a.jobId}`}
                      className="block rounded-2xl border border-border bg-background p-4 transition hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <CompanyLogo name={a.company} logoPath={a.logoPath} color="#4F46E5" size={36} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{a.title}</div>
                          <div className="truncate text-xs text-muted-foreground">{a.company}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{a.date}</span>
                        {a.status === "rejected" && (
                          <span className="rounded-full bg-red-50 border border-red-100 text-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                            Rejected
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {list.length === 0 && <p className="text-xs text-muted-foreground">Nothing here yet.</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}

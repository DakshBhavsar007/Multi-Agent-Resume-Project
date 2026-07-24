import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header, Footer } from '../../components/user/site-chrome';
import VerifiedBadge from '../../components/VerifiedBadge';
import { publicAPI } from '../../lib/api';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { 
  MapPin, Briefcase, Star, ArrowLeft, Calendar, 
  GraduationCap, Award, MessageSquareQuote, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

function Section({ icon: Icon, title, children, color }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        {Icon && <Icon className="h-5 w-5" style={{ color }} />}
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SeekerPublicProfile() {
  const { seekerId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seekerId) return;
    setLoading(true);
    publicAPI.getSeekerProfile(seekerId)
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load user profile");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [seekerId]);

  const getSkillName = (s) => {
    if (typeof s === 'object' && s !== null) {
      return s.canonical_skill || s.raw_skill || s.skill || s.name || s.title || '';
    }
    const strVal = String(s || '').trim();
    if (strVal.startsWith('{') && strVal.endsWith('}')) {
      try {
        const parsed = JSON.parse(strVal.replace(/'/g, '"').replace(/: None/g, ': null').replace(/: True/g, ': true').replace(/: False/g, ': false'));
        return parsed.canonical_skill || parsed.raw_skill || parsed.skill || parsed.name || parsed.title || strVal;
      } catch (e) {
        const canonicalMatch = strVal.match(/'canonical_skill':\s*'([^']+)'/) || strVal.match(/"canonical_skill":\s*"([^"]+)"/);
        if (canonicalMatch) return canonicalMatch[1];
        
        const rawMatch = strVal.match(/'raw_skill':\s*'([^']+)'/) || strVal.match(/"raw_skill":\s*"([^"]+)"/);
        if (rawMatch) return rawMatch[1];

        const skillMatch = strVal.match(/'skill':\s*'([^']+)'/) || strVal.match(/"skill":\s*"([^"]+)"/);
        if (skillMatch) return skillMatch[1];

        const nameMatch = strVal.match(/'name':\s*'([^']+)'/) || strVal.match(/"name":\s*"([^"]+)"/);
        if (nameMatch) return nameMatch[1];
      }
    }
    return strVal;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
          <LoadingSkeleton rows={6} />
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl font-bold text-foreground">Profile Not Found</h2>
          <p className="text-sm text-muted-foreground mt-2">The requested candidate profile does not exist or is unavailable.</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const resumeData = profile.resume_data || {};
  const workExperience = profile.experience || resumeData.experience || resumeData.work_experience || [];
  const educationList = profile.education || resumeData.education || [];
  const skillsList = profile.skills || [];
  const openTo = profile.open_to || {};

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full space-y-6">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} /> Back
        </Link>

        {/* Profile Card Header (Matching UserProfile.jsx) */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {profile.avatar_path ? (
              <img
                src={profile.avatar_path}
                alt={profile.full_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-border shadow-md shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center text-2xl font-extrabold shadow-md shrink-0">
                {profile.full_name?.charAt(0)}
              </div>
            )}

            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
                  {profile.full_name}
                </h1>
                {profile.is_verified && (
                  <VerifiedBadge size={20} title="Verified Candidate Account" />
                )}
              </div>

              {profile.headline && (
                <p className="text-xs font-semibold text-muted-foreground">
                  {profile.headline}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-muted-foreground pt-1">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-muted-foreground" />
                    <span>{profile.location}</span>
                  </span>
                )}
                {profile.email_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                    <CheckCircle2 size={12} /> Verified Email
                  </span>
                )}
                {profile.phone_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold">
                    <CheckCircle2 size={12} /> Verified Phone
                  </span>
                )}
                {profile.created_at && (
                  <span className="flex items-center gap-1 text-[11px]">
                    <Calendar size={12} className="text-muted-foreground" />
                    <span>Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Grid Layout (Matching UserProfile.jsx Images 2 & 3) */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          
          {/* Main profile sections */}
          <div className="space-y-6">
            
            {/* Experience Section */}
            <Section icon={Briefcase} title="Experience" color="var(--google-blue)">
              <div className="space-y-6">
                {workExperience.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No experience parsed from resume yet.</p>
                ) : (
                  workExperience.map((x, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="font-semibold text-base text-foreground leading-snug">{x.role || x.job_title || "Role"}</div>
                      <div className="text-xs text-muted-foreground font-medium">{x.company || "Company"} &middot; {x.duration || x.dates || "Duration"}</div>
                      {x.description && <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{x.description}</p>}
                    </div>
                  ))
                )}
              </div>
            </Section>

            {/* Education Section */}
            <Section icon={GraduationCap} title="Education" color="var(--google-green)">
              <div className="space-y-6">
                {educationList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No education parsed from resume yet.</p>
                ) : (
                  educationList.map((ed, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="font-semibold text-base text-foreground leading-snug">{ed.degree || "Degree"}</div>
                      <div className="text-xs text-muted-foreground font-medium">{ed.school || ed.institution || "Institution"} &middot; {ed.year || "Year"}</div>
                    </div>
                  ))
                )}
              </div>
            </Section>

            {/* Skills Section (Clean Rounded Badges Matching Images 2 & 3) */}
            <Section icon={Award} title="Skills" color="var(--google-yellow)">
              <div className="flex flex-wrap gap-2">
                {skillsList.length === 0 ? (
                  <span className="text-sm text-muted-foreground">No skills added yet.</span>
                ) : (
                  skillsList.map((s, idx) => {
                    const name = getSkillName(s);
                    if (!name) return null;
                    return (
                      <span 
                        key={idx} 
                        className="bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 px-3 py-1.5 rounded-2xl text-xs font-medium text-foreground shadow-2xs"
                      >
                        {name}
                      </span>
                    );
                  })
                )}
              </div>
            </Section>

            {/* Public Reviews Section */}
            <Section icon={MessageSquareQuote} title={`Reviews & Feedback (${profile.reviews?.length || 0})`} color="var(--google-red)">
              {!profile.reviews || profile.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No public reviews submitted yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {profile.reviews.map((rev) => (
                    <div key={rev.id} className="bg-muted/40 border border-border rounded-2xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">
                          {rev.company_name || 'Between Platform'}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={s <= rev.rating ? 'fill-[var(--google-yellow)] text-[var(--google-yellow)]' : 'text-muted-foreground/30'}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed italic">
                        "{rev.text}"
                      </p>
                      <div className="text-[10px] text-muted-foreground text-right">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

          </div>

          {/* Right sidebar details & preferences (Matching UserProfile.jsx) */}
          <aside className="space-y-4">
            
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Strength</div>
                <div className="text-xl font-bold font-display mt-1 text-primary">{profile.profile_strength || 85}%</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <div className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Applied</div>
                <div className="text-xl font-bold font-display mt-1 text-[var(--google-blue)]">{profile.applications_count || 0}</div>
              </div>
            </div>

            {/* Hiring Preferences Card */}
            <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Hiring Preferences</h3>
              <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Open to: <strong className="text-foreground">{openTo.workTypes?.join(', ') || 'Remote, Hybrid'}</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Areas: <strong className="text-foreground">{openTo.roleTypes?.join(', ') || 'Engineering'}</strong></span>
                </li>
                {openTo.locations?.length > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Locations: <strong className="text-foreground">{openTo.locations.join(', ')}</strong></span>
                  </li>
                )}
              </ul>
            </div>

          </aside>

        </div>
      </main>

      <Footer />
    </div>
  );
}

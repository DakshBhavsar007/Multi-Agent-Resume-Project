import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header, Footer } from '../../components/user/site-chrome';
import VerifiedBadge from '../../components/VerifiedBadge';
import { publicAPI } from '../../lib/api';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { 
  Code2, Star, ArrowLeft, Calendar, 
  Terminal, ShieldCheck, MessageSquareQuote, CheckCircle2
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

export default function DeveloperPublicProfile() {
  const { devId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!devId) return;
    setLoading(true);
    publicAPI.getDeveloperProfile(devId)
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load developer profile");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [devId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        <Header />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-8">
          <LoadingSkeleton rows={4} />
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
          <Code2 className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Developer Profile Not Found</h1>
          <p className="text-muted-foreground">The requested developer profile does not exist or has been removed.</p>
          <Link to="/" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const { full_name, headline, is_verified, tier, reviews, joined_date } = profile;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Platform
        </Link>

        {/* Developer Header Hero */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="h-24 w-24 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 overflow-hidden flex items-center justify-center shrink-0">
              {profile.avatar_path ? (
                <img src={profile.avatar_path} alt={full_name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-3xl font-black text-amber-500">
                  {full_name ? full_name.charAt(0).toUpperCase() : 'D'}
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground truncate">
                  {full_name}
                </h1>
                {is_verified && <VerifiedBadge size={20} />}
                <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
                  <Code2 className="h-3 w-3" /> Developer Tier: {tier || 'Developer'}
                </span>
              </div>

              <p className="text-sm font-medium text-muted-foreground">
                {headline || 'Software Developer & API Builder'}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified Developer
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Joined {joined_date}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Platform Testimonials */}
        <Section icon={MessageSquareQuote} title={`Platform Reviews (${reviews?.length || 0})`} color="#3b82f6">
          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="rounded-2xl border border-border/60 bg-muted/30 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < (rev.rating || 5) ? 'fill-amber-500' : 'text-muted-foreground/30'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="text-sm text-foreground italic">"{rev.text}"</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No platform reviews submitted yet.</p>
          )}
        </Section>
      </main>

      <Footer />
    </div>
  );
}

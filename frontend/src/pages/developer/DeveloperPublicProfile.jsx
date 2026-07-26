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
            <DeveloperReviewsList reviews={reviews} devId={devId} onReplySuccess={() => {
              publicAPI.getDeveloperProfile(devId).then(setProfile).catch(() => {});
            }} />
          ) : (
            <p className="text-sm text-muted-foreground">No platform reviews submitted yet.</p>
          )}
        </Section>
      </main>

      <Footer />
    </div>
  );
}

function DeveloperReviewsList({ reviews, devId, onReplySuccess }) {
  const [selectedRating, setSelectedRating] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const filteredReviews = reviews.filter((r) => {
    if (selectedRating === "all") return true;
    return String(r.rating) === String(selectedRating);
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortBy === "highest") return (b.rating || 5) - (a.rating || 5);
    if (sortBy === "lowest") return (a.rating || 5) - (b.rating || 5);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const handleReplySubmit = async (reviewId) => {
    if (!replyText.trim()) return toast.error("Reply text is required");
    setSubmittingReply(true);
    try {
      const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";
      const jwt = localStorage.getItem("portal_jwt") || localStorage.getItem("vish_jwt");
      const headers = { "Content-Type": "application/json" };
      if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

      const res = await fetch(`/api/v1/reviews/${reviewId}/reply`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reply: replyText.trim() })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to submit reply");
      }
      toast.success("Official response published!");
      setReplyingReviewId(null);
      setReplyText("");
      if (onReplySuccess) onReplySuccess();
    } catch (err) {
      toast.error(err.message || "Failed to submit reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* FILTER & SORT BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        {/* Star Rating Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedRating("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedRating === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            All Ratings ({reviews.length})
          </button>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter((r) => r.rating === stars).length;
            return (
              <button
                key={stars}
                onClick={() => setSelectedRating(String(stars))}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all ${
                  selectedRating === String(stars)
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                <span>{stars}</span>
                <Star className="h-3 w-3 fill-current" />
                <span className="opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-muted-foreground font-semibold">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs font-bold text-foreground focus:outline-none"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
      </div>

      {/* REVIEWS LIST */}
      {sortedReviews.length > 0 ? (
        <div className="space-y-4">
          {sortedReviews.map((rev) => (
            <div key={rev.id} className="rounded-2xl border border-border/60 bg-muted/30 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-600 text-xs">
                    {rev.author?.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">{rev.author?.full_name || "Verified Member"}</span>
                      {rev.author?.is_verified && <VerifiedBadge size={14} />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{rev.author?.role_badge || "Member"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i < (rev.rating || 5) ? "fill-amber-500" : "text-muted-foreground/30"}`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>

              <p className="text-sm text-foreground italic pl-1 font-medium">"{rev.text}"</p>

              {/* Official Response Section */}
              {rev.official_reply ? (
                <div className="mt-3 p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-blue-600 dark:text-blue-400">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Official Response from Developer
                    </span>
                    <span className="text-[10px] opacity-75">
                      {rev.official_reply_at ? new Date(rev.official_reply_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{rev.official_reply}</p>
                </div>
              ) : (
                <div className="pt-1">
                  {replyingReviewId === rev.id ? (
                    <div className="mt-2 p-3 rounded-xl bg-card border border-border space-y-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your official response..."
                        rows={2}
                        className="w-full p-2 bg-muted/40 border border-border rounded-lg text-xs font-medium focus:outline-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingReviewId(null)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReplySubmit(rev.id)}
                          disabled={submittingReply}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          {submittingReply ? "Publishing..." : "Publish Reply"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingReviewId(rev.id);
                        setReplyText("");
                      }}
                      className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Terminal className="h-3 w-3" /> Reply as Owner
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-4 text-center">No reviews match the selected rating filter.</p>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Header, Footer } from "../../components/user/site-chrome";
import { CompanyLogo } from "../../components/user/company-logo";
import { publicAPI, seekerAPI } from "../../lib/api";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import VerifiedBadge from "../../components/VerifiedBadge";
import { ArrowLeft, MapPin, Users, Users2, Calendar, Star, Globe, Bell, UserCheck, Pen, Trash2, MessageSquareQuote } from "lucide-react";
import toast from "react-hot-toast";
import WriteReviewModal from "../../components/WriteReviewModal";

export default function UserCompanyDetail() {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  // Review states
  const [reviews, setReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const hasSeekerToken = !!localStorage.getItem("vish_seeker_token");
  const seekerData = (() => {
    try { return JSON.parse(localStorage.getItem('vish_seeker_data') || 'null'); } catch { return null; }
  })();
  const isVerified = !!(seekerData?.email_verified && seekerData?.phone_verified);

  useEffect(() => {
    if (!companyId) return;
    publicAPI.getCompanyReviews(companyId)
      .then((data) => {
        setReviews(data.reviews || []);
      })
      .catch((err) => console.error("Failed to load company reviews", err));
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    const hasSeekerToken = !!localStorage.getItem("vish_seeker_token");
    const apiCall = hasSeekerToken 
      ? seekerAPI.getCompany(companyId) 
      : publicAPI.getCompany(companyId);

    apiCall
      .then((data) => {
        const mappedCompany = {
          id: data.id,
          name: data.name,
          industry: data.industry || "Technology",
          location: data.hq_location || "Remote",
          size: data.company_size || "50-200",
          founded: data.founded_year || 2020,
          website: data.website_url || "#",
          about: data.about || "This company has not provided an overview yet.",
          rating: data.rating || 4.5,
          logoColor: "#059669",
          logoPath: data.logo_path,
          openings: data.openings || 0,
          openJobs: data.open_jobs || [],
          isFollowing: data.is_following || false,
          followersCount: data.followers_count || 0,
        };
        setCompany(mappedCompany);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load company details");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [companyId]);

  const handleFollow = async () => {
    if (!company || following) return;
    setFollowing(true);
    const isCurrentlyFollowing = company.isFollowing;
    // Optimistic update
    setCompany(prev => ({ 
      ...prev, 
      isFollowing: !isCurrentlyFollowing,
      followersCount: isCurrentlyFollowing ? Math.max(0, (prev.followersCount || 0) - 1) : (prev.followersCount || 0) + 1
    }));
    try {
      await seekerAPI.followCompany(company.id, !isCurrentlyFollowing);
      toast.success(
        isCurrentlyFollowing 
          ? "Unfollowed company" 
          : "Following! You'll get notified of new job postings.",
        { duration: 3000 }
      );
    } catch (err) {
      // Revert on failure
      setCompany(prev => ({ 
        ...prev, 
        isFollowing: isCurrentlyFollowing,
        followersCount: isCurrentlyFollowing ? (prev.followersCount || 0) + 1 : Math.max(0, (prev.followersCount || 0) - 1)
      }));
      toast.error(err.message || "Failed to follow company");
    } finally {
      setFollowing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <Header />
        <div className="flex-1 mx-auto max-w-7xl w-full px-6 py-10 space-y-8">
          <LoadingSkeleton width="100px" height="20px" />
          
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <LoadingSkeleton width="64px" height="64px" borderRadius="16px" />
                <div className="space-y-2">
                  <LoadingSkeleton width="180px" height="28px" />
                  <LoadingSkeleton width="120px" height="16px" />
                </div>
              </div>
              <LoadingSkeleton width="120px" height="36px" className="pill" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 border-t border-border">
              <div className="lg:col-span-2 space-y-4">
                <LoadingSkeleton width="100px" height="20px" />
                <div className="space-y-2">
                  <LoadingSkeleton width="100%" height="16px" />
                  <LoadingSkeleton width="95%" height="16px" />
                  <LoadingSkeleton width="80%" height="16px" />
                </div>
              </div>
              <div className="lg:col-span-1 space-y-4 p-5 bg-muted/10 rounded-2xl">
                <LoadingSkeleton width="100px" height="18px" />
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2">
                    <LoadingSkeleton width="16px" height="16px" />
                    <LoadingSkeleton width="100px" height="14px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <p>Company not found or failed to load.</p>
          <Link to="/jobs/companies" className="text-primary underline mt-2">Back to companies</Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <Link to="/jobs/companies" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All companies
        </Link>
      </div>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-8 sm:p-12">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-50"
            style={{ background: `radial-gradient(50% 70% at 20% 0%, color-mix(in oklab, ${company.logoColor} 25%, transparent), transparent)` }}
          />
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-5 sm:flex sm:items-center sm:gap-6">
            <div className="min-w-0">
              <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl flex items-center gap-2">
                <span>{company.name}</span>
                {company.email_verified !== false && (
                  <VerifiedBadge size={28} title="Verified Company Account" />
                )}
              </h1>
              <p className="mt-2 text-muted-foreground">{company.industry}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{company.location}</span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{company.size} employees</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />Founded {company.founded}</span>
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-[var(--google-yellow)] text-[var(--google-yellow)]" />{company.rating}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 items-center">
            <button
              onClick={handleFollow}
              disabled={following}
              className={`pill px-5 py-2.5 text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                company.isFollowing 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {company.isFollowing 
                ? <><UserCheck className="h-4 w-4" /> Following</> 
                : <><Bell className="h-4 w-4" /> Follow & Get Notified</>}
            </button>
            {company.website && company.website !== "#" && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="pill border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted inline-flex items-center"
              >
                <Globe className="mr-1.5 h-4 w-4" />Website
              </a>
            )}
            {/* Public follower count */}
            <div className="ml-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users2 className="h-4 w-4" />
              <span className="font-semibold text-foreground">{company.followersCount ?? 0}</span>
              <span>followers</span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-border bg-card p-8">
              <h2 className="font-display text-xl font-semibold tracking-tight">About</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground whitespace-pre-wrap">{company.about}</p>
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-8">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold tracking-tight">Open roles ({company.openJobs.length})</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {company.openJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open roles right now.</p>
                ) : (
                  company.openJobs.map((j) => (
                    <Link
                      key={j.id}
                      to={`/jobs/${j.id}`}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4 transition hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <h3 className="truncate font-display font-semibold group-hover:text-primary">{j.job_title}</h3>
                        <div className="mt-1 text-xs text-muted-foreground">{j.location} · {j.employment_type} · {j.salary_range}</div>
                      </div>
                      <span className="pill shrink-0 bg-foreground px-3 py-1.5 text-xs font-medium text-background">View</span>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Company Reviews Card */}
            <div className="rounded-[2rem] border border-border bg-card p-8">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-tight">Company Reviews ({company.review_count || reviews.length})</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Average rating: {company.rating} / 5</p>
                </div>
                {hasSeekerToken && (
                  <button
                    onClick={() => {
                      if (!isVerified) {
                        toast.error('Verify your email and phone to write reviews');
                        return;
                      }
                      setEditingReview(null);
                      setShowReviewModal(true);
                    }}
                    className={`pill inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
                      isVerified
                        ? 'bg-primary text-primary-foreground hover:opacity-90'
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                    title={!isVerified ? 'Verify your email and phone to write reviews' : 'Review this company'}
                  >
                    <MessageSquareQuote className="h-3.5 w-3.5" /> Rate & Review
                  </button>
                )}
              </div>

              <div className="mt-6 space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No reviews for {company.name} yet. Be the first to share your experience!</p>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="p-4 rounded-2xl border border-border bg-background relative group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= r.rating ? 'fill-[var(--google-yellow)] text-[var(--google-yellow)]' : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">"{r.text}"</p>
                      
                      {/* Author Info */}
                      <div className="mt-3 flex items-center justify-between pt-3 border-t border-border/50">
                        {r.author?.id ? (
                          <Link to={`/jobs/profile/${r.author.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            {r.author.avatar_path ? (
                              <img src={r.author.avatar_path} alt={r.author.full_name} className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                                {r.author.full_name?.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-semibold flex items-center gap-0.5">
                                {r.author.full_name}
                                {r.author.is_verified && <VerifiedBadge size={13} />}
                              </div>
                              <div className="text-[10px] text-muted-foreground">{r.author.headline || 'Verified Job Seeker'}</div>
                            </div>
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                              {r.author?.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="text-xs font-semibold flex items-center gap-0.5">
                                {r.author?.full_name}
                                {r.author?.is_verified && <VerifiedBadge size={13} />}
                              </div>
                              <div className="text-[10px] text-muted-foreground">{r.author?.headline || 'Verified Job Seeker'}</div>
                            </div>
                          </div>
                        )}

                        {/* Owner edit/delete */}
                        {r.is_own && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditingReview(r); setShowReviewModal(true); }}
                              className="p-1 rounded bg-muted hover:bg-muted-foreground/10 text-muted-foreground"
                              title="Edit review"
                            >
                              <Pen className="h-3 w-3" />
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await seekerAPI.deleteReview(r.id);
                                  setReviews(prev => prev.filter(x => x.id !== r.id));
                                  toast.success('Review deleted');
                                } catch (err) {
                                  toast.error(err.message || 'Failed to delete review');
                                }
                              }}
                              className="p-1 rounded bg-muted hover:bg-red-100 text-red-500"
                              title="Delete review"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Company at a glance</div>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ["Industry", company.industry],
                  ["Size", company.size],
                  ["HQ", company.location],
                  ["Founded", String(company.founded)],
                  ["Open roles", String(company.openings)],
                  ["Rating", `${company.rating} ★ (${company.review_count || reviews.length} reviews)`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </section>

      {showReviewModal && (
        <WriteReviewModal
          isOpen={showReviewModal}
          onClose={() => { setShowReviewModal(false); setEditingReview(null); }}
          companyId={company.id}
          companyName={company.name}
          editingReview={editingReview}
          onSubmit={(rev) => {
            if (editingReview) {
              setReviews(prev => prev.map(x => x.id === rev.id ? rev : x));
            } else {
              setReviews(prev => [rev, ...prev]);
            }
            setShowReviewModal(false);
            setEditingReview(null);
          }}
        />
      )}

      <Footer />
    </div>
  );
}

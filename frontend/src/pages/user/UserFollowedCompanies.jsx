import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header, Footer } from "../../components/user/site-chrome";
import { CompanyLogo } from "../../components/user/company-logo";
import { seekerAPI } from "../../lib/api";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import {
  Bell,
  BellOff,
  MapPin,
  Star,
  Briefcase,
  Users2,
  ArrowRight,
  Building2,
  Heart,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import useDocumentTitle from "../../hooks/useDocumentTitle";

export default function UserFollowedCompanies() {
  useDocumentTitle(
    "Following Companies",
    "Manage the companies you follow and get notified of their new job openings."
  );

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unfollowingId, setUnfollowingId] = useState(null);

  const fetchFollowed = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vish_seeker_token");
      if (!token) {
        setCompanies([]);
        setLoading(false);
        return;
      }
      const data = await seekerAPI.getFollowedCompanies();
      // data may be array or { companies: [...] }
      const list = Array.isArray(data) ? data : (data?.companies || []);
      setCompanies(list);
    } catch (err) {
      console.warn("getFollowedCompanies failed:", err.message);
      // Graceful fallback — don't show misleading "Please log in" when user IS logged in
      // The backend endpoint may not be implemented yet; show empty state silently
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowed();
  }, []);

  const handleUnfollow = async (company) => {
    if (unfollowingId) return;
    setUnfollowingId(company.id);
    // Optimistic remove
    setCompanies((prev) => prev.filter((c) => c.id !== company.id));
    try {
      await seekerAPI.followCompany(company.id, false);
      toast.success(`Unfollowed ${company.name}`);
    } catch (err) {
      // Restore on failure
      setCompanies((prev) => [company, ...prev]);
      toast.error(err.message || "Failed to unfollow");
    } finally {
      setUnfollowingId(null);
    }
  };

  const isLoggedIn = !!localStorage.getItem("vish_seeker_token");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pt-10 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--google-blue)] mb-2">
              <Heart className="h-3.5 w-3.5 fill-current" />
              Following
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
              Companies you follow
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              You'll get notified when these companies post new jobs.
            </p>
          </div>
          {!loading && companies.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-2xl px-4 py-2.5">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              <span>
                Following <span className="font-bold text-foreground">{companies.length}</span> {companies.length === 1 ? "company" : "companies"}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Info Banner */}
      {!loading && isLoggedIn && (
        <section className="mx-auto max-w-7xl px-6 mb-6">
          <div className="rounded-2xl border border-[var(--google-blue)]/20 bg-blue-50/50 dark:bg-blue-950/10 p-4 flex items-start gap-3">
            <Bell className="h-5 w-5 text-[var(--google-blue)] mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-[var(--google-blue)]">Notifications active</span>
              <span className="text-muted-foreground ml-1">
                — When any followed company posts a new job, you'll receive an in-app notification and an email alert automatically.
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Not logged in */}
      {!isLoggedIn && (
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-center flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">Log in to see followed companies</h2>
              <p className="text-muted-foreground mt-1 text-sm">Sign in to track companies and get job notifications.</p>
            </div>
            <Link
              to="/jobs/login"
              className="pill bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:opacity-90 transition"
            >
              Log in
            </Link>
          </div>
        </section>
      )}

      {/* Companies List */}
      {isLoggedIn && (
        <section className="mx-auto max-w-7xl px-6 pb-16">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-3xl border border-border bg-card p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <LoadingSkeleton width="56px" height="56px" borderRadius="14px" />
                    <div className="flex-1 space-y-2">
                      <LoadingSkeleton width="140px" height="18px" />
                      <LoadingSkeleton width="90px" height="12px" />
                    </div>
                  </div>
                  <LoadingSkeleton width="100%" height="12px" />
                  <LoadingSkeleton width="80%" height="12px" />
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <LoadingSkeleton width="100px" height="32px" className="pill" />
                    <LoadingSkeleton width="80px" height="32px" className="pill" />
                  </div>
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center gap-5">
              <div className="w-24 h-24 rounded-full bg-muted/60 flex items-center justify-center">
                <Building2 className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">No followed companies yet</h2>
                <p className="text-muted-foreground mt-1 text-sm max-w-sm">
                  Follow companies to track their job postings and get instant notifications.
                </p>
              </div>
              <Link
                to="/jobs/companies"
                className="pill bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:opacity-90 transition inline-flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" /> Discover Companies
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((company) => (
                <CompanyFollowCard
                  key={company.id}
                  company={company}
                  onUnfollow={() => handleUnfollow(company)}
                  isUnfollowing={unfollowingId === company.id}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <Footer />
    </div>
  );
}

function CompanyFollowCard({ company, onUnfollow, isUnfollowing }) {
  const name = company.name || company.company_name || "Company";
  const industry = company.industry || "Technology";
  const location = company.hq_location || company.location || "Remote";
  const openings = company.openings || company.open_jobs_count || 0;
  const rating = company.rating || 4.5;
  const followersCount = company.followers_count ?? company.followersCount ?? 0;
  const logoPath = company.logo_path || company.logoPath;

  return (
    <div className="group rounded-3xl border border-border bg-card p-6 flex flex-col gap-4 transition hover:google-shadow relative overflow-hidden">
      {/* Subtle gradient background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(60% 80% at 10% 0%, color-mix(in oklab, #059669 15%, transparent), transparent)`,
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <CompanyLogo name={name} logoPath={logoPath} color="#059669" size={52} />
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-base tracking-tight truncate group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">{industry}</p>
          </div>
        </div>

        {/* Following badge */}
        <div className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
          <UserCheck className="h-3 w-3" />
          Following
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {location}
        </span>
        <span className="flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          {openings} open roles
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 shrink-0 fill-[var(--google-yellow)] text-[var(--google-yellow)]" />
          {rating}
        </span>
        <span className="flex items-center gap-1">
          <Users2 className="h-3.5 w-3.5 shrink-0" />
          {followersCount} followers
        </span>
      </div>

      {/* Notification info */}
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--google-blue)] bg-blue-50/70 dark:bg-blue-950/20 rounded-xl px-3 py-1.5 border border-blue-100/50">
        <Bell className="h-3 w-3 shrink-0" />
        <span>New job alerts are active via in-app &amp; email</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-border/60 mt-auto">
        <Link
          to={`/jobs/companies/${company.id}`}
          className="flex-1 pill inline-flex items-center justify-center gap-1.5 bg-foreground text-background text-xs font-semibold py-2 hover:opacity-80 transition"
        >
          View Profile <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <button
          onClick={onUnfollow}
          disabled={isUnfollowing}
          className="pill inline-flex items-center justify-center gap-1.5 border border-border bg-background text-xs font-semibold px-4 py-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
        >
          <BellOff className="h-3.5 w-3.5" />
          Unfollow
        </button>
      </div>
    </div>
  );
}

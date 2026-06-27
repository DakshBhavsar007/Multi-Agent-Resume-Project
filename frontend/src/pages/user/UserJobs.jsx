import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, MapPin, SlidersHorizontal, Bookmark, ArrowRight, X } from "lucide-react";
import { Header, Footer } from "../../components/user/site-chrome";
import { CompanyLogo } from "../../components/user/company-logo";
import { publicAPI, seekerAPI } from "../../lib/api";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { Slider } from "../../components/user/ui/slider";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "../../components/ui/pagination";
import toast from "react-hot-toast";
import { BookmarkIconButton } from "../../components/ui/bookmark-icon-button";

const jobTypes = ["Full-time", "Part-time", "Contract", "Internship"];
const workplaces = ["Remote", "Hybrid", "On-site"];
const experiences = ["Junior", "Mid-Level", "Senior", "Lead"];

function cleanDescriptionSnippet(text) {
  if (!text) return "";
  const lines = text.split("\n").map(l => l.trim());
  const cleanParts = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    // Skip divider lines (=== or --- or similar)
    if (/^[=\-_*]{3,}$/.test(line)) {
      continue;
    }
    
    // Skip key-value metadata lines (e.g. COMPANY: BuildFast)
    if (/^[A-Z0-9_\s]{2,25}:\s+(.*)/.test(line)) {
      continue;
    }
    
    // Skip uppercase headers
    const isHeader = line.length < 50 && line === line.toUpperCase() && /[A-Z]/.test(line);
    if (isHeader) {
      continue;
    }
    
    // Clean emojis from list items (✅, ✔️, ✔, ☑️, ☑, ⭐, 🌟, ✨, etc.)
    // and leading list markdown symbols like -, *, •, +
    const cleanLine = line
      .replace(/^(?:✅|✔️|✔|☑️|☑|⭐|🌟|✨|[-*•+])\s*/u, "")
      .trim();
      
    if (cleanLine) {
      cleanParts.push(cleanLine);
    }
  }
  
  const fullCleanText = cleanParts.join(" ");
  if (fullCleanText.length > 160) {
    return fullCleanText.substring(0, 157) + "...";
  }
  return fullCleanText;
}

function getWorkplaceType(job) {
  const loc = (job.location || "").toLowerCase();
  const desc = (job.job_description || "").toLowerCase();
  if (loc.includes("remote")) return "Remote";
  if (loc.includes("hybrid") || desc.includes("hybrid")) return "Hybrid";
  return "On-site";
}

export default function UserJobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [location, setLocation] = useState(searchParams.get("location") || "");
  
  const [activeTypes, setActiveTypes] = useState([]);
  const [activeWorkplaces, setActiveWorkplaces] = useState([]);
  const [activeExp, setActiveExp] = useState("");
  const [salary, setSalary] = useState([80]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);

  const fetchJobs = (resetPage = false) => {
    setLoading(true);
    const targetPage = resetPage ? 1 : page;
    if (resetPage) setPage(1);

    const params = {
      page: targetPage,
      per_page: 10
    };
    if (search) params.q = search;
    if (location) params.location = location;
    
    // Try seeker API first (for match scores), fall back to public API
    const token = localStorage.getItem('vish_seeker_token');
    const apiCall = token ? seekerAPI.listJobs(params) : publicAPI.listJobs(params);
    apiCall
      .then((data) => {
        setJobs(data.jobs || []);
        setTotalPages(data.total_pages || 1);
        setTotalJobs(data.total || 0);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load jobs");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchJobs();
  }, [page]);

  useEffect(() => {
    const params = {};
    if (search) params.q = search;
    if (location) params.location = location;
    setSearchParams(params, { replace: true });
    fetchJobs(true);
  }, [search, location]);

  const toggle = (arr, set, v) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const filtered = jobs.filter((j) => {
    if (activeTypes.length && !activeTypes.includes(j.employment_type)) return false;
    if (activeWorkplaces.length && !activeWorkplaces.includes(getWorkplaceType(j))) return false;
    return true;
  });

  const activeFilters = [
    ...activeTypes.map((t) => ({ k: "type", v: t })),
    ...activeWorkplaces.map((t) => ({ k: "workplace", v: t })),
    ...(activeExp ? [{ k: "exp", v: activeExp }] : []),
  ];

  const clearAll = () => {
    setActiveTypes([]);
    setActiveWorkplaces([]);
    setActiveExp("");
  };

  const handleSave = async (jobId, isSaved) => {
    try {
      await seekerAPI.saveJob(jobId, !isSaved);
      setJobs(jobs.map((j) => j.id === jobId ? { ...j, applied: j.applied, is_saved: !isSaved } : j));
      toast.success(isSaved ? "Job unsaved" : "Job saved!");
    } catch (err) {
      toast.error(err.message || "Failed to save job");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-7xl px-6 pt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--google-blue)]">Jobs</div>
            <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Find your perfect role</h1>
            <p className="mt-1 text-xs text-muted-foreground">Showing {filtered.length} of {totalJobs} roles</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto relative z-20">
            <div className="relative flex-1 sm:w-[240px]">
              <div className="google-shadow flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 w-full">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input 
                  placeholder="Search job title..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" 
                />
              </div>
              {showSearchSuggestions && (
                <div className="absolute left-0 right-0 mt-1.5 bg-background border border-border rounded-2xl shadow-lg z-50 max-h-48 overflow-y-auto py-1">
                  {(() => {
                    const filteredList = Array.from(new Set(
                      jobs
                        .map(j => j.job_title || j.title)
                        .filter(Boolean)
                        .filter(title => !search || title.toLowerCase().includes(search.toLowerCase()))
                    )).slice(0, 5);
                    return filteredList.length > 0 ? (
                      filteredList.map((sug, idx) => (
                        <button
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearch(sug);
                            setShowSearchSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-muted text-foreground truncate"
                        >
                          {sug}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-xs text-muted-foreground">No suggestions found</div>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="relative flex-1 sm:w-[240px]">
              <div className="google-shadow flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 w-full">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <input 
                  placeholder="Location..." 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onFocus={() => setShowLocSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocSuggestions(false), 200)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" 
                />
              </div>
              {showLocSuggestions && (
                <div className="absolute left-0 right-0 mt-1.5 bg-background border border-border rounded-2xl shadow-lg z-50 max-h-48 overflow-y-auto py-1">
                  {(() => {
                    const filteredList = Array.from(new Set(
                      jobs
                        .map(j => j.location)
                        .filter(Boolean)
                        .filter(loc => !location || loc.toLowerCase().includes(location.toLowerCase()))
                    )).slice(0, 5);
                    return filteredList.length > 0 ? (
                      filteredList.map((sug, idx) => (
                        <button
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setLocation(sug);
                            setShowLocSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-muted text-foreground truncate"
                        >
                          {sug}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-xs text-muted-foreground">No suggestions found</div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left sidebar filters */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display font-semibold">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </div>
              <button onClick={clearAll} className="text-xs text-[var(--google-blue)] hover:underline">Clear all</button>
            </div>

            <FilterGroup title="Job Type">
              {jobTypes.map((t) => {
                const count = jobs.filter((j) => j.employment_type === t).length;
                return (
                  <label key={t} className="flex cursor-pointer items-center justify-between py-1.5 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeTypes.includes(t)}
                        onChange={() => toggle(activeTypes, setActiveTypes, t)}
                        className="h-4 w-4 rounded border-border accent-[var(--google-blue)]"
                      />
                      {t}
                    </span>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </label>
                );
              })}
            </FilterGroup>

            <FilterGroup title="Workplace Location">
              {workplaces.map((t) => {
                const count = jobs.filter((j) => getWorkplaceType(j) === t).length;
                return (
                  <label key={t} className="flex cursor-pointer items-center justify-between py-1.5 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeWorkplaces.includes(t)}
                        onChange={() => toggle(activeWorkplaces, setActiveWorkplaces, t)}
                        className="h-4 w-4 rounded border-border accent-[var(--google-green)]"
                      />
                      {t}
                    </span>
                    <span className="text-xs text-muted-foreground">{count}</span>
                  </label>
                );
              })}
            </FilterGroup>

            <FilterGroup title="Salary Range">
              <div className="px-1 pt-2">
                <Slider value={salary} onValueChange={setSalary} max={300} step={10} />
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>$50k</span>
                  <span className="font-medium text-foreground">${salary[0]}k+</span>
                  <span>$300k+</span>
                </div>
              </div>
            </FilterGroup>
          </div>

          <div className="rounded-3xl border border-border bg-foreground p-6 text-background">
            <div className="font-display text-base font-semibold">Resume Boost</div>
            <p className="mt-1 text-sm opacity-80">Unlock jobs that match your skills by 99%.</p>
            <Link to="/jobs/upload-resume" className="pill mt-4 inline-flex items-center gap-1 bg-[var(--google-green)] px-4 py-2 text-xs font-medium text-background">
              Upload Resume <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>

        {/* Results */}
        <div>
          {activeFilters.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active filters:</span>
              {activeFilters.map((f) => (
                <button
                  key={f.k + f.v}
                  onClick={() => {
                    if (f.k === "type") setActiveTypes(activeTypes.filter((x) => x !== f.v));
                    if (f.k === "workplace") setActiveWorkplaces(activeWorkplaces.filter((x) => x !== f.v));
                    if (f.k === "exp") setActiveExp("");
                  }}
                  className="pill inline-flex items-center gap-1 border border-border bg-background px-2.5 py-1 text-xs"
                >
                  {f.v} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{totalJobs} roles</span>
            <span>Sort: Best match</span>
          </div>

          {loading ? (
            <div className="grid gap-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border bg-card p-4">
                  <LoadingSkeleton width="42px" height="42px" borderRadius="10px" />
                  <div className="space-y-2">
                    <LoadingSkeleton width="200px" height="18px" />
                    <div className="flex gap-2">
                      <LoadingSkeleton width="80px" height="12px" />
                      <LoadingSkeleton width="60px" height="12px" />
                    </div>
                  </div>
                  <LoadingSkeleton width="24px" height="24px" className="pill" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 border border-dashed border-border rounded-2xl bg-card text-muted-foreground">
              No jobs found matching your filters.
            </div>
          ) : (
            <div className="grid gap-2.5">
              {filtered.map((j) => (
                <div
                  key={j.id}
                  className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border bg-card p-4 transition hover:google-shadow"
                >
                  <CompanyLogo name={j.company_name} logoPath={j.company_logo_path} color="#4F46E5" size={42} />
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/jobs/${j.id}`}
                        className="font-display text-base font-semibold tracking-tight group-hover:text-primary"
                      >
                        {j.job_title}
                      </Link>
                      <div className="sm:hidden">
                        <BookmarkIconButton isSaved={j.is_saved} onClick={() => handleSave(j.id, j.is_saved)} />
                      </div>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">{j.company_name}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>
                      <span>·</span>
                      {j.match_score !== undefined && (
                        <span className="text-[var(--google-green)] font-semibold">{j.match_score}% Match</span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{cleanDescriptionSnippet(j.job_description)}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                      <span className="pill bg-muted px-2 py-0.5 font-medium">{j.salary_range}</span>
                      <span className="pill bg-muted px-2 py-0.5 text-muted-foreground">{j.employment_type}</span>
                    </div>
                  </div>
                  <div className="hidden flex-col items-end gap-1.5 sm:flex">
                    <BookmarkIconButton isSaved={j.is_saved} onClick={() => handleSave(j.id, j.is_saved)} />
                    <Link
                      to={`/jobs/${j.id}`}
                      className="pill inline-flex items-center gap-1 bg-primary px-4 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-90"
                    >
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination>
                <PaginationContent>
                  {page > 1 && (
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setPage(p => p - 1)} />
                    </PaginationItem>
                  )}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => setPage(p)}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  {page < totalPages && (
                    <PaginationItem>
                      <PaginationNext onClick={() => setPage(p => p + 1)} />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div className="mt-5 border-t border-border pt-4 first:mt-4 first:border-t-0 first:pt-0">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

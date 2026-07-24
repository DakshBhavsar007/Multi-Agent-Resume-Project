import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Star, ArrowRight } from "lucide-react";
import { Header, Footer } from "../../components/user/site-chrome";
import { CompanyLogo } from "../../components/user/company-logo";
import { publicAPI } from "../../lib/api";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import VerifiedBadge from "../../components/VerifiedBadge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "../../components/ui/pagination";
import toast from "react-hot-toast";

export default function UserCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCompanies = () => {
    setLoading(true);
    publicAPI.listCompanies({ page, per_page: 9 })
      .then((data) => {
        setCompanies(data.companies || []);
        setTotalPages(data.total_pages || 1);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load companies");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCompanies();
  }, [page]);

  const filtered = companies.filter((c) => {
    const term = search.toLowerCase();
    return c.name.toLowerCase().includes(term) || (c.industry && c.industry.toLowerCase().includes(term));
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-7xl px-6 pt-10">
        <div className="max-w-2xl">
          <div className="text-xs font-medium uppercase tracking-wider text-[var(--google-green)]">Companies</div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Discover teams worth joining</h1>
          <p className="mt-3 text-muted-foreground">From early-stage startups to global platforms — find the place that fits you.</p>
        </div>

        <div className="relative z-20">
          <div className="google-shadow mt-8 flex items-center gap-2 rounded-3xl border border-border bg-background p-2">
            <div className="flex flex-1 items-center gap-2 px-3 py-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input 
                placeholder="Search company name or industry..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" 
              />
            </div>
          </div>
          {showSuggestions && (
            <div className="absolute left-0 right-0 mt-1 bg-background border border-border rounded-2xl shadow-lg z-50 max-h-48 overflow-y-auto py-1">
              {(() => {
                const filteredList = Array.from(new Set(
                  companies
                    .filter(c => 
                      !search || 
                      (c.name || "").toLowerCase().includes(search.toLowerCase()) || 
                      (c.industry || "").toLowerCase().includes(search.toLowerCase())
                    )
                    .flatMap(c => [c.name, c.industry])
                    .filter(Boolean)
                )).slice(0, 5);
                return filteredList.length > 0 ? (
                  filteredList.map((sug, idx) => (
                    <button
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearch(sug);
                        setShowSuggestions(false);
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
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl border border-border bg-card p-6 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <LoadingSkeleton width="48px" height="48px" borderRadius="10px" />
                    <div className="space-y-2">
                      <LoadingSkeleton width="120px" height="18px" />
                      <LoadingSkeleton width="80px" height="12px" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <LoadingSkeleton width="70px" height="12px" />
                    <LoadingSkeleton width="20px" height="12px" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-border rounded-2xl bg-card text-muted-foreground">
            No companies found.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to={`/jobs/companies/${c.id}`}
                className="group rounded-3xl border border-border bg-card p-6 transition hover:google-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start gap-4">
                    <CompanyLogo name={c.name} logoPath={c.logo_path} color="#059669" size={56} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-semibold tracking-tight group-hover:text-primary flex items-center gap-1">
                        <span className="truncate">{c.name}</span>
                        <VerifiedBadge size={16} title="Verified Company Account" />
                      </h3>
                      <p className="truncate text-xs text-muted-foreground">{c.industry}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{c.about || 'No description provided.'}</p>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground pt-4 border-t border-border/50">
                  <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{c.hq_location}</span>
                  <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-[var(--google-yellow)] text-[var(--google-yellow)]" />{c.rating}</span>
                  <span className="pill bg-muted px-2.5 py-1">{c.openings} roles</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination>
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPage((p) => p - 1)} />
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
                    <PaginationNext onClick={() => setPage((p) => p + 1)} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

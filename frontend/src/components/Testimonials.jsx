"use client";
import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Quote, Star, Pen, Trash2, MessageSquareQuote, UserCheck, Building2, Code2, Briefcase, ThumbsUp, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { publicAPI, seekerAPI, recruiterAPI } from '../lib/api';
import { portalReviews } from '../lib/portalApi';
import WriteReviewModal from './WriteReviewModal';
import VerifiedBadge from './VerifiedBadge';
import toast from 'react-hot-toast';
import './Testimonials.css';

const TestimonialCard = ({ t, index, timeAgo, onEdit, onDelete }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const ratingStars = t.rating || 5;

  const AvatarEl = () => (
    t.avatarPath ? (
      <img src={t.avatarPath} alt={t.author} className="w-9 h-9 rounded-full object-cover border border-blue-500/20" />
    ) : (
      <div className="author-avatar font-bold text-xs">
        {t.initials}
      </div>
    )
  );

  const getRoleIcon = (roleType) => {
    if (roleType === "developer") return <Code2 size={11} className="inline mr-1 text-amber-500 dark:text-amber-400" />;
    if (roleType === "recruiter") return <Building2 size={11} className="inline mr-1 text-emerald-500 dark:text-emerald-400" />;
    return <UserCheck size={11} className="inline mr-1 text-blue-500 dark:text-blue-400" />;
  };

  return (
    <motion.div 
      className={`testimonial-card-wrapper size-${t.size || 'medium'}`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
    >
      <motion.div 
        className="testimonial-card"
        style={{ rotateX, rotateY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="quote-icon-bg">
          <Quote size={80} opacity={0.05} />
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill={i < ratingStars ? (t.color || "#f59e0b") : "transparent"} color={t.color || "#f59e0b"} opacity={i < ratingStars ? 0.95 : 0.2} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {t.createdAt && timeAgo && (
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {timeAgo(t.createdAt)}
              </span>
            )}
            {t.companyId ? (
              <Link 
                to={`/jobs/companies/${t.companyId}`}
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 no-underline inline-flex items-center gap-1 hover:bg-blue-500/20 transition-colors"
              >
                <Building2 size={10} /> {t.targetBadge}
              </Link>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 inline-flex items-center gap-1">
                {t.targetBadge}
              </span>
            )}
          </div>
        </div>

        <p className="testimonial-quote">"{t.quote}"</p>

        {/* Official Response */}
        {t.officialReply && (
          <div className="mt-2 mb-1 p-2.5 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/15 text-[11px]">
            <div className="font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 mb-1">
              <ShieldCheck size={12} /> Official Response
            </div>
            <p className="text-gray-600 dark:text-gray-400">{t.officialReply}</p>
          </div>
        )}
        
        <div className="testimonial-author flex items-center justify-between w-full">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {t.authorId ? (
              <Link 
                to={
                  t.user_type === "recruiter"
                    ? `/jobs/companies/${t.companyId || t.authorId}`
                    : t.user_type === "developer"
                    ? `/developer/profile/${t.authorId}`
                    : `/jobs/profile/${t.authorId}`
                } 
                className="flex items-center gap-3 group hover:opacity-85 transition-opacity no-underline text-inherit min-w-0"
              >
                <AvatarEl />
                <div className="author-info min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[140px] inline-block">
                      {t.author}
                    </span>
                    {t.isVerified && <VerifiedBadge size={14} className="shrink-0" />}
                    {t.isOwn && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">You</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.role}</p>
                  {t.roleBadge && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 mt-1 inline-flex items-center">
                      {getRoleIcon(t.user_type)}
                      {t.roleBadge}
                    </span>
                  )}
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 min-w-0">
                <AvatarEl />
                <div className="author-info min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[140px] inline-block">
                      {t.author}
                    </span>
                    {t.isVerified && <VerifiedBadge size={14} className="shrink-0" />}
                    {t.isOwn && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">You</span>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.role}</p>
                  {t.roleBadge && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 mt-1 inline-flex items-center">
                      {getRoleIcon(t.user_type)}
                      {t.roleBadge}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Edit / Delete actions if review is user's own */}
          {t.isOwn && (
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 cursor-pointer flex items-center justify-center transition-colors"
                title="Edit review"
              >
                <Pen size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(t); }}
                className="p-1.5 rounded-lg bg-red-500/10 dark:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 cursor-pointer flex items-center justify-center transition-colors"
                title="Delete review"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};


const Testimonials = ({ userTypeFilter }) => {
  const [items, setItems] = useState([]);
  const [apiStats, setApiStats] = useState({ avg_rating: 5.0, total_reviews: 0 });
  const [filterTab, setFilterTab] = useState("all");
  const [companyNames, setCompanyNames] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingReview, setEditingReview] = useState(null);

  const isRecruiter = !!localStorage.getItem('vish_jwt');
  const isDeveloper = !!localStorage.getItem('portal_jwt');
  const isSeeker = !!localStorage.getItem('vish_seeker_token');
  const isLoggedIn = isRecruiter || isDeveloper || isSeeker;
  const userRole = isRecruiter ? 'recruiter' : isDeveloper ? 'developer' : 'job_seeker';

  const loadReviews = (retryCount = 0) => {
    const params = userTypeFilter ? { user_type: userTypeFilter } : {};
    publicAPI.listReviews(params)
      .then((data) => {
        if (data.stats) {
          setApiStats(data.stats);
        }
        if (data.reviews && data.reviews.length > 0) {
          const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
          const sizes = ["large", "small", "medium", "medium", "large", "small"];
          const mapped = data.reviews.map((r, idx) => ({
            id: r.id,
            quote: r.text,
            author: r.author?.full_name || "Verified Professional",
            authorId: r.author?.id && r.author?.id !== "unknown" ? r.author.id : null,
            companyId: r.company_id || r.author?.company_id || null,
            avatarPath: r.author?.avatar_path || null,
            isVerified: r.author?.is_verified,
            role: r.author?.headline || (r.company_name ? `Review for ${r.company_name}` : "Verified Member"),
            roleBadge: r.author?.role_badge || (r.user_type ? r.user_type.replace('_', ' ').toUpperCase() : "MEMBER"),
            targetBadge: r.company_name ? r.company_name : "Between Platform",
            initials: r.author?.full_name?.charAt(0) || "V",
            rating: r.rating || 5,
            review_type: r.review_type,
            user_type: r.user_type,
            createdAt: r.created_at,
            isOwn: r.is_own,
            officialReply: r.official_reply || null,
            rawReview: r,
            color: colors[idx % colors.length],
            size: sizes[idx % sizes.length],
          }));

          // Sort so logged-in user's own reviews appear first
          mapped.sort((a, b) => (b.isOwn ? 1 : 0) - (a.isOwn ? 1 : 0));

          setItems(mapped);
        } else {
          setItems([]);
        }
      })
      .catch((err) => {
        console.warn("Public reviews fetch failed (server restarting?), retrying in 3s...", err);
        if (retryCount < 3) {
          setTimeout(() => loadReviews(retryCount + 1), 3000);
        }
      });
  };

  useEffect(() => {
    loadReviews();

    publicAPI.listCompanies()
      .then((data) => {
        const comps = data?.companies || (Array.isArray(data) ? data : []);
        if (comps.length > 0) {
          setCompanyNames(comps.slice(0, 6).map(c => c.name?.toUpperCase() || ""));
        }
      })
      .catch(() => {});
  }, []);

  const handleDeleteReview = async (t) => {
    try {
      const reviewId = typeof t === "object" ? t.id : t;
      const targetRole = typeof t === "object" ? t.user_type : (isRecruiter ? 'recruiter' : isDeveloper ? 'developer' : 'job_seeker');
      if (targetRole === 'recruiter') {
        await recruiterAPI.deleteReview(reviewId);
      } else if (targetRole === 'developer') {
        await portalReviews.deleteReview(reviewId);
      } else {
        await seekerAPI.deleteReview(reviewId);
      }
      toast.success("Review deleted successfully");
      loadReviews();
    } catch (err) {
      toast.error(err.message || "Failed to delete review");
    }
  };

  const handleEditReview = (t) => {
    setEditingReview({
      id: t.id,
      rating: t.rating,
      text: t.quote,
      company_id: t.rawReview?.company_id,
      user_type: t.user_type,
    });
    setShowReviewModal(true);
  };

  const platformCount = items.filter(t => t.review_type === "platform" || !t.review_type).length;
  const companyCount = items.filter(t => t.review_type === "company").length;
  const devCount = items.filter(t => t.user_type === "developer").length;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredItems = items.filter(t => {
    if (filterTab === "platform") return t.review_type === "platform" || !t.review_type;
    if (filterTab === "company") return t.review_type === "company";
    if (filterTab === "developer") return t.user_type === "developer";
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  const totalReviewsCount = items.length || apiStats.total_reviews || 0;

  const avgRating = items.length
    ? (items.reduce((acc, curr) => acc + (curr.rating || 5), 0) / items.length).toFixed(1)
    : (apiStats.avg_rating ? Number(apiStats.avg_rating).toFixed(1) : "5.0");

  const highRatingCount = items.filter(t => (t.rating || 5) >= 4).length;
  const recommendPct = items.length
    ? Math.round((highRatingCount / items.length) * 100)
    : 100;

  const verifiedAuthorsCount = items.filter(t => t.isVerified).length;
  const verifiedProfilesPct = items.length
    ? Math.round((verifiedAuthorsCount / items.length) * 100)
    : 100;

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  };

  return (
    <section className="testimonials-section">
      <div className="testimonials-bg-glow" />
      
      <div className="testimonials-header">
        <motion.span 
          className="testimonials-label"
          initial={{ opacity: 0, letterSpacing: "0.5em" }}
          whileInView={{ opacity: 1, letterSpacing: "0.3em" }}
          transition={{ duration: 1 }}
        >
          Voices of Impact
        </motion.span>
        <motion.h2 
          className="testimonials-title"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.21, 0.45, 0.32, 0.9] }}
        >
          Trusted by Innovative Teams & Builders
        </motion.h2>

        {/* Rating Summary Bar */}
        <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 font-medium text-xs">
            <span className="text-base font-black text-amber-500">{avgRating}</span>
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill={i < Math.round(Number(avgRating)) ? "#f59e0b" : "transparent"} color="#f59e0b" opacity={i < Math.round(Number(avgRating)) ? 1 : 0.3} />
              ))}
            </div>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 ml-1">
              {totalReviewsCount} {totalReviewsCount === 1 ? 'Verified Review' : 'Verified Reviews'}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ThumbsUp size={14} /> {recommendPct}% Recommend Between
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ShieldCheck size={14} /> {verifiedProfilesPct}% Verified Profiles
          </div>
        </div>

        {/* Filter Tabs & Write Review Button */}
        <div className="flex gap-2 justify-center mt-6 flex-wrap items-center">
          {[
            { id: "all", label: `All Testimonials (${items.length})` },
            { id: "platform", label: `Between Platform (${platformCount})` },
            { id: "company", label: `Company Reviews (${companyCount})` },
            { id: "developer", label: `Developer API (${devCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterTab(tab.id);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold cursor-pointer transition-all border ${
                filterTab === tab.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                  : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/15 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {isLoggedIn && (
            <button
              onClick={() => {
                setEditingReview(null);
                setShowReviewModal(true);
              }}
              className="px-4 py-2 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-md shadow-emerald-500/25 inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <MessageSquareQuote size={14} /> Write a Review
            </button>
          )}
        </div>
      </div>

      <div className="testimonials-grid">
        {paginatedItems.map((t, i) => (
          <TestimonialCard
            key={t.id || i}
            t={t}
            index={i}
            timeAgo={timeAgo}
            onEdit={handleEditReview}
            onDelete={handleDeleteReview}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8 mb-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`h-8 w-8 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                currentPage === page
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25"
                  : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-gray-700 dark:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Company Logo Strip */}
      <div className="company-logo-strip">
        {(companyNames.length > 0 ? companyNames : ["META", "GOOGLE", "STRIPE", "VERCEL", "LINEAR", "OPENAI"]).map((logo, idx) => (
          <span key={idx} className="company-logo">
            {logo}
          </span>
        ))}
      </div>

      {showReviewModal && (
        <WriteReviewModal
          editingReview={editingReview}
          onClose={() => {
            setShowReviewModal(false);
            setEditingReview(null);
          }}
          onSuccess={() => {
            loadReviews();
            setShowReviewModal(false);
            setEditingReview(null);
          }}
        />
      )}
    </section>
  );
};

export default Testimonials;

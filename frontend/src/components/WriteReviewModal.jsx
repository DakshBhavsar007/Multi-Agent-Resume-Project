import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquareQuote, Loader2, CheckCircle2, Building2, User, Code2, ShieldCheck } from 'lucide-react';
import { seekerAPI, recruiterAPI, publicAPI } from '../lib/api';
import { portalReviews } from '../lib/portalApi';
import toast from 'react-hot-toast';

export default function WriteReviewModal({
  isOpen = true,
  onClose,
  onSubmit,
  editingReview = null,
  companyId = null,
  companyName = null,
  userRole = "job_seeker",
  customSubmit = null,
}) {
  const [selectedRole, setSelectedRole] = useState(editingReview?.user_type || userRole || "job_seeker");
  const [rating, setRating] = useState(editingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState(editingReview?.text || '');
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || editingReview?.company_id || '');
  const [companiesList, setCompaniesList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Identify logged in accounts
  const isSeekerLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('vish_seeker_token');
  const isRecruiterLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('vish_jwt');
  const isDeveloperLoggedIn = typeof window !== 'undefined' && !!localStorage.getItem('portal_jwt');

  let seekerName = "";
  let recruiterName = "";
  let developerName = "";

  try {
    const s = localStorage.getItem('vish_seeker_data');
    if (s) seekerName = JSON.parse(s)?.full_name || "Job Seeker";
    const r = localStorage.getItem('between_user');
    if (r) recruiterName = JSON.parse(r)?.name || "Recruiter";
    const d = localStorage.getItem('portal_user');
    if (d) developerName = JSON.parse(d)?.full_name || "Developer";
  } catch (e) {}

  useEffect(() => {
    if (!companyId && !editingReview && selectedRole === "job_seeker") {
      publicAPI.listCompanies({ per_page: 50 })
        .then(data => setCompaniesList(data.companies || []))
        .catch(() => {});
    }
  }, [companyId, editingReview, selectedRole]);

  useEffect(() => {
    if (editingReview) {
      setRating(editingReview.rating || 5);
      setText(editingReview.text || '');
      setSelectedCompanyId(editingReview.company_id || '');
      if (editingReview.user_type) setSelectedRole(editingReview.user_type);
    } else {
      setRating(5);
      setText('');
      setSelectedCompanyId(companyId || '');
      setSelectedRole(userRole || "job_seeker");
    }
  }, [editingReview, companyId, userRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 10) {
      toast.error('Review text must be at least 10 characters long.');
      return;
    }

    if (selectedRole === 'job_seeker' && !isSeekerLoggedIn) {
      toast.error('Please log in to a Job Seeker account to post a review as a Job Seeker.');
      return;
    }
    if (selectedRole === 'recruiter' && !isRecruiterLoggedIn) {
      toast.error('Please log in to a Recruiter account to post a review as a Recruiter.');
      return;
    }
    if (selectedRole === 'developer' && !isDeveloperLoggedIn) {
      toast.error('Please log in to a Developer account to post a review as a Developer.');
      return;
    }

    setLoading(true);
    try {
      if (customSubmit) {
        const res = await customSubmit({ rating, text: text.trim(), company_id: selectedCompanyId || null, role: selectedRole });
        toast.success('Review submitted successfully!');
        if (onSubmit) onSubmit(res);
      } else if (editingReview) {
        let updated;
        if (selectedRole === 'recruiter') {
          updated = await recruiterAPI.updateReview(editingReview.id, { rating, text: text.trim() });
        } else if (selectedRole === 'developer') {
          updated = await portalReviews.updateReview(editingReview.id, { rating, text: text.trim() });
        } else {
          updated = await seekerAPI.updateReview(editingReview.id, { rating, text: text.trim() });
        }
        toast.success('Review updated successfully!');
        if (onSubmit) onSubmit(updated);
      } else {
        let created;
        if (selectedRole === 'recruiter') {
          created = await recruiterAPI.createReview({ rating, text: text.trim() });
        } else if (selectedRole === 'developer') {
          created = await portalReviews.createReview({ rating, text: text.trim() });
        } else {
          created = await seekerAPI.createReview({
            company_id: selectedCompanyId || null,
            rating,
            text: text.trim(),
          });
        }
        toast.success('Review submitted successfully!');
        if (onSubmit) onSubmit(created);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#141417] text-charcoal dark:text-gray-100 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <MessageSquareQuote size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-charcoal dark:text-white">
                {editingReview ? 'Edit Your Review' : companyName ? `Review ${companyName}` : 'Share Your Experience'}
              </h3>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-400">
                {companyName ? `Rate your experience with ${companyName}` : 'Help others by sharing your genuine feedback'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-charcoal dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Account Role Selector */}
          {!editingReview && (
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                Posting As
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: "job_seeker",
                    label: "Job Seeker",
                    icon: User,
                    sub: seekerName || "Candidate",
                    isLoggedIn: isSeekerLoggedIn
                  },
                  {
                    id: "developer",
                    label: "Developer",
                    icon: Code2,
                    sub: developerName || "Developer API",
                    isLoggedIn: isDeveloperLoggedIn
                  },
                  {
                    id: "recruiter",
                    label: "Recruiter",
                    icon: Building2,
                    sub: recruiterName || "Company",
                    isLoggedIn: isRecruiterLoggedIn
                  },
                ].map((role) => {
                  const isSelected = selectedRole === role.id;
                  const IconComponent = role.icon;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRole(role.id)}
                      className={`relative p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-black dark:border-white bg-black/5 dark:bg-white/10 ring-1 ring-black dark:ring-white"
                          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <IconComponent
                          size={16}
                          className={isSelected ? "text-amber-500" : "text-gray-400"}
                        />
                        {role.isLoggedIn && (
                          <ShieldCheck size={13} className="text-emerald-500" title="Account Logged In" />
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-extrabold text-charcoal dark:text-gray-100 flex items-center gap-1">
                          {role.label}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate mt-0.5 font-medium">
                          {role.isLoggedIn ? role.sub : "Not Logged In"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Target Selection (Platform or Company) for Job Seekers */}
          {!companyId && !editingReview && selectedRole === "job_seeker" && companiesList.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Building2 size={13} className="text-gray-400" /> Review Target
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-bold text-charcoal dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all"
              >
                <option value="">General Platform Feedback (Between)</option>
                {companiesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    Company: {c.name} ({c.industry || 'Technology'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rating Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
              Overall Rating
            </label>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 justify-center">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                  >
                    <Star
                      size={28}
                      className={`${
                        active ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-700 fill-gray-100 dark:fill-gray-800'
                      } transition-colors`}
                    />
                  </button>
                );
              })}
              <span className="ml-3 text-sm font-extrabold text-charcoal dark:text-white min-w-[50px]">
                {hoverRating || rating} / 5
              </span>
            </div>
          </div>

          {/* Review Text Area */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Your Review
              </label>
              <span className={`text-[11px] font-semibold ${text.length < 10 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {text.length} / 2000 chars {text.length < 10 && '(min 10)'}
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you like or dislike? How was the hiring process or platform experience?"
              rows={5}
              maxLength={2000}
              required
              className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white outline-none text-sm text-charcoal dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || text.trim().length < 10}
              className="px-6 py-2.5 rounded-xl bg-charcoal dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 text-xs font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>{editingReview ? 'Save Changes' : 'Submit Review'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

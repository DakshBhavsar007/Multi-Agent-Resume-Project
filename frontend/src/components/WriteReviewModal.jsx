import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquareQuote, Loader2, CheckCircle2, Building2 } from 'lucide-react';
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
  const [rating, setRating] = useState(editingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState(editingReview?.text || '');
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || editingReview?.company_id || '');
  const [companiesList, setCompaniesList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId && !editingReview && userRole === "job_seeker") {
      publicAPI.listCompanies({ per_page: 50 })
        .then(data => setCompaniesList(data.companies || []))
        .catch(() => {});
    }
  }, [companyId, editingReview, userRole]);

  useEffect(() => {
    if (editingReview) {
      setRating(editingReview.rating || 5);
      setText(editingReview.text || '');
      setSelectedCompanyId(editingReview.company_id || '');
    } else {
      setRating(5);
      setText('');
      setSelectedCompanyId(companyId || '');
    }
  }, [editingReview, companyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 10) {
      toast.error('Review text must be at least 10 characters long.');
      return;
    }
    setLoading(true);
    try {
      if (customSubmit) {
        const res = await customSubmit({ rating, text: text.trim(), company_id: selectedCompanyId || null });
        toast.success('Review submitted successfully!');
        if (onSubmit) onSubmit(res);
      } else if (editingReview) {
        let updated;
        if (userRole === 'recruiter') {
          updated = await recruiterAPI.updateReview(editingReview.id, { rating, text: text.trim() });
        } else if (userRole === 'developer') {
          updated = await portalReviews.updateReview(editingReview.id, { rating, text: text.trim() });
        } else {
          updated = await seekerAPI.updateReview(editingReview.id, { rating, text: text.trim() });
        }
        toast.success('Review updated successfully!');
        if (onSubmit) onSubmit(updated);
      } else {
        let created;
        if (userRole === 'recruiter') {
          created = await recruiterAPI.createReview({ rating, text: text.trim() });
        } else if (userRole === 'developer') {
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
          {/* Target Selection (Platform or Company) */}
          {!companyId && !editingReview && companiesList.length > 0 && (
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
                    className="p-1 transition-transform hover:scale-110 focus:outline-none"
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
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || text.trim().length < 10}
              className="px-6 py-2.5 rounded-xl bg-charcoal dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200 text-xs font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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

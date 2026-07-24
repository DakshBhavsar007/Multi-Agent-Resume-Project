import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquareQuote, Loader2, CheckCircle2 } from 'lucide-react';
import { seekerAPI } from '../lib/api';
import toast from 'react-hot-toast';

export default function WriteReviewModal({ isOpen = true, onClose, onSubmit, editingReview = null, companyId = null, companyName = null }) {
  const [rating, setRating] = useState(editingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState(editingReview?.text || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingReview) {
      setRating(editingReview.rating || 5);
      setText(editingReview.text || '');
    } else {
      setRating(5);
      setText('');
    }
  }, [editingReview]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (text.trim().length < 10) {
      toast.error('Review text must be at least 10 characters long.');
      return;
    }
    setLoading(true);
    try {
      if (editingReview) {
        const updated = await seekerAPI.updateReview(editingReview.id, {
          rating,
          text: text.trim(),
        });
        toast.success('Review updated successfully!');
        if (onSubmit) onSubmit(updated);
      } else {
        const created = await seekerAPI.createReview({
          company_id: companyId || null,
          rating,
          text: text.trim(),
        });
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
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 md:p-8 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
              <MessageSquareQuote size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-charcoal">
                {editingReview ? 'Edit Your Review' : companyName ? `Review ${companyName}` : 'Share Your Experience'}
              </h3>
              <p className="text-xs font-medium text-gray-400">
                {companyName ? `Rate your experience with ${companyName}` : 'Help others by sharing your genuine feedback'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-charcoal hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Rating Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Overall Rating
            </label>
            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-100 justify-center">
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
                        active ? 'fill-amber-400 text-amber-400' : 'text-gray-300 fill-gray-100'
                      } transition-colors`}
                    />
                  </button>
                );
              })}
              <span className="ml-3 text-sm font-extrabold text-charcoal min-w-[50px]">
                {hoverRating || rating} / 5
              </span>
            </div>
          </div>

          {/* Review Text Area */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Your Review
              </label>
              <span className={`text-[11px] font-semibold ${text.length < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
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
              className="w-full p-4 rounded-2xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm text-charcoal placeholder-gray-400 resize-none transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || text.trim().length < 10}
              className="px-6 py-2.5 rounded-xl bg-charcoal hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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

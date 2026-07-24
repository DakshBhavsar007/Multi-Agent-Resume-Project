import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header, Footer } from '../../components/user/site-chrome';
import VerifiedBadge from '../../components/VerifiedBadge';
import { publicAPI } from '../../lib/api';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { MapPin, Briefcase, Star, ArrowLeft, Calendar, Sparkles, MessageSquareQuote } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SeekerPublicProfile() {
  const { seekerId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seekerId) return;
    setLoading(true);
    publicAPI.getSeekerProfile(seekerId)
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load user profile");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [seekerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
          <LoadingSkeleton rows={6} />
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl font-bold text-charcoal">Profile Not Found</h2>
          <p className="text-sm text-gray-500 mt-2">The requested user profile does not exist or is unavailable.</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-charcoal text-white text-xs font-bold">
            <ArrowLeft size={14} /> Back to Home
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full space-y-8">
        {/* Back Link */}
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-charcoal transition-colors">
          <ArrowLeft size={14} /> Back
        </Link>

        {/* Profile Card Header */}
        <div className="bg-white border border-gray-200/80 rounded-3xl p-8 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {profile.avatar_path ? (
              <img
                src={profile.avatar_path}
                alt={profile.full_name}
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-100 shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-3xl font-extrabold shadow-md">
                {profile.full_name?.charAt(0)}
              </div>
            )}

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-charcoal tracking-tight">
                  {profile.full_name}
                </h1>
                {profile.is_verified && (
                  <VerifiedBadge size={22} title="Verified Job Seeker Account" />
                )}
              </div>

              {profile.headline && (
                <p className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                  <Briefcase size={14} className="text-gray-400 shrink-0" />
                  <span>{profile.headline}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-500 pt-1">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-gray-400" />
                    <span>{profile.location}</span>
                  </span>
                )}
                {profile.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-gray-400" />
                    <span>Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Skills Badges */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" /> Skills & Expertise
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="bg-gray-50 border border-gray-200 text-charcoal text-xs font-semibold px-3 py-1 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Public Reviews Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-charcoal flex items-center gap-2">
            <MessageSquareQuote size={20} className="text-blue-600" />
            <span>Reviews & Feedback ({profile.reviews?.length || 0})</span>
          </h2>

          {!profile.reviews || profile.reviews.length === 0 ? (
            <div className="bg-white border border-gray-200/80 rounded-2xl p-6 text-center text-sm text-gray-500">
              No public reviews submitted yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {profile.reviews.map((rev) => (
                <div key={rev.id} className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                      {rev.company_name}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          className={s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-charcoal leading-relaxed whitespace-pre-wrap">
                    "{rev.text}"
                  </p>
                  <div className="text-[11px] text-gray-400 font-medium text-right">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

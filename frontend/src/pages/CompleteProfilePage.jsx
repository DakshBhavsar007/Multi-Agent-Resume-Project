import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSeekerAuthStore } from '../stores/seekerAuthStore';
import { usePortalAuthStore } from '../stores/portalAuthStore';
import { authAPI, seekerAPI } from '../lib/api';
import { portalAuth } from '../lib/portalApi';
import { toast } from 'react-hot-toast';
import { Loader2, ShieldCheck, Mail, User, Phone, MapPin, Briefcase, Globe, Landmark, Users, ArrowRight } from 'lucide-react';
import { LocationSelector } from '../components/ui/LocationSelector';
import VerificationModal from '../components/VerificationModal';

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const recruiterAuth = useAuthStore();
  const seekerAuth = useSeekerAuthStore();
  const developerAuth = usePortalAuthStore();

  const [loading, setLoading] = useState(false);
  const [oauthData, setOauthData] = useState(null);
  
  // Seeker Form State
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [headline, setHeadline] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState(null);

  const handlePhoneChange = (val) => {
    setPhone(val);
    if (phoneVerified) {
      setPhoneVerified(false);
    }
  };

  // Developer Form State
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Recruiter Form State
  const [industry, setIndustry] = useState('');
  const [hqLocation, setHqLocation] = useState('');
  const [companySize, setCompanySize] = useState('11-50');
  const [recruiterWebsite, setRecruiterWebsite] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('temp_oauth_data');
    if (!raw) {
      toast.error('No pending authentication session found');
      navigate('/login');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setOauthData(parsed);
      
      // Pre-fill fields if they happen to already exist
      if (parsed.role === 'seeker' && parsed.data?.seeker) {
        setPhone(parsed.data.seeker.phone || '');
        setLocation(parsed.data.seeker.location || '');
        setHeadline(parsed.data.seeker.headline || '');
        setPhoneVerified(!!parsed.data.seeker.phone_verified);
      } else if (parsed.role === 'developer' && parsed.data) {
        setWebsiteUrl(parsed.data.website_url || '');
      } else if (parsed.role === 'recruiter' && parsed.data) {
        setIndustry(parsed.data.industry || '');
        setHqLocation(parsed.data.hq_location || '');
        setCompanySize(parsed.data.company_size || '11-50');
        setRecruiterWebsite(parsed.data.website_url || '');
      }
    } catch (e) {
      toast.error('Failed to restore login session');
      navigate('/login');
    }
  }, [navigate]);

  if (!oauthData) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center font-sans">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  const { role, data } = oauthData;
  const email = role === 'seeker' ? data.seeker?.email : data.email;
  const name = role === 'seeker' ? data.seeker?.full_name : (data.name || data.company_name);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (role === 'seeker') {
        if (!phone.trim() || !location.trim() || !headline.trim()) {
          toast.error('All details are required');
          setLoading(false);
          return;
        }

        // Temporarily write token so request headers catch it
        localStorage.setItem('vish_seeker_token', data.seeker_token);
        
        const updated = await seekerAPI.updateProfile({
          phone: phone.trim(),
          location: location.trim(),
          headline: headline.trim()
        });

        // Save final logged in state
        const finalAuthData = {
          seeker_token: data.seeker_token,
          seeker: { ...data.seeker, ...updated, requires_profile_completion: false }
        };
        seekerAuth.setAuth(finalAuthData);
        sessionStorage.removeItem('temp_oauth_data');
        toast.success(`Welcome, ${name}! Your profile is now set up.`);
        navigate('/jobs/dashboard');

      } else if (role === 'developer') {
        if (!websiteUrl.trim()) {
          toast.error('Website URL is required');
          setLoading(false);
          return;
        }

        localStorage.setItem('portal_jwt', data.jwt_token);

        const updated = await portalAuth.updateProfile({
          website_url: websiteUrl.trim()
        });

        const finalAuthData = {
          ...data,
          ...updated,
          requires_profile_completion: false
        };
        developerAuth.setAuth(finalAuthData);
        localStorage.setItem('portal_dev', JSON.stringify(finalAuthData));
        sessionStorage.removeItem('temp_oauth_data');
        toast.success('Developer profile configured successfully!');
        navigate('/developer/portal/dashboard');

      } else if (role === 'recruiter') {
        if (!industry.trim() || !hqLocation.trim() || !companySize.trim() || !recruiterWebsite.trim()) {
          toast.error('All fields are required');
          setLoading(false);
          return;
        }

        localStorage.setItem('vish_jwt', data.jwt_token);

        const updated = await authAPI.updateProfile({
          industry: industry.trim(),
          hq_location: hqLocation.trim(),
          company_size: companySize,
          website_url: recruiterWebsite.trim()
        });

        const finalAuthData = {
          ...data,
          ...updated,
          requires_profile_completion: false
        };
        
        recruiterAuth.setAuth(finalAuthData);
        sessionStorage.removeItem('temp_oauth_data');
        toast.success('Recruiter organization profile set up!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to complete profile registration');
      // Clean up temporary tokens on failure
      if (role === 'seeker') localStorage.removeItem('vish_seeker_token');
      if (role === 'developer') localStorage.removeItem('portal_jwt');
      if (role === 'recruiter') localStorage.removeItem('vish_jwt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4 font-sans text-zinc-100 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-lg bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/25 rounded-2xl flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <ShieldCheck size={24} />
          </div>
          <span className="text-[11px] font-black tracking-widest text-zinc-500 uppercase">Profile Verification</span>
          <h1 className="text-2xl font-black text-white mt-1">Complete Your Details</h1>
          <p className="text-xs text-zinc-400 mt-2 max-w-sm">
            You signed in using {role === 'seeker' ? 'Google/GitHub' : 'Social SSO'}. Please complete the required profile details below to access your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email (Prefilled & Disabled) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <input
                type="email"
                value={email || ''}
                disabled
                className="w-full text-xs p-3.5 pl-11 bg-zinc-950/50 border border-zinc-800/60 rounded-xl text-zinc-500 cursor-not-allowed focus:outline-none"
              />
            </div>
          </div>

          {/* Name (Prefilled & Disabled) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              {role === 'recruiter' ? 'Company Name' : 'Full Name'}
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
              <input
                type="text"
                value={name || ''}
                disabled
                className="w-full text-xs p-3.5 pl-11 bg-zinc-950/50 border border-zinc-800/60 rounded-xl text-zinc-500 cursor-not-allowed focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-zinc-800/40 my-6"></div>

          {/* Role specific inputs */}
          {role === 'seeker' && (
            <>
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Phone Number*</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full text-xs p-3.5 pl-11 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                    />
                  </div>
                  {phone && (
                    <button
                      type="button"
                      disabled={phoneVerified}
                      onClick={() => {
                        if (!phone.trim()) {
                          toast.error("Please enter a phone number first");
                          return;
                        }
                        setVerifyTarget({ type: 'phone', value: phone.trim() });
                      }}
                      className={`px-4 text-xs font-bold rounded-xl transition-all ${
                        phoneVerified 
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 cursor-default'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {phoneVerified ? 'Verified ✓' : 'Verify'}
                    </button>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5 location-selector-complete-profile">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Current Location*</label>
                <LocationSelector
                  value={location}
                  onChange={setLocation}
                  isLight={false}
                />
              </div>

              {/* Headline */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Professional Headline*</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Full Stack Developer | React & Python"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full text-xs p-3.5 pl-11 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {role === 'developer' && (
            <>
              {/* Website URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Website / Portal URL*</label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="url"
                    required
                    placeholder="e.g. https://yourcompany.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full text-xs p-3.5 pl-11 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {role === 'recruiter' && (
            <>
              {/* Recruiter Website */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Company Website*</label>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="url"
                    required
                    placeholder="e.g. https://yourcompany.com"
                    value={recruiterWebsite}
                    onChange={(e) => setRecruiterWebsite(e.target.value)}
                    className="w-full text-xs p-3.5 pl-11 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Industry */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Industry Segment*</label>
                <div className="relative">
                  <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Information Technology, FinTech"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full text-xs p-3.5 pl-11 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* HQ Location */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">HQ Location*</label>
                <LocationSelector
                  value={hqLocation}
                  onChange={setHqLocation}
                  isLight={false}
                />
              </div>

              {/* Company Size */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Company Size*</label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full text-xs p-3.5 pl-11 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-white focus:border-blue-500 focus:outline-none transition-colors appearance-none"
                  >
                    <option value="1-10" className="bg-zinc-900">1-10 employees</option>
                    <option value="11-50" className="bg-zinc-900">11-50 employees</option>
                    <option value="51-200" className="bg-zinc-900">51-200 employees</option>
                    <option value="201-500" className="bg-zinc-900">201-500 employees</option>
                    <option value="501+" className="bg-zinc-900">501+ employees</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 text-xs uppercase tracking-wider"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Saving details...
              </>
            ) : (
              <>
                Complete Registration
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
      {verifyTarget && (
        <VerificationModal
          isOpen={true}
          onClose={() => setVerifyTarget(null)}
          type={verifyTarget.type}
          value={verifyTarget.value}
          role="seeker"
          userEmail={email}
          onSuccess={() => {
            setPhoneVerified(true);
            toast.success('Phone number verified successfully!');
          }}
        />
      )}
    </div>
  );
}

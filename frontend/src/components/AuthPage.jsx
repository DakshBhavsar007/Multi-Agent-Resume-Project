"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Eye, 
  EyeOff, 
  Briefcase, 
  Code2, 
  GraduationCap, 
  Check, 
  Copy, 
  ArrowLeft, 
  Loader2, 
  ShieldAlert,
  ArrowRight,
  Sparkles,
  MapPin,
  FileText,
  User
} from 'lucide-react';
import { authAPI, seekerAPI } from '../lib/api';
import { portalAuth, portalBilling } from '../lib/portalApi';
import { useAuthStore } from '../stores/authStore';
import { usePortalAuthStore } from '../stores/portalAuthStore';
import { useSeekerAuthStore } from '../stores/seekerAuthStore';
import './AuthPage.css';

const AntigravityGrid = () => {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles.current = Array.from({ length: 150 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        speedX: Math.random() * 0.4 - 0.2,
        speedY: Math.random() * 0.4 - 0.2,
        life: Math.random()
      }));
    };

    const handleMouseMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    handleResize();

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const gridSize = 40;
      const columns = Math.ceil(canvas.width / gridSize);
      const rows = Math.ceil(canvas.height / gridSize);
      const offX = (mouse.current.x - canvas.width/2) * 0.03;
      const offY = (mouse.current.y - canvas.height/2) * 0.03;

      for (let i = -1; i <= columns + 1; i++) {
        for (let j = -1; j <= rows + 1; j++) {
          const x = i * gridSize + offX;
          const y = j * gridSize + offY;
          const dx = mouse.current.x - x;
          const dy = mouse.current.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const rawOpacity = Math.max(0, 1 - dist / 400);
          const contrastOpacity = Math.pow(rawOpacity, 3);
          
          if (contrastOpacity > 0.001) {
            ctx.fillStyle = `rgba(59, 130, 246, ${contrastOpacity * 0.9})`;
            ctx.beginPath();
            ctx.arc(x, y, 2.5 * contrastOpacity + 0.5, 0, Math.PI * 2);
            ctx.fill();
          } else {
             ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
             ctx.beginPath();
             ctx.arc(x, y, 0.5, 0, Math.PI * 2);
             ctx.fill();
          }
        }
      }

      particles.current.forEach(p => {
        p.x += p.speedX; p.y += p.speedY; p.life += 0.003;
        if (p.life > 1) p.life = 0;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        const dist = Math.sqrt(Math.pow(mouse.current.x - p.x, 2) + Math.pow(mouse.current.y - p.y, 2));
        const pInfluence = Math.max(0, 1 - dist / 300);
        const pOpacity = (Math.sin(p.life * Math.PI) * 0.2) + (pInfluence * 0.6);
        ctx.fillStyle = `rgba(59, 130, 246, ${pOpacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (pInfluence * 2), 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(drawGrid);
    };
    drawGrid();
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />;
};

const AuthPage = ({ isLogin: initialIsLogin = true }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Role Selection
  const [role, setRole] = useState(() => {
    const path = window.location.pathname;
    if (path.includes('/developer')) return 'developer';
    if (path.includes('/jobs')) return 'seeker';
    return 'recruiter';
  });
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [locationField, setLocationField] = useState('');
  const [headline, setHeadline] = useState('');

  // Flows State
  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('starter');
  const [apiKeys, setApiKeys] = useState(null); // Recruiter keys
  const [apiKeysData, setApiKeysData] = useState(null); // Developer keys
  const [savedKeys, setSavedKeys] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedTestPublic, setCopiedTestPublic] = useState(false);
  const [copiedTestSecret, setCopiedTestSecret] = useState(false);
  const [showTestSecret, setShowTestSecret] = useState(false);
  const [showLiveSecret, setShowLiveSecret] = useState(false);

  const recruiterAuth = useAuthStore();
  const developerAuth = usePortalAuthStore();
  const seekerAuth = useSeekerAuthStore();
  const googleClientRef = useRef(null);
  
  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  // Pre-select Role based on URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/developer')) {
      setRole('developer');
    } else if (path.includes('/jobs')) {
      setRole('seeker');
    } else {
      setRole('recruiter');
    }
    setStep(1);
  }, [location.pathname]);

  // Load Developer Plans
  useEffect(() => {
    if (role === 'developer' && !isLogin) {
      portalBilling.plans()
        .then(d => { if (d && d.length > 0) setPlans(d); })
        .catch(() => {
          setPlans([
            { id: "free", name: "Free", price: 0, features: ["100 free parses/month", "Community support", "Basic formatting", "No SLA"] },
            { id: "starter", name: "Starter", price: 2999, features: ["1000 parses/month", "Email support", "All output formats", "99% uptime"] },
            { id: "business", name: "Business", price: 9999, features: ["10000 parses/month", "Priority support", "Custom prompts", "99.9% uptime SLA"] }
          ]);
        });
    }
  }, [role, isLogin]);

  // Google SSO Client Initialization
  useEffect(() => {
    const initClient = () => {
      if (window.google) {
        googleClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          callback: async (tokenResponse) => {
            const currentRole = roleRef.current;
            if (tokenResponse && tokenResponse.access_token) {
              setLoading(true);
              try {
                if (currentRole === 'recruiter') {
                  const data = await authAPI.googleLogin(tokenResponse.access_token);
                  recruiterAuth.setAuth(data);
                  toast.success("Signed in successfully with Google!");
                  navigate('/dashboard');
                } else if (currentRole === 'developer') {
                  const data = await portalAuth.googleLogin(tokenResponse.access_token);
                  if (data.is_new) {
                    setApiKeysData(data);
                    toast.success("Account created successfully with Google!");
                    setStep(3);
                  } else {
                    developerAuth.setAuth(data);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("portal_jwt", data.jwt_token);
                      localStorage.setItem("portal_dev", JSON.stringify(data));
                    }
                    toast.success("Welcome back! Signed in with Google.");
                    navigate("/developer/portal/dashboard");
                  }
                } else if (currentRole === 'seeker') {
                  const data = await seekerAPI.googleLogin(tokenResponse.access_token);
                  seekerAuth.setAuth(data);
                  toast.success(`Welcome, ${data.seeker.full_name}!`);
                  navigate('/jobs/dashboard');
                }
              } catch (err) {
                toast.error(err.message || "Google Authentication failed");
              } finally {
                setLoading(false);
              }
            }
          }
        });
      }
    };

    if (window.google) {
      initClient();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initClient;
      document.body.appendChild(script);
      return () => {
        try {
          document.body.removeChild(script);
        } catch(e) {}
      };
    }
  }, []);

  // Checks for redirects if logged in
  useEffect(() => {
    if (isLogin) {
      if (role === 'recruiter' && recruiterAuth.jwt) {
        navigate('/dashboard', { replace: true });
      } else if (role === 'developer' && developerAuth.jwt) {
        navigate('/developer/portal/dashboard', { replace: true });
      } else if (role === 'seeker' && seekerAuth.seekerToken) {
        navigate('/jobs/dashboard', { replace: true });
      }
    }
  }, [role, isLogin, recruiterAuth.jwt, developerAuth.jwt, seekerAuth.seekerToken, navigate]);

  const handleGoogleLogin = () => {
    if (googleClientRef.current) {
      googleClientRef.current.requestAccessToken();
    } else {
      toast.error("Google Auth is loading. Please try again in a moment.");
    }
  };

  const handleGitHubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/github/callback');
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user,user:email&state=${role}`;
  };

  // Submit Handler for Sign In / Step 1 Sign Up
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        // Sign In Flow
        if (role === 'recruiter') {
          const data = await authAPI.login(email, password);
          recruiterAuth.setAuth(data);
          toast.success("Welcome back!");
          navigate('/dashboard');
        } else if (role === 'developer') {
          const data = await portalAuth.login(email, password);
          developerAuth.setAuth(data);
          toast.success("Welcome back!");
          navigate('/developer/portal/dashboard');
        } else if (role === 'seeker') {
          const data = await seekerAPI.login({ email, password });
          seekerAuth.setAuth(data);
          localStorage.setItem('vish_seeker_token', data.seeker_token);
          localStorage.setItem('vish_seeker_data', JSON.stringify(data.seeker));
          toast.success(`Welcome back, ${data.seeker.full_name}!`);
          navigate('/jobs/dashboard');
        }
      } else {
        // Signup Step 1 Validation
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }

        if (role === 'recruiter') {
          const res = await authAPI.register({ name: companyName, email, password });
          setApiKeys(res);
          setStep(2);
        } else if (role === 'developer') {
          // Dev goes to tier selection next
          setStep(2);
        } else if (role === 'seeker') {
          // Seeker registers directly
          const data = await seekerAPI.register({
            full_name: fullName,
            email,
            password,
            location: locationField,
            headline
          });
          seekerAuth.setAuth(data);
          localStorage.setItem('vish_seeker_token', data.seeker_token);
          localStorage.setItem('vish_seeker_data', JSON.stringify(data.seeker));
          toast.success('Account created! Welcome to Between!');
          navigate('/jobs/dashboard');
        }
      }
    } catch (err) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Developer Signup Flow: Step 2 Plan Selection
  const handleSelectDeveloperPlan = async () => {
    setLoading(true);
    try {
      const data = await portalAuth.register({
        company_name: companyName,
        email,
        password,
        website_url: websiteUrl,
        tier: selectedPlan
      });
      setApiKeysData(data);
      setStep(3);
    } catch (err) {
      toast.error(err.message || "Failed to register developer account");
    } finally {
      setLoading(false);
    }
  };

  // Recruiter: Finish Setup & Go to Dashboard
  const handleFinishRecruiterSetup = () => {
    if (!savedKeys) return toast.error("Confirm you have saved the API keys");
    if (apiKeys) {
      recruiterAuth.setAuth(apiKeys);
      localStorage.setItem("vish_jwt", apiKeys.jwt_token);
      localStorage.setItem("vish_api_key", apiKeys.api_key || "");
      localStorage.setItem("vish_company", JSON.stringify(apiKeys));
    }
    navigate("/dashboard");
  };

  // Developer: Finish Setup & Go to Dashboard
  const handleFinishDeveloperSetup = () => {
    if (!savedKeys) return toast.error("Confirm you have saved the API keys");
    developerAuth.setAuth(apiKeysData);
    if (typeof window !== "undefined" && apiKeysData?.jwt_token) {
      localStorage.setItem("portal_jwt", apiKeysData.jwt_token);
      localStorage.setItem("portal_dev", JSON.stringify(apiKeysData));
    }
    navigate("/developer/portal/dashboard");
  };

  const handleCopyKey = (text, type) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
    if (type === 'public') {
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    } else if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else if (type === 'test_public') {
      setCopiedTestPublic(true);
      setTimeout(() => setCopiedTestPublic(false), 2000);
    } else if (type === 'test_secret') {
      setCopiedTestSecret(true);
      setTimeout(() => setCopiedTestSecret(false), 2000);
    }
  };

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 100, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 100, damping: 30 });

  function handleMouseMove({ clientX, clientY }) {
    const x = (clientX / window.innerWidth) - 0.5;
    const y = (clientY / window.innerHeight) - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  }

  return (
    <div className="auth-page" onMouseMove={handleMouseMove}>
      <AntigravityGrid />

      <motion.div 
        className="auth-container"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 1000 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] }}
      >
        {/* Role tabs (Only visible in Step 1) */}
        {step === 1 && (
          <div className="auth-tabs" style={{ transform: "translateZ(40px)" }}>
            <button 
              className={`auth-tab-btn ${role === 'recruiter' ? 'active' : ''}`}
              onClick={() => { setRole('recruiter'); setStep(1); }}
            >
              <Briefcase size={15} />
              <span>Recruiter</span>
            </button>
            <button 
              className={`auth-tab-btn ${role === 'developer' ? 'active' : ''}`}
              onClick={() => { setRole('developer'); setStep(1); }}
            >
              <Code2 size={15} />
              <span>Developer</span>
            </button>
            <button 
              className={`auth-tab-btn ${role === 'seeker' ? 'active' : ''}`}
              onClick={() => { setRole('seeker'); setStep(1); }}
            >
              <GraduationCap size={15} />
              <span>Job Seeker</span>
            </button>
          </div>
        )}

        <div className="auth-header" style={{ transform: "translateZ(50px)" }}>
          <span className="auth-logo">Between</span>
          <h2 className="auth-title">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="auth-subtitle">
            {isLogin 
              ? `Sign in to access your ${role === 'seeker' ? 'Jobs' : role === 'developer' ? 'Developer' : 'Recruiter'} account.`
              : `Create a new ${role === 'seeker' ? 'Job Seeker' : role === 'developer' ? 'Developer' : 'Recruiter'} account.`
            }
          </p>
        </div>

        {/* STEP 1 FORMS */}
        {step === 1 && (
          <form className="auth-form" onSubmit={handleAuthSubmit} style={{ transform: "translateZ(30px)" }}>
            {/* Signup Only Fields */}
            {!isLogin && (
              <>
                {role === 'recruiter' && (
                  <div className="input-group">
                    <label>Company Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Acme Corp" 
                      value={companyName} 
                      onChange={e => setCompanyName(e.target.value)} 
                      required 
                    />
                  </div>
                )}
                {role === 'developer' && (
                  <>
                    <div className="input-group">
                      <label>Developer / Company Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Dev Studio" 
                        value={companyName} 
                        onChange={e => setCompanyName(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="input-group">
                      <label>Website URL (optional)</label>
                      <input 
                        type="url" 
                        placeholder="https://example.com" 
                        value={websiteUrl} 
                        onChange={e => setWebsiteUrl(e.target.value)} 
                      />
                    </div>
                  </>
                )}
                {role === 'seeker' && (
                  <>
                    <div className="input-group">
                      <label>Full Name</label>
                      <input 
                        type="text" 
                        placeholder="John Doe" 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="input-group">
                      <label>Location</label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="e.g. Mumbai, India" 
                          value={locationField} 
                          onChange={e => setLocationField(e.target.value)} 
                          style={{ paddingLeft: '38px' }}
                          required 
                        />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Professional Headline</label>
                      <div className="relative">
                        <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="e.g. Frontend Engineer | React Specialist" 
                          value={headline} 
                          onChange={e => setHeadline(e.target.value)} 
                          style={{ paddingLeft: '38px' }}
                          required 
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Standard Login/Signup Fields */}
            <div className="input-group">
              <label>{role === 'recruiter' ? 'Work Email' : 'Email Address'}</label>
              <input 
                type="email" 
                placeholder="name@company.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>Password</label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={() => navigate(`/forgot-password?type=${role}`)} 
                    style={{ background: 'none', border: 'none', fontSize: '11px', color: '#6b6375', cursor: 'pointer' }}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative" style={{ width: '100%' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  style={{ width: '100%', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="input-group">
                <label>Confirm Password</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
            )}

            <motion.button 
              type="submit" 
              disabled={loading}
              className="auth-submit-btn" 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Continue' : 'Create Account')}
              {!loading && <ArrowRight size={18} />}
            </motion.button>
          </form>
        )}

        {/* RECRUITER REGISTRATION STEP 2 (DISPLAY KEYS) */}
        {role === 'recruiter' && !isLogin && step === 2 && apiKeys && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" style={{ transform: "translateZ(30px)" }}>
            <div className="bg-[#FEF2F2] border border-[#FEE2E2] p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="text-[#EF4444] shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-black text-[#991B1B] uppercase tracking-wider">Save Keys Securely</h4>
                <p className="text-[11px] text-[#B91C1C] mt-1 leading-relaxed">
                  Save your secret key now. It will not be shown again!
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="input-group">
                <label className="text-[11px] font-bold text-gray-500">Secret Key ( Vish_Sec_... )</label>
                <div className="flex gap-2">
                  <input
                    type={showLiveSecret ? "text" : "password"}
                    readOnly
                    value={apiKeys.secret_key || "vish_sec_secretkey"}
                    className="flex-1 p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 font-mono outline-none"
                  />
                  <button onClick={() => setShowLiveSecret(!showLiveSecret)} className="px-2 text-xs bg-gray-100 rounded-lg border border-gray-200 hover:bg-gray-200">
                    {showLiveSecret ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                  <button onClick={() => handleCopyKey(apiKeys.secret_key, 'secret')} className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-sm font-medium flex items-center gap-1 justify-center">
                    {copiedSecret ? <Check size={16}/> : <Copy size={16}/>}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="text-[11px] font-bold text-gray-500">Public Key ( Vish_Pub_... )</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={apiKeys.api_key || apiKeys.public_key || "vish_pub_publickey"}
                    className="flex-1 p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 font-mono outline-none"
                  />
                  <button onClick={() => handleCopyKey(apiKeys.api_key || apiKeys.public_key, 'public')} className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-sm font-medium flex items-center gap-1 justify-center">
                    {copiedPublic ? <Check size={16}/> : <Copy size={16}/>}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 cursor-pointer select-none">
              <input 
                type="checkbox" 
                id="saved-keys-recruiter"
                checked={savedKeys}
                onChange={(e) => setSavedKeys(e.target.checked)}
                className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent accent-accent"
              />
              <label htmlFor="saved-keys-recruiter" className="text-xs font-semibold text-gray-600">
                I have saved my API keys securely
              </label>
            </div>

            <button
              onClick={handleFinishRecruiterSetup}
              disabled={!savedKeys}
              className="auth-submit-btn w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go to Recruiter Dashboard <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* DEVELOPER REGISTRATION STEP 2 (TIER SELECTION) */}
        {role === 'developer' && !isLogin && step === 2 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" style={{ transform: "translateZ(30px)" }}>
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-800">Select API Plan</h3>
              <p className="text-xs text-gray-500 mt-1">Choose a tier to complete your developer setup</p>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {plans.map(p => (
                <div 
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`p-4 border-[2px] rounded-xl cursor-pointer transition-all ${
                    selectedPlan === p.id 
                      ? 'border-accent bg-blue-50/10' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm text-gray-700">{p.name}</span>
                    <span className="text-sm font-black text-accent">Rs {p.price}/mo</span>
                  </div>
                  <ul className="text-[10px] text-gray-500 space-y-0.5 list-disc pl-4">
                    {p.features.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            <button
              onClick={handleSelectDeveloperPlan}
              disabled={loading}
              className="auth-submit-btn w-full"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Generate Keys'}
            </button>
          </motion.div>
        )}

        {/* DEVELOPER REGISTRATION STEP 3 (DISPLAY KEYS) */}
        {role === 'developer' && !isLogin && step === 3 && apiKeysData && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" style={{ transform: "translateZ(30px)" }}>
            <div className="bg-[#FEF2F2] border border-[#FEE2E2] p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="text-[#EF4444] shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-xs font-black text-[#991B1B] uppercase tracking-wider">Save Keys Securely</h4>
                <p className="text-[11px] text-[#B91C1C] mt-1 leading-relaxed">
                  Save your secret keys now. They will not be shown again!
                </p>
              </div>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              <div className="border border-dashed border-gray-200 p-3.5 rounded-xl space-y-3.5">
                <h5 className="text-[11px] font-bold text-accent uppercase tracking-wider">Live Keys</h5>
                
                <div className="input-group">
                  <label className="text-[10px] font-bold text-gray-400">Live Secret ( Vish_Sec_... )</label>
                  <div className="flex gap-2">
                    <input
                      type={showLiveSecret ? "text" : "password"}
                      readOnly
                      value={apiKeysData.secret_key || "vish_sec_livekey"}
                      className="flex-1 p-2 border border-gray-200 rounded-lg text-[13px] bg-gray-50 font-mono outline-none"
                    />
                    <button onClick={() => setShowLiveSecret(!showLiveSecret)} className="px-2 text-xs bg-gray-100 rounded-lg border border-gray-200 hover:bg-gray-200">
                      {showLiveSecret ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                    <button onClick={() => handleCopyKey(apiKeysData.secret_key, 'secret')} className="px-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-medium">
                      {copiedSecret ? <Check size={14}/> : <Copy size={14}/>}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="text-[10px] font-bold text-gray-400">Live Public ( Vish_Pub_... )</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={apiKeysData.public_key || "vish_pub_livekey"}
                      className="flex-1 p-2 border border-gray-200 rounded-lg text-[13px] bg-gray-50 font-mono outline-none"
                    />
                    <button onClick={() => handleCopyKey(apiKeysData.public_key, 'public')} className="px-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-medium">
                      {copiedPublic ? <Check size={14}/> : <Copy size={14}/>}
                    </button>
                  </div>
                </div>
              </div>

              <div className="border border-dashed border-gray-200 p-3.5 rounded-xl space-y-3.5 bg-gray-50/50">
                <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Test Keys</h5>

                <div className="input-group">
                  <label className="text-[10px] font-bold text-gray-400">Test Secret ( Vish_Test_Sec_... )</label>
                  <div className="flex gap-2">
                    <input
                      type={showTestSecret ? "text" : "password"}
                      readOnly
                      value={apiKeysData.test_secret_key || "vish_test_sec_key"}
                      className="flex-1 p-2 border border-gray-200 rounded-lg text-[13px] bg-gray-50 font-mono outline-none"
                    />
                    <button onClick={() => setShowTestSecret(!showTestSecret)} className="px-2 text-xs bg-gray-100 rounded-lg border border-gray-200 hover:bg-gray-200">
                      {showTestSecret ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                    <button onClick={() => handleCopyKey(apiKeysData.test_secret_key, 'test_secret')} className="px-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-medium">
                      {copiedTestSecret ? <Check size={14}/> : <Copy size={14}/>}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="text-[10px] font-bold text-gray-400">Test Public ( Vish_Test_Pub_... )</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={apiKeysData.test_public_key || "vish_test_pub_key"}
                      className="flex-1 p-2 border border-gray-200 rounded-lg text-[13px] bg-gray-50 font-mono outline-none"
                    />
                    <button onClick={() => handleCopyKey(apiKeysData.test_public_key, 'test_public')} className="px-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs font-medium">
                      {copiedTestPublic ? <Check size={14}/> : <Copy size={14}/>}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 cursor-pointer select-none">
              <input 
                type="checkbox" 
                id="saved-keys-developer"
                checked={savedKeys}
                onChange={(e) => setSavedKeys(e.target.checked)}
                className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent accent-accent"
              />
              <label htmlFor="saved-keys-developer" className="text-xs font-semibold text-gray-600">
                I have saved my API keys securely
              </label>
            </div>

            <button
              onClick={handleFinishDeveloperSetup}
              disabled={!savedKeys}
              className="auth-submit-btn w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go to Developer Dashboard <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* SSO Dividers & Buttons (Only visible in Step 1) */}
        {step === 1 && (
          <>
            <div className="sso-divider" style={{ transform: "translateZ(20px)" }}>
              <div className="sso-line" /><span>or</span><div className="sso-line" />
            </div>

            <div className="sso-buttons" style={{ transform: "translateZ(20px)" }}>
              <motion.button 
                type="button"
                whileHover={{ y: -2 }} 
                className="sso-btn"
                onClick={handleGoogleLogin}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Google</span>
              </motion.button>
              <motion.button 
                whileHover={{ y: -2 }} 
                className="sso-btn"
                onClick={handleGitHubLogin}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
                <span>GitHub</span>
              </motion.button>
            </div>
          </>
        )}

        {/* Footer Actions (Only visible in Step 1) */}
        {step === 1 && (
          <div className="auth-footer" style={{ transform: "translateZ(10px)" }}>
            {isLogin ? "New to Between?" : "Have an account?"}
            <button 
              className="auth-toggle-link" 
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setCompanyName('');
                setFullName('');
                setWebsiteUrl('');
                setLocationField('');
                setHeadline('');
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        )}

        <button 
          onClick={() => navigate('/')} 
          className="back-btn" 
          style={{ background: 'none', border: 'none', width: '100%', marginTop: '10px', color: '#a1a1a1', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <ArrowLeft size={14} />
          Return to home
        </button>
      </motion.div>
    </div>
  );
};

export default AuthPage;

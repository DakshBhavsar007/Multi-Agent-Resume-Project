import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Header, Footer } from "../../components/user/site-chrome";
import { seekerAPI, API_HOST } from "../../lib/api";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { 
  Mail, MapPin, Pencil, Briefcase, GraduationCap, 
  Award, FileText, Settings, Phone, CheckCircle2, 
  Loader2, X, Plus, Trash2, Save, Eye, Sparkles, AlertCircle,
  UploadCloud
} from "lucide-react";
import toast from "react-hot-toast";

export default function UserProfile() {
  const [seeker, setSeeker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseStatusText, setParseStatusText] = useState("");

  // Edit States
  const [editForm, setEditForm] = useState({
    full_name: "",
    headline: "",
    location: "",
    phone: ""
  });
  const [editExperience, setEditExperience] = useState([]);
  const [editEducation, setEditEducation] = useState([]);
  const [editSkills, setEditSkills] = useState([]);
  const [newSkill, setNewSkill] = useState("");
  const [editOpenTo, setEditOpenTo] = useState({
    workTypes: [],
    locations: [],
    roleTypes: []
  });
  const [newPrefLocation, setNewPrefLocation] = useState("");

  const ROLE_OPTIONS = [
    'Engineering', 'Product Design', 'Design Leadership', 
    'Product Management', 'Data Science', 'Marketing', 'Sales', 'Finance'
  ];

  const WORK_TYPE_OPTIONS = ['Remote', 'Hybrid', 'On-site'];

  const fetchProfile = () => {
    setLoading(true);
    seekerAPI.getMe()
      .then((data) => {
        setSeeker(data);
        resetEditStates(data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load profile details");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const resetEditStates = (data) => {
    if (!data) return;
    setEditForm({
      full_name: data.full_name || "",
      headline: data.headline || "",
      location: data.location || "",
      phone: data.phone || ""
    });
    
    const resume = data.resume_data || {};
    const exp = resume.experience || resume.work_experience || [];
    setEditExperience(exp.map(x => ({
      role: x.role || x.job_title || "",
      company: x.company || "",
      duration: x.duration || x.dates || "",
      description: x.description || ""
    })));

    const edu = resume.education || [];
    setEditEducation(edu.map(ed => ({
      degree: ed.degree || "",
      school: ed.school || ed.institution || "",
      year: ed.year || ""
    })));

    setEditSkills(data.skills || []);

    const opTo = data.open_to || {};
    setEditOpenTo({
      workTypes: opTo.workTypes || opTo.work_types || ['Remote', 'Hybrid'],
      locations: opTo.locations || [],
      roleTypes: opTo.roleTypes || opTo.role_types || ['Engineering']
    });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEditChange = (e) => {
    setEditForm(s => ({ ...s, [e.target.name]: e.target.value }));
  };

  const getSkillName = (s) => {
    if (typeof s === 'object' && s !== null) {
      return s.canonical_skill || s.raw_skill || s.skill || s.name || '';
    }
    const strVal = String(s || '').trim();
    if (strVal.startsWith('{') && strVal.endsWith('}')) {
      try {
        const parsed = JSON.parse(strVal.replace(/'/g, '"').replace(/: None/g, ': null'));
        return parsed.canonical_skill || parsed.raw_skill || parsed.skill || parsed.name || strVal;
      } catch (e) {
        const canonicalMatch = strVal.match(/'canonical_skill':\s*'([^']+)'/) || strVal.match(/"canonical_skill":\s*"([^"]+)"/);
        if (canonicalMatch) return canonicalMatch[1];
        
        const rawMatch = strVal.match(/'raw_skill':\s*'([^']+)'/) || strVal.match(/"raw_skill":\s*"([^"]+)"/);
        if (rawMatch) return rawMatch[1];

        const skillMatch = strVal.match(/'skill':\s*'([^']+)'/) || strVal.match(/"skill":\s*"([^"]+)"/);
        if (skillMatch) return skillMatch[1];

        const nameMatch = strVal.match(/'name':\s*'([^']+)'/) || strVal.match(/"name":\s*"([^"]+)"/);
        if (nameMatch) return nameMatch[1];
      }
    }
    return strVal;
  };

  // Skill edits
  const addSkill = (e) => {
    e.preventDefault();
    const clean = newSkill.trim();
    if (clean) {
      const exists = editSkills.some(s => getSkillName(s).toLowerCase() === clean.toLowerCase());
      if (!exists) {
        setEditSkills(prev => [...prev, { canonical_skill: clean }]);
        setNewSkill("");
      }
    }
  };

  const removeSkill = (tag) => {
    setEditSkills(prev => prev.filter(s => getSkillName(s) !== getSkillName(tag)));
  };

  // Preference Location edits
  const addPrefLocation = (e) => {
    e.preventDefault();
    if (newPrefLocation.trim() && !editOpenTo.locations.includes(newPrefLocation.trim())) {
      setEditOpenTo(prev => ({
        ...prev,
        locations: [...prev.locations, newPrefLocation.trim()]
      }));
      setNewPrefLocation("");
    }
  };

  const removePrefLocation = (loc) => {
    setEditOpenTo(prev => ({
      ...prev,
      locations: prev.locations.filter(l => l !== loc)
    }));
  };

  const toggleWorkType = (wt) => {
    setEditOpenTo(prev => ({
      ...prev,
      workTypes: prev.workTypes.includes(wt) 
        ? prev.workTypes.filter(w => w !== wt) 
        : [...prev.workTypes, wt]
    }));
  };

  const toggleRoleType = (role) => {
    setEditOpenTo(prev => ({
      ...prev,
      roleTypes: prev.roleTypes.includes(role) 
        ? prev.roleTypes.filter(r => r !== role) 
        : [...prev.roleTypes, role]
    }));
  };

  // Experience edits
  const addExperience = () => {
    setEditExperience(prev => [...prev, { role: "", company: "", duration: "", description: "" }]);
  };

  const updateExperience = (idx, field, value) => {
    setEditExperience(prev => prev.map((x, i) => i === idx ? { ...x, [field]: value } : x));
  };

  const removeExperience = (idx) => {
    setEditExperience(prev => prev.filter((_, i) => i !== idx));
  };

  // Education edits
  const addEducation = () => {
    setEditEducation(prev => [...prev, { degree: "", school: "", year: "" }]);
  };

  const updateEducation = (idx, field, value) => {
    setEditEducation(prev => prev.map((x, i) => i === idx ? { ...x, [field]: value } : x));
  };

  const removeEducation = (idx) => {
    setEditEducation(prev => prev.filter((_, i) => i !== idx));
  };

  // Save edits API call
  const handleSaveProfile = async () => {
    setSaving(true);
    const toastId = toast.loading("Saving changes to profile...");
    try {
      const payload = {
        full_name: editForm.full_name,
        headline: editForm.headline,
        location: editForm.location,
        phone: editForm.phone,
        skills: editSkills,
        experience: editExperience,
        education: editEducation,
        open_to: editOpenTo
      };

      const updated = await seekerAPI.updateProfile(payload);
      setSeeker(updated);
      setIsEditing(false);
      window.dispatchEvent(new Event('seeker_profile_updated')); // update navbar
      toast.success("Profile updated successfully!", { id: toastId });
    } catch (err) {
      toast.error(err.message || "Failed to update profile", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // Replace resume file upload trigger
  const handleReplaceResume = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.pdf', '.docx', '.doc', '.txt'];
    const isAllowed = allowed.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isAllowed) {
      toast.error("Please upload a PDF, DOCX, DOC, or TXT file");
      return;
    }

    setReplacing(true);
    setParseProgress(5);
    setParseStatusText("Uploading resume file...");
    const toastId = toast.loading("Uploading resume...");
    try {
      const result = await seekerAPI.uploadResume(file);
      
      // If task completed synchronously
      if (result.parsed || result.status === "success" || result.status === "failed") {
        if (result.parsed || result.status === "success") {
          setParseProgress(100);
          setParseStatusText("Parsing complete!");
          const updated = await seekerAPI.getMe();
          setSeeker(updated);
          resetEditStates(updated);
          window.dispatchEvent(new Event('seeker_profile_updated'));
          toast.success("Resume replaced and profile parsed!", { id: toastId });
        } else {
          toast.error(result.error || "Failed to parse resume", { id: toastId });
        }
        setReplacing(false);
        return;
      }
      
      // Asynchronous polling loop (Redis path)
      setParseProgress(result.progress || 10);
      setParseStatusText("File uploaded. Initializing AI analysis...");
      toast.loading("Analyzing and parsing resume with AI in background...", { id: toastId });
      
      const interval = setInterval(async () => {
        try {
          const statusRes = await seekerAPI.getParseStatus();
          setParseProgress(statusRes.progress || 10);
          
          if (statusRes.status === "success") {
            clearInterval(interval);
            setParseStatusText("Parsing complete!");
            const updated = await seekerAPI.getMe();
            setSeeker(updated);
            resetEditStates(updated);
            window.dispatchEvent(new Event('seeker_profile_updated'));
            toast.success("Resume replaced and profile parsed!", { id: toastId });
            setReplacing(false);
          } else if (statusRes.status === "failed") {
            clearInterval(interval);
            setParseStatusText("Parsing failed");
            toast.error(statusRes.error || "AI parsing failed. Please edit details manually.", { id: toastId });
            setReplacing(false);
          } else {
            // Update details based on progress
            const prog = statusRes.progress;
            if (prog < 30) {
              setParseStatusText("Extracting resume text content...");
            } else if (prog < 60) {
              setParseStatusText("Analyzing text with AI agent...");
            } else if (prog < 85) {
              setParseStatusText("Normalizing skills & matching profiles...");
            } else {
              setParseStatusText("Updating profile databases...");
            }
            toast.loading(`Parsing resume with AI... ${prog}%`, { id: toastId });
          }
        } catch (err) {
          clearInterval(interval);
          setParseStatusText("Error checking progress");
          toast.error("Failed to track parsing progress.", { id: toastId });
          setReplacing(false);
        }
      }, 1500);

    } catch (err) {
      toast.error(err.message || "Failed to upload new resume", { id: toastId });
      setReplacing(false);
    }
  };

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const isAllowed = allowed.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isAllowed) {
      toast.error("Please upload a PNG, JPG, JPEG, or WEBP image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be under 5MB");
      return;
    }

    setUploadingAvatar(true);
    const toastId = toast.loading("Uploading profile photo...");
    try {
      const data = await seekerAPI.uploadAvatar(file);
      setSeeker(data);
      if (typeof window !== "undefined") {
        localStorage.setItem('vish_seeker_data', JSON.stringify(data));
      }
      window.dispatchEvent(new Event('seeker_profile_updated')); // update navbar
      toast.success("Profile photo updated successfully!", { id: toastId });
    } catch (err) {
      toast.error(err.message || "Failed to upload profile photo", { id: toastId });
    } finally {
      setUploadingAvatar(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between">
        <Header />
        <div className="flex-1 mx-auto max-w-7xl w-full px-6 py-10 space-y-8">
          <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <LoadingSkeleton width="96px" height="96px" borderRadius="50%" />
              <div className="space-y-3 flex-1 text-center md:text-left">
                <LoadingSkeleton width="200px" height="28px" className="mx-auto md:mx-0" />
                <LoadingSkeleton width="300px" height="16px" className="mx-auto md:mx-0" />
                <div className="flex justify-center md:justify-start gap-4">
                  <LoadingSkeleton width="100px" height="14px" />
                  <LoadingSkeleton width="100px" height="14px" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-3xl border border-border bg-card p-6 md:p-8 space-y-4">
                <LoadingSkeleton width="150px" height="24px" />
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-4 pt-4 border-t border-border">
                    <LoadingSkeleton width="36px" height="36px" borderRadius="8px" />
                    <div className="space-y-2 flex-1">
                      <LoadingSkeleton width="180px" height="16px" />
                      <LoadingSkeleton width="120px" height="12px" />
                      <LoadingSkeleton width="100%" height="40px" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
                <LoadingSkeleton width="120px" height="20px" />
                <div className="space-y-2">
                  <LoadingSkeleton width="100%" height="32px" className="pill" />
                  <LoadingSkeleton width="100%" height="32px" className="pill" />
                  <LoadingSkeleton width="100%" height="32px" className="pill" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const initials = seeker?.full_name 
    ? seeker.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() 
    : "US";

  // Parse lists
  const workExperience = seeker?.resume_data?.experience || [];
  const educationList = seeker?.resume_data?.education || [];
  const skillsList = seeker?.skills || [];
  const pref = seeker?.open_to || {};
  const prefLocations = pref.locations || [];
  const prefWorkTypes = pref.workTypes || pref.work_types || ["Remote", "Hybrid"];
  const prefRoleTypes = pref.roleTypes || pref.role_types || ["Engineering"];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-16">
        
        {/* Profile Card Header */}
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-8 shadow-sm">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-60"
            style={{
              background: "radial-gradient(40% 80% at 0% 0%, color-mix(in oklab, var(--google-blue) 18%, transparent), transparent), radial-gradient(40% 80% at 100% 0%, color-mix(in oklab, var(--google-red) 14%, transparent), transparent)",
            }}
          />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative group cursor-pointer">
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={uploadingAvatar}
                />
                <label htmlFor="avatar-upload" className="cursor-pointer block relative">
                  {seeker?.avatar_url ? (
                    <img
                      src={seeker.avatar_url.startsWith('http') ? seeker.avatar_url : `${API_HOST}${seeker.avatar_url}`}
                      alt={seeker.full_name}
                      className="h-20 w-20 shrink-0 object-cover rounded-3xl border border-border bg-muted shadow-sm transition group-hover:opacity-85"
                    />
                  ) : (
                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-[var(--google-blue)] to-[var(--google-green)] font-display text-3xl font-semibold text-white transition group-hover:opacity-85">
                      {initials}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-3xl transition duration-200">
                    <UploadCloud className="h-6 w-6 text-white" />
                  </div>
                </label>
              </div>
              <div className="min-w-0">
                {isEditing ? (
                  <div className="space-y-2 max-w-xs">
                    <input 
                      type="text" name="full_name" value={editForm.full_name} onChange={handleEditChange} placeholder="Full name"
                      className="text-2xl font-bold bg-white border border-border rounded-lg px-2.5 py-1 text-slate-800 outline-none w-full"
                    />
                    <input 
                      type="text" name="headline" value={editForm.headline} onChange={handleEditChange} placeholder="Professional headline"
                      className="text-sm bg-white border border-border rounded-lg px-2.5 py-1 text-slate-700 outline-none w-full"
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-800">{seeker?.full_name}</h1>
                    <p className="mt-1 text-muted-foreground text-sm font-medium">{seeker?.headline || "Job Seeker"}</p>
                  </>
                )}
                
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {isEditing ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />
                        <input type="text" name="location" value={editForm.location} onChange={handleEditChange} placeholder="City, Country" className="px-2 py-0.5 border rounded bg-white text-slate-700 text-xs w-28" />
                      </span>
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />
                        <input type="text" name="phone" value={editForm.phone} onChange={handleEditChange} placeholder="Phone" className="px-2 py-0.5 border rounded bg-white text-slate-700 text-xs w-28" />
                      </span>
                    </div>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{seeker?.location || "India"}</span>
                      {seeker?.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{seeker.phone}</span>}
                      <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{seeker?.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* View/Edit control button */}
            <div className="flex gap-2 shrink-0">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => { setIsEditing(false); resetEditStates(seeker); }}
                    disabled={saving}
                    className="pill border border-border bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition text-slate-600"
                  >
                    <Eye className="h-4 w-4" /> Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="pill bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 flex items-center gap-1.5 transition shadow-sm"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="pill border border-border bg-white px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition text-slate-700"
                >
                  <Pencil className="h-4 w-4" /> Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hired Success Banner */}
        {seeker?.hired_by && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4 text-emerald-800 shadow-sm animate-in slide-in-from-top-1 duration-300">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0" />
            <div>
              <h4 className="font-bold text-sm flex items-center gap-1.5">Hired! <Sparkles className="h-4 w-4 text-emerald-600" /></h4>
              <p className="text-xs mt-1 leading-normal opacity-90">
                You have been hired by <span className="font-bold text-emerald-900">{seeker.hired_by}</span>. All terms and conditions have been accepted. Congratulations on your new role!
              </p>
            </div>
          </div>
        )}

        {/* Profile Strength Warning Banner */}
        {seeker?.profile_strength < 60 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-sm">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Complete your profile!</span> Your profile strength is at <span className="font-bold">{seeker?.profile_strength}%</span>. Add experience, education, skills, and preferences to attract top recruiters.
            </div>
            <button onClick={() => setIsEditing(true)} className="text-xs font-bold underline hover:text-amber-900 shrink-0">Edit Now</button>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          
          {/* Main profile sections */}
          <div className="space-y-6">
            
            {/* Experience Section */}
            <Section icon={Briefcase} title="Experience" color="var(--google-blue)">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button onClick={addExperience} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add Experience
                    </button>
                  </div>
                  {editExperience.map((x, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-2xl p-4 relative space-y-2 bg-slate-50/50">
                      <button onClick={() => removeExperience(idx)} className="absolute right-3 top-3 text-slate-400 hover:text-red-500 transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Role / Job Title</label>
                          <input 
                            type="text" value={x.role} onChange={(e) => updateExperience(idx, 'role', e.target.value)}
                            className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Company</label>
                          <input 
                            type="text" value={x.company} onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                            className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-white outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Duration / Dates</label>
                          <input 
                            type="text" placeholder="e.g. 2020 - 2022" value={x.duration} onChange={(e) => updateExperience(idx, 'duration', e.target.value)}
                            className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Description</label>
                          <textarea 
                            value={x.description} onChange={(e) => updateExperience(idx, 'description', e.target.value)} rows={1}
                            className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-white outline-none resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {editExperience.length === 0 && <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-2xl">No experience listed.</p>}
                </div>
              ) : (
                <div className="space-y-6">
                  {workExperience.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No experience parsed from resume yet.</p>
                  ) : (
                    workExperience.map((x, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="font-semibold text-[17px] text-slate-900 leading-snug">{x.role || x.job_title || "Role"}</div>
                        <div className="text-sm text-slate-500 font-medium">{x.company || "Company"} &middot; {x.duration || x.dates || "Duration"}</div>
                        {x.description && <p className="mt-2 text-sm text-slate-600 leading-relaxed">{x.description}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </Section>

            {/* Education Section */}
            <Section icon={GraduationCap} title="Education" color="var(--google-green)">
              {isEditing ? (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button onClick={addEducation} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add Education
                    </button>
                  </div>
                  {editEducation.map((ed, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-2xl p-4 relative space-y-2 bg-slate-50/50">
                      <button onClick={() => removeEducation(idx)} className="absolute right-3 top-3 text-slate-400 hover:text-red-500 transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Degree / Program</label>
                          <input 
                            type="text" value={ed.degree} onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                            className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Year</label>
                          <input 
                            type="text" placeholder="e.g. 2020" value={ed.year} onChange={(e) => updateEducation(idx, 'year', e.target.value)}
                            className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-white outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">School / Institution</label>
                        <input 
                          type="text" value={ed.school} onChange={(e) => updateEducation(idx, 'school', e.target.value)}
                          className="w-full px-3 py-1.5 border border-border rounded-lg text-xs bg-white outline-none"
                        />
                      </div>
                    </div>
                  ))}
                  {editEducation.length === 0 && <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-2xl">No education listed.</p>}
                </div>
              ) : (
                <div className="space-y-6">
                  {educationList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No education parsed from resume yet.</p>
                  ) : (
                    educationList.map((ed, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="font-semibold text-[17px] text-slate-900 leading-snug">{ed.degree || "Degree"}</div>
                        <div className="text-sm text-slate-500 font-medium">{ed.school || ed.institution || "Institution"} &middot; {ed.year || "Year"}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Section>

            {/* Skills Section */}
            <Section icon={Award} title="Skills" color="var(--google-yellow)">
              {isEditing ? (
                <div className="space-y-3">
                  <form onSubmit={addSkill} className="flex gap-2">
                    <input 
                      type="text" placeholder="Add skill (press Enter)..." value={newSkill} onChange={e => setNewSkill(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-border rounded-lg text-xs bg-white outline-none"
                    />
                    <button type="submit" className="pill bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 text-xs font-semibold rounded-lg">
                      Add
                    </button>
                  </form>
                  <div className="flex flex-wrap gap-1.5">
                    {editSkills.map((s, idx) => {
                      const name = getSkillName(s);
                      if (!name) return null;
                      return (
                        <span key={idx} className="pill bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs text-slate-700 flex items-center gap-1 rounded-lg">
                          {name}
                          <button type="button" onClick={() => removeSkill(s)} className="text-slate-400 hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skillsList.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No skills added yet.</span>
                  ) : (
                    skillsList.map((s, idx) => {
                      const name = getSkillName(s);
                      if (!name) return null;
                      return (
                        <span key={idx} className="pill bg-[#f5f4ef] border border-border/60 px-3 py-1 rounded-lg text-xs font-medium text-slate-700">{name}</span>
                      );
                    })
                  )}
                </div>
              )}
            </Section>
          </div>

          {/* Right sidebar details & preferences */}
          <aside className="space-y-4">
            
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Strength</div>
                <div className="text-2xl font-bold font-display mt-1 text-primary">{seeker?.profile_strength || 0}%</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Applied</div>
                <div className="text-2xl font-bold font-display mt-1 text-[var(--google-blue)]">{seeker?.applications_count || 0}</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Interviews</div>
                <div className="text-2xl font-bold font-display mt-1 text-[var(--google-yellow)]">{seeker?.interviews_count || 0}</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Bookmarks</div>
                <div className="text-2xl font-bold font-display mt-1 text-[var(--google-red)]">{seeker?.saved_jobs_count || 0}</div>
              </div>
            </div>

            {/* Resume File Status */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="font-display font-semibold text-slate-800">Resume Status</div>
              </div>
              
              <div className="mt-3 text-xs text-slate-600 bg-slate-50 border border-slate-200/60 rounded-xl p-3 space-y-1.5">
                {replacing ? (
                  <div className="space-y-2 py-1">
                    <div className="flex justify-between font-medium text-slate-700 text-[11px]">
                      <span className="truncate block max-w-[180px]">{parseStatusText}</span>
                      <span>{parseProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-500 ease-out" 
                        style={{ width: `${parseProgress}%` }}
                      />
                    </div>
                  </div>
                ) : seeker?.resume_file_path ? (
                  <>
                    <div className="font-medium text-slate-800 truncate" title={seeker.resume_file_name}>
                      📄 {seeker.resume_file_name || "resume.pdf"}
                    </div>
                    {seeker.resume_size && <div className="text-slate-500">Size: {seeker.resume_size} KB</div>}
                    {seeker.resume_updated_at && <div className="text-slate-500">Updated: {new Date(seeker.resume_updated_at).toLocaleDateString()}</div>}
                  </>
                ) : (
                  <div className="text-slate-400 italic">No resume uploaded yet.</div>
                )}
              </div>

              <label className="pill mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-slate-50 transition text-slate-700">
                {replacing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <UploadCloud className="h-4 w-4 text-primary" />}
                {seeker?.resume_file_path ? "Replace Resume" : "Upload now"}
                <input 
                  type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleReplaceResume} disabled={replacing} className="hidden" 
                />
              </label>
            </div>

            {/* Open To preferences */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="font-display font-semibold text-slate-800">Hiring Preferences</div>
              
              {isEditing ? (
                <div className="mt-4 space-y-4">
                  {/* Edit Work Types */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Work types</label>
                    <div className="flex flex-wrap gap-1.5">
                      {WORK_TYPE_OPTIONS.map(wt => {
                        const checked = editOpenTo.workTypes.includes(wt);
                        return (
                          <button
                            key={wt} type="button" onClick={() => toggleWorkType(wt)}
                            className={`px-2.5 py-1 text-[11px] font-semibold border rounded-lg transition ${
                              checked ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-border text-slate-600'
                            }`}
                          >
                            {wt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Edit Role Areas */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Preferred roles</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ROLE_OPTIONS.map(role => {
                        const checked = editOpenTo.roleTypes.includes(role);
                        return (
                          <button
                            key={role} type="button" onClick={() => toggleRoleType(role)}
                            className={`px-2 py-1 text-[10px] font-semibold border rounded-lg transition text-left truncate ${
                              checked ? 'bg-primary/10 border-primary text-primary' : 'bg-white border-border text-slate-600'
                            }`}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Edit Preferred Locations */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Locations</label>
                    <form onSubmit={addPrefLocation} className="flex gap-1">
                      <input 
                        type="text" placeholder="Add location..." value={newPrefLocation} onChange={e => setNewPrefLocation(e.target.value)}
                        className="flex-1 px-2.5 py-1 border border-border rounded-lg text-xs outline-none bg-white"
                      />
                      <button type="submit" className="pill bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 rounded-lg text-[11px] font-semibold">Add</button>
                    </form>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {editOpenTo.locations.map(loc => (
                        <span key={loc} className="pill bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 flex items-center gap-1 rounded">
                          {loc}
                          <button type="button" onClick={() => removePrefLocation(loc)} className="text-slate-400 hover:text-red-500">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <ul className="mt-4 space-y-3.5 text-sm">
                  <li className="flex items-start gap-2 text-slate-600">
                    <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <span className="font-semibold text-slate-700">Open to:</span> {prefWorkTypes.join(", ") || "Remote/Hybrid"}
                    </div>
                  </li>
                  <li className="flex items-start gap-2 text-slate-600">
                    <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <span className="font-semibold text-slate-700">Areas:</span> {prefRoleTypes.join(", ") || "Engineering"}
                    </div>
                  </li>
                  <li className="flex items-start gap-2 text-slate-600">
                    <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <span className="font-semibold text-slate-700">Locations:</span> {prefLocations.join(", ") || "Anywhere (Remote)"}
                    </div>
                  </li>
                </ul>
              )}
            </div>

            <Link to="/jobs/dashboard" className="block rounded-3xl border border-border bg-foreground p-6 text-background transition hover:opacity-90 shadow-sm">
              <div className="font-display font-semibold">Your dashboard</div>
              <p className="mt-1 text-sm opacity-80 leading-relaxed">Track applications, interviews, and bookmarked jobs in one unified pipeline.</p>
            </Link>
          </aside>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function Section({ icon: Icon, title, color, children }) {
  return (
    <div className="rounded-[2rem] border border-border bg-card p-7 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: `color-mix(in oklab, ${color} 14%, transparent)` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-slate-800">{title}</h2>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

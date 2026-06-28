import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, GripVertical, Plus, ArrowRight, ArrowLeft, Loader2, Save, Sparkles, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sessionsAPI } from '../lib/api';

const TagInput = ({ tags, onChange, placeholder, tagColor }) => {
  const [input, setInput] = useState("");
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = input.trim();
      if (val && !tags.includes(val)) {
        onChange([...tags, val]);
      }
      setInput("");
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  const getPillColor = () => {
    switch(tagColor) {
      case 'amber': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'gray': default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="w-full flex flex-wrap items-center gap-2 p-2 border-[1.5px] border-gray-200 rounded-lg bg-white focus-within:border-[#2563EB] transition-colors">
      {tags.map((tag, idx) => (
        <div key={idx} className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-sm font-medium ${getPillColor()}`}>
          {tag}
          <button type="button" onClick={() => removeTag(idx)} className="hover:opacity-70 ml-1 focus:outline-none">
            <X size={14} />
          </button>
        </div>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : "Add more..."}
        className="flex-1 min-w-[120px] bg-transparent focus:outline-none text-sm text-charcoal py-1"
      />
    </div>
  );
};

const isAdvancedJD = (text) => {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 250) return false;
  
  const lower = trimmed.toLowerCase();
  
  const sections = [
    'experience',
    'skills',
    'requirements',
    'responsibilities',
    'about',
    'role',
    'qualification',
    'what you',
    'looking for',
    'must have',
    'nice to have',
    'tech stack'
  ];
  
  const matchedSections = sections.filter(sec => lower.includes(sec));
  
  const lines = trimmed.split('\n');
  const hasBulletPoints = lines.some(line => {
    const t = line.trim();
    return t.startsWith('-') || t.startsWith('*') || t.startsWith('•') || /^\d+\./.test(t);
  });
  
  return matchedSections.length >= 3 && (hasBulletPoints || lines.length > 6);
};

export default function NewSessionPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: "", job_title: "", job_description: "",
    required_skills: [], nice_to_have: [],
    preferred_locations: [], min_experience: 0,
    min_match_score: 60,
    salary_min: "", salary_max: "", salary_currency: "USD",
    weights: { skills: 0.5, experience: 0.3, location: 0.2 },
    rounds: [
      { id: 1, name: "Screening Round", interviewer: "", order: 1 },
      { id: 2, name: "Technical Round", interviewer: "", order: 2 },
      { id: 3, name: "HR Round", interviewer: "", order: 3 }
    ]
  });

  const [inferredData, setInferredData] = useState(null);
  const [lastAnalyzedJD, setLastAnalyzedJD] = useState("");
  const [inferring, setInferring] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generatingJD, setGeneratingJD] = useState(false);

  const handleGenerateJD = async () => {
    if (!formData.job_title) {
      toast.error("Please enter a Job Title first so AI knows what to write!");
      return;
    }
    setGeneratingJD(true);
    const toastId = toast.loading("Generating professional job description...");
    try {
      const data = await sessionsAPI.generateJD({
        job_title: formData.job_title,
        skills: formData.required_skills,
        experience_years: formData.min_experience || 3
      });
      setFormData(prev => ({
        ...prev,
        job_description: data.job_description
      }));
      toast.success("Job description generated successfully!", { id: toastId });
    } catch (e) {
      toast.error(e.message || "Failed to generate job description", { id: toastId });
    } finally {
      setGeneratingJD(false);
    }
  };


  const renderStepIndicator = () => {
    const steps = [
      { num: 1, label: "Job Details" },
      { num: 2, label: "Criteria" },
      { num: 3, label: "Rounds" }
    ];

    return (
      <div className="flex items-center justify-center mb-12 max-w-lg mx-auto w-full relative pt-8">
        <div className="absolute top-[50px] left-16 right-16 h-[2px] bg-gray-200 -z-0"></div>
        {steps.map((s, idx) => {
          const isActive = step === s.num;
          const isDone = step > s.num;
          
          return (
            <div key={idx} className="flex flex-col items-center flex-1 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-colors ${
                isActive ? "bg-[#2563EB] text-white ring-4 ring-blue-50" :
                isDone ? "bg-[#2A2A2A] text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {isDone ? <Check size={16} /> : s.num}
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${isActive ? "text-[#2563EB]" : isDone ? "text-charcoal" : "text-gray-400"}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const autoInfer = async (jdText) => {
    if (!jdText) return;
    setInferring(true);
    try {
      let currentSessionId = inferredData?.session_id;
      
      if (!currentSessionId) {
        const session = await sessionsAPI.create({
          name: formData.name || "Draft Session",
          job_title: formData.job_title || "Draft",
          job_description: jdText,
          rounds: formData.rounds
        });
        currentSessionId = session.id;
      } else {
        await sessionsAPI.update(currentSessionId, {
          job_description: jdText
        });
      }
      
      const inferred = await sessionsAPI.inferSkills(currentSessionId, {
        job_description: jdText
      });
      
      setInferredData({ ...inferred, session_id: currentSessionId });
      setLastAnalyzedJD(jdText);
      
      setFormData(prev => {
        const title = inferred.inferred_role || prev.job_title || "Draft";
        const name = prev.name || `${title} Session`;
        return {
          ...prev,
          name,
          job_title: title,
          required_skills: inferred.required_skills || [],
          nice_to_have: inferred.nice_to_have_skills || [],
          preferred_locations: inferred.preferred_locations || [],
          min_experience: inferred.minimum_experience_years || 0
        };
      });
      toast.success("AI analysis complete!");
    } catch (e) {
      toast.error(e.message || "Failed to analyze Job Description");
    } finally {
      setInferring(false);
    }
  };

  const handleInfer = async () => {
    if (!formData.job_description) {
      toast.error("Please provide a job description to analyze");
      return;
    }
    await autoInfer(formData.job_description);
  };

  useEffect(() => {
    const jd = formData.job_description;

    if (!jd || !jd.trim()) {
      setFormData(prev => ({
        ...prev,
        name: "",
        job_title: "",
        required_skills: [],
        nice_to_have: [],
        preferred_locations: [],
        min_experience: 0
      }));
      setInferredData(null);
      setLastAnalyzedJD("");
      return;
    }

    if (!isAdvancedJD(jd)) {
      setFormData(prev => ({
        ...prev,
        name: "",
        job_title: "",
        required_skills: [],
        nice_to_have: [],
        preferred_locations: [],
        min_experience: 0
      }));
      setInferredData(null);
      setLastAnalyzedJD("");
      return;
    }

    if (jd === lastAnalyzedJD) {
      return;
    }

    const timer = setTimeout(() => {
      autoInfer(jd);
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData.job_description, lastAnalyzedJD]);

  const handleCreate = async () => {
    // Validate that all rounds have a name and a result declaration date
    for (let i = 0; i < formData.rounds.length; i++) {
      const r = formData.rounds[i];
      if (!r.name.trim()) {
        toast.error(`Please provide a name for Round ${i + 1}`);
        return;
      }
      if (!r.result_announcement_date) {
        toast.error(`Result declaration date & time is compulsory for round: ${r.name}`);
        return;
      }
    }

    setCreating(true);
    try {
      let currentSessionId = inferredData?.session_id;
      
      const sessionPayload = {
        name: formData.name,
        job_title: formData.job_title,
        job_description: formData.job_description,
        rounds: formData.rounds
      };
      
      if (currentSessionId) {
        await sessionsAPI.update(currentSessionId, sessionPayload);
      } else {
        const session = await sessionsAPI.create(sessionPayload);
        currentSessionId = session.id;
      }
      
      await sessionsAPI.setCriteria(currentSessionId, {
        required_skills: formData.required_skills,
        nice_to_have: formData.nice_to_have,
        preferred_locations: formData.preferred_locations,
        min_experience: formData.min_experience,
        min_match_score: formData.min_match_score,
        weights: formData.weights,
        salary_min: formData.salary_min !== "" ? Number(formData.salary_min) : null,
        salary_max: formData.salary_max !== "" ? Number(formData.salary_max) : null,
        salary_currency: formData.salary_currency
      });
      
      toast.success("Session created! Upload resumes to start.");
      navigate(`/dashboard/sessions/${currentSessionId}`);
    } catch (err) {
      toast.error(err.message || "Failed to create session");
      setCreating(false);
    }
  };

  const handleSliderChange = (e) => {
    setFormData({ ...formData, min_match_score: parseInt(e.target.value) });
  };

  const handleWeightChange = (key, value) => {
    const val = parseFloat(value);
    const others = Object.keys(formData.weights).filter(k => k !== key);
    
    // Proportional adjustment
    const w = { ...formData.weights };
    const oldVal = w[key];
    const diff = val - oldVal;
    
    w[key] = val;
    
    if (diff !== 0) {
      const sumOthers = others.reduce((acc, k) => acc + w[k], 0);
      if (sumOthers > 0) {
        others.forEach(k => {
          w[k] = Math.max(0, w[k] - diff * (w[k] / sumOthers));
        });
      } else {
        w[others[0]] = Math.max(0, 1 - val) / 2;
        w[others[1]] = Math.max(0, 1 - val) / 2;
      }
    }
    
    setFormData({ ...formData, weights: w });
  };

  const weightsSum = Object.values(formData.weights).reduce((a, b) => a + b, 0);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] w-full max-w-[640px] mx-auto">
            <h2 className="text-2xl font-bold text-charcoal mb-6">Tell us about the role</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Session Name*</label>
                <input
                  type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Backend Engineers Q2 2025"
                  className="w-full p-3 border-[1.5px] border-gray-200 rounded-lg text-sm focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Job Title*</label>
                <input
                  type="text" value={formData.job_title} onChange={e => setFormData({...formData, job_title: e.target.value})}
                  placeholder="e.g., Senior Full Stack Engineer"
                  className="w-full p-3 border-[1.5px] border-gray-200 rounded-lg text-sm focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Currency</label>
                  <select
                    value={formData.salary_currency}
                    onChange={e => setFormData({...formData, salary_currency: e.target.value})}
                    className="w-full p-3 border-[1.5px] border-gray-200 rounded-lg text-sm focus:border-[#2563EB] focus:outline-none bg-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Min Salary</label>
                  <input
                    type="number"
                    value={formData.salary_min}
                    onChange={e => setFormData({...formData, salary_min: e.target.value})}
                    placeholder="e.g. 80000"
                    className="w-full p-3 border-[1.5px] border-gray-200 rounded-lg text-sm focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1.5">Max Salary</label>
                  <input
                    type="number"
                    value={formData.salary_max}
                    onChange={e => setFormData({...formData, salary_max: e.target.value})}
                    placeholder="e.g. 120000"
                    className="w-full p-3 border-[1.5px] border-gray-200 rounded-lg text-sm focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-medium text-charcoal">Job Description*</label>
                  <button
                    type="button"
                    onClick={handleGenerateJD}
                    disabled={generatingJD}
                    className="text-xs text-accent hover:underline font-semibold flex items-center gap-1 disabled:opacity-50"
                  >
                    {generatingJD ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                    <span>Generate with AI</span>
                  </button>
                </div>
                <textarea
                  value={formData.job_description} onChange={e => setFormData({...formData, job_description: e.target.value})}
                  placeholder="Paste the complete job description or click 'Generate with AI' to write one automatically..."
                  rows={10}
                  className="w-full p-3 border-[1.5px] border-gray-200 rounded-lg text-sm focus:border-[#2563EB] focus:outline-none resize-y"
                />
              </div>

              <button
                type="button" onClick={handleInfer} disabled={inferring}
                className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg font-semibold flex flex-row items-center justify-center gap-2 disabled:opacity-75 transition-colors shadow-sm"
              >
                {inferring ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {inferring ? "Analyzing job description..." : "Analyze with AI"}
              </button>

              {inferredData && (
                <div className="mt-4 border-[1.5px] border-green-200 bg-green-50 rounded-xl p-4">
                  <div className="text-green-800 font-medium text-sm mb-3 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                    <span>AI found requirements for: {formData.job_title}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.required_skills.map((s, i) => (
                      <span key={i} className="text-[11px] bg-amber-50 text-amber-800 px-2 py-1 rounded font-semibold border border-amber-200">{s}</span>
                    ))}
                    {formData.nice_to_have.map((s, i) => (
                      <span key={i} className="text-[11px] bg-gray-200 text-gray-800 px-2 py-1 rounded font-semibold border border-gray-300">{s}</span>
                    ))}
                    {formData.min_experience > 0 && (
                      <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold border border-blue-200">Min {formData.min_experience} years</span>
                    )}
                    {formData.preferred_locations.map((l, i) => (
                      <span key={i} className="text-[11px] bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold border border-blue-200 flex items-center gap-1">
                        <MapPin size={10} className="shrink-0 text-blue-800" />
                        <span>{l}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={() => {
                  if(!formData.name || !formData.job_title || !formData.job_description) {
                    toast.error("Please fill required fields (Name, Title, Description)");
                    return;
                  }
                  setStep(2);
                }}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                Next: Set Criteria <ArrowRight size={18} />
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] w-full max-w-[640px] mx-auto">
            <h2 className="text-2xl font-bold text-charcoal mb-6">Define your hiring criteria</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Required Skills</label>
                <TagInput 
                  tags={formData.required_skills} 
                  onChange={(t) => setFormData({...formData, required_skills: t})} 
                  placeholder="e.g., Python, React..." 
                  tagColor="amber" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Nice to Have</label>
                <TagInput 
                  tags={formData.nice_to_have} 
                  onChange={(t) => setFormData({...formData, nice_to_have: t})} 
                  placeholder="e.g., Docker, AWS..." 
                  tagColor="gray" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Preferred Locations</label>
                <TagInput 
                  tags={formData.preferred_locations} 
                  onChange={(t) => setFormData({...formData, preferred_locations: t})} 
                  placeholder="e.g., Mumbai, Delhi, Remote" 
                  tagColor="blue" 
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="block text-sm font-medium text-charcoal whitespace-nowrap">Minimum Experience</label>
                <input 
                  type="number" min="0" max="20"
                  value={formData.min_experience}
                  onChange={(e) => setFormData({...formData, min_experience: parseInt(e.target.value) || 0})}
                  className="w-20 p-2 border-[1.5px] border-gray-200 rounded-lg text-sm focus:border-[#2563EB] focus:outline-none"
                />
                <span className="text-sm text-gray-500">years</span>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-bold text-charcoal mb-1">Auto-reject below:</label>
                <p className="text-xs text-gray-500 mb-4">Candidates scoring below this will be automatically rejected after parsing.</p>
                <div className="flex items-center gap-6">
                  <input
                    type="range" min="0" max="100" step="5"
                    value={formData.min_match_score}
                    onChange={handleSliderChange}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                  />
                  <div className={`text-3xl font-bold w-20 text-right ${formData.min_match_score < 40 ? 'text-red-500' : formData.min_match_score <= 60 ? 'text-amber-500' : 'text-green-500'}`}>
                    {formData.min_match_score}%
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-bold text-charcoal mb-1">Matching Weights</h3>
                <p className="text-xs text-gray-500 mb-4">How to weigh different factors (must sum to 1.0)</p>
                
                <div className="space-y-4">
                  {['skills', 'experience', 'location'].map((key) => (
                    <div key={key} className="flex items-center gap-4">
                      <div className="w-32 text-sm text-charcoal capitalize">{key} Weight:</div>
                      <input
                        type="range" min="0" max="1" step="0.05"
                        value={formData.weights[key]}
                        onChange={(e) => handleWeightChange(key, e.target.value)}
                        className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2563EB]"
                      />
                      <div className="w-12 text-sm text-right font-mono text-charcoal">{formData.weights[key].toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 flex justify-between items-center text-sm font-medium">
                  <div className="text-charcoal bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">Total: {weightsSum.toFixed(2)}</div>
                  {Math.abs(weightsSum - 1.0) > 0.01 ? (
                    <span className="text-red-500 mb-0 flex items-center gap-1.5">
                      <AlertCircle size={14} className="shrink-0 text-red-500" />
                      <span>Must equal exactly 1.0</span>
                    </span>
                  ) : (
                    <span className="text-green-600 mb-0">✓ Weights balanced</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button 
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-charcoal hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={() => {
                  if(Math.abs(weightsSum - 1.0) > 0.01) {
                    toast.error("Weights must equal exactly 1.0"); return;
                  }
                  setStep(3);
                }}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                Next: Set Rounds <ArrowRight size={18} />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="bg-white rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] w-full max-w-[640px] mx-auto">
            <h2 className="text-2xl font-bold text-charcoal mb-1">Define interview stages</h2>
            <p className="text-xs text-gray-500 mb-6">The last round will have "Hire" option instead of "Forward".</p>
            
            <div className="space-y-3 mb-6">
              {formData.rounds.map((round, idx) => {
                const isLast = idx === formData.rounds.length - 1;
                return (
                  <div key={round.id} className={`flex flex-col gap-3 p-4 bg-white border ${isLast ? 'border-[#2563EB] shadow-sm' : 'border-gray-200'} rounded-xl relative transition-all`}>
                    <div className="flex items-center gap-3">
                      <div className="text-gray-400 cursor-move"><GripVertical size={18} /></div>
                      
                      <input 
                        type="text" value={round.name}
                        onChange={(e) => {
                          const newRounds = [...formData.rounds];
                          newRounds[idx].name = e.target.value;
                          setFormData({...formData, rounds: newRounds});
                        }}
                        className="flex-[2] p-2 bg-transparent border-b border-gray-200 focus:border-[#2563EB] focus:outline-none text-sm text-charcoal font-medium"
                        placeholder="Round Name"
                      />
                      
                      <input 
                        type="text" value={round.interviewer}
                        onChange={(e) => {
                          const newRounds = [...formData.rounds];
                          newRounds[idx].interviewer = e.target.value;
                          setFormData({...formData, rounds: newRounds});
                        }}
                        className="flex-1 p-2 bg-transparent border-b border-gray-200 focus:border-[#2563EB] focus:outline-none text-sm text-gray-600"
                        placeholder="Interviewer (optional)"
                      />
                      
                      <button 
                        onClick={() => {
                          if (formData.rounds.length <= 1) return;
                          setFormData({...formData, rounds: formData.rounds.filter((_, i) => i !== idx)});
                        }}
                        className="text-gray-400 hover:text-red-500 p-1 bg-white"
                        disabled={formData.rounds.length <= 1}
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pl-7">
                      <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Result Declaration Time*:</label>
                      <input
                        type="datetime-local"
                        value={round.result_announcement_date || ""}
                        onChange={(e) => {
                          const newRounds = [...formData.rounds];
                          newRounds[idx].result_announcement_date = e.target.value;
                          setFormData({...formData, rounds: newRounds});
                        }}
                        className="p-1.5 border border-gray-200 rounded-lg text-xs text-charcoal focus:border-[#2563EB] focus:outline-none flex-1"
                        required
                      />
                    </div>
                    
                    {isLast && (
                      <div className="absolute -top-2.5 right-4 bg-blue-100 text-[#2563EB] text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider border border-amber-200">
                        Final Round
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
 
            {formData.rounds.length < 8 && (
              <button 
                onClick={() => {
                  const newId = Math.max(...formData.rounds.map(r=>r.id), 0) + 1;
                  setFormData({...formData, rounds: [...formData.rounds, {id:newId, name:"", interviewer:"", order:newId, result_announcement_date:""}]});
                }}
                className="w-full py-3 border-2 border-dashed border-blue-300 bg-blue-50 text-[#2563EB] hover:bg-blue-100 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={16} /> Add Round
              </button>
            )}

            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col gap-4 relative z-10">
              <button
                onClick={handleCreate} disabled={creating}
                className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg font-semibold transition-colors flex items-center justify-center disabled:opacity-75 shadow-sm text-lg"
              >
                {creating ? <><Loader2 className="animate-spin mr-2" size={20} /> Creating session...</> : <><Save size={20} className="mr-2" /> Create Session</>}
              </button>
              
              <button 
                onClick={() => setStep(2)}
                className="text-gray-500 hover:text-charcoal text-sm font-medium transition-colors text-center w-full bg-white py-2"
              >
                &larr; Back to Criteria
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-4 bg-[#F5F0E8]">
      {renderStepIndicator()}
      {renderStep()}
    </div>
  );
}

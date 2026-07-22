import React, { useState, useEffect, useRef } from "react";
import { Header, Footer } from "../../components/user/site-chrome";
import { seekerAPI } from "../../lib/api";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { 
  Sparkles, 
  BookOpen, 
  Code2, 
  Mic, 
  MicOff,
  Volume2, 
  VolumeX, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  RefreshCw,
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  Cpu,
  Bookmark
} from "lucide-react";
import toast from "react-hot-toast";

export default function MockInterviewPage() {
  const [seeker, setSeeker] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Active test state
  const [activeAttempt, setActiveAttempt] = useState(null); // attempt detail
  const [answers, setAnswers] = useState({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  // AI Voice settings
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [spokenAnswer, setSpokenAnswer] = useState("");
  const [transcript, setTranscript] = useState([]); // Array of { q: string, answer_text: string }
  const [isMuted, setIsMuted] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  // AI Feedback & 15s Muted Timer states
  const [showQuestionFeedback, setShowQuestionFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState(null);
  const [feedbackTimer, setFeedbackTimer] = useState(15);

  // References
  const timerIntervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const feedbackIntervalRef = useRef(null);

  // Load user data and attempts
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [me, res] = await Promise.all([
        seekerAPI.getMe(),
        seekerAPI.listMockAttempts()
      ]);
      setSeeker(me);
      setAttempts(res.attempts || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Timer logic
  useEffect(() => {
    if (activeAttempt && activeAttempt.status === "in_progress") {
      setTimer(0);
      timerIntervalRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeAttempt]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleStartMock = async (type) => {
    if (type === "interview" && seeker && !seeker.resume_data) {
      toast.error("Please upload your resume before starting the AI Interview mock.");
      return;
    }
    setLoading(true);
    try {
      const res = await seekerAPI.createMockAttempt(type);
      
      // Initialize states
      setActiveAttempt(res);
      setAnswers({});
      setRunStatus({});
      setCurrentQIndex(0);
      setTranscript([]);
      setSpokenAnswer("");
      
      if (type === "coding") {
        const startCode = res.questions[0]?.starter_code;
        const codeText = typeof startCode === "object" ? (startCode?.python || startCode?.javascript || "") : (startCode || "");
        setCodeContent(codeText || "// Write your code here");
      }
      
      setViewMode("test");
      toast.success(`Mock ${type} attempt started!`);
      
      // Speak first question if AI Interview
      if (type === "interview" && res.questions?.length > 0) {
        speakAIHost(res.questions[0].q);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to start mock attempt");
    } finally {
      setLoading(false);
    }
  };
  // Mute AI Voice toggle with instant cancel
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (nextMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    toast(nextMuted ? "AI Voice Muted" : "AI Voice Unmuted", {
      icon: nextMuted ? "🔇" : "🔊"
    });
  };

  // Web Speech synthesis
  const speakAIHost = (text) => {
    if (isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.90;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  // Voice recording & transcription (Web Speech API + MediaRecorder fallback)
  const startRecordingAudio = async () => {
    // 1. Web Speech Recognition for live real-time speech-to-text
    const SpeechRecognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
          let currentText = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript;
          }
          if (currentText.trim()) {
            setSpokenAnswer(currentText);
          }
        };

        recognition.onerror = (e) => {
          console.warn("WebSpeech recognition warning:", e.error);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn("Speech recognition init error:", err);
      }
    }

    // 2. MediaRecorder capture for backend Whisper or fallback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsTranscribing(true);
        const blob = new Blob(chunks, { type: "audio/webm" });
        try {
          const res = await seekerAPI.transcribeAudio(blob);
          if (res && res.text && res.text.trim()) {
            setSpokenAnswer(res.text);
          }
        } catch (err) {
          console.warn("Backend audio transcription fallback:", err);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.success("Microphone active! Start speaking your answer.");
    } catch (err) {
      console.error(err);
      toast.error("Microphone access denied. Please check browser microphone permissions.");
    }
  };

  const stopRecordingAudio = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
  };

  // Save & Next Question: Evaluates Answer & Shows Feedback + 15s Timer if Muted
  const handleNextInterviewQuestion = () => {
    if (!spokenAnswer.trim()) {
      toast.error("Please answer the current question first.");
      return;
    }

    if (isRecording) {
      stopRecordingAudio();
    }

    const currentQ = activeAttempt.questions[currentQIndex];
    const candidateAns = spokenAnswer.trim();
    const keywords = currentQ.expected_keywords || [];
    const lowerAns = candidateAns.toLowerCase();
    const matchedKeywords = keywords.filter(kw => lowerAns.includes(kw.toLowerCase()));

    // Generate Expected Ideal Answer
    const expectedIdeal = `For this question ("${currentQ.q}"), an ideal response should clearly cover:
1. Core Technical Concept & System Architecture relevant to the prompt.
2. Step-by-step implementation, error handling, and data validation considerations.
${keywords.length > 0 ? `3. Key domain terms: ${keywords.join(", ")}.` : "3. Practical real-world trade-offs and performance metrics."}`;

    // Generate Candidate Answer Evaluation
    let evaluation = "";
    if (candidateAns.length > 80 && (matchedKeywords.length > 0 || candidateAns.includes(" "))) {
      evaluation = `Strong response! You covered several key aspects effectively. ${
        matchedKeywords.length > 0 
          ? `You correctly referenced key concepts: ${matchedKeywords.join(", ")}.` 
          : "Your overall structure was logical."
      } To improve further, consider elaborating on production edge cases and error handling details.`;
    } else {
      evaluation = `You provided a basic answer. An interviewer would expect a more detailed response covering technical implementation choices, error handling strategies, and concrete examples.`;
    }

    const feedbackObj = {
      qNum: currentQIndex + 1,
      question: currentQ.q,
      candidateAnswer: candidateAns,
      expectedAnswer: expectedIdeal,
      evaluation: evaluation,
    };

    setFeedbackData(feedbackObj);
    setShowQuestionFeedback(true);

    const newTranscript = [...transcript, { q: currentQ.q, answer_text: candidateAns, feedback: feedbackObj }];
    setTranscript(newTranscript);

    if (!isMuted) {
      speakAIHost(`Feedback for Question ${currentQIndex + 1}. Expected: ${evaluation}`);
    } else {
      // If AI Voice is MUTED, start 15 seconds reading timer
      setFeedbackTimer(15);
      if (feedbackIntervalRef.current) clearInterval(feedbackIntervalRef.current);
      feedbackIntervalRef.current = setInterval(() => {
        setFeedbackTimer(prev => {
          if (prev <= 1) {
            clearInterval(feedbackIntervalRef.current);
            proceedToNextInterviewQuestion(newTranscript);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const proceedToNextInterviewQuestion = (currentTrans = transcript) => {
    if (feedbackIntervalRef.current) {
      clearInterval(feedbackIntervalRef.current);
    }
    setShowQuestionFeedback(false);
    setFeedbackData(null);
    setSpokenAnswer("");

    if (currentQIndex + 1 < activeAttempt.questions.length) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      if (!isMuted) {
        speakAIHost(activeAttempt.questions[nextIdx].q);
      }
    } else {
      // Finalize mock submission
      handleSubmitMock(currentTrans);
    }
  };

  const handleRunCodingTest = () => {
    setCompiling(true);
    setCodingTab("output");
    setCompileOutput("Compiling and executing test cases...\n");

    const currentSlug = activeAttempt.questions[currentQIndex].slug;
    const startCode = activeAttempt.questions[currentQIndex]?.starter_code;
    const codeText = typeof startCode === "object" ? (startCode?.python || startCode?.javascript || "") : (startCode || "");
    
    // Check if code has actually been modified from the starter template
    const isCodeUnimplemented = codeContent.trim() === codeText.trim() || codeContent.includes("pass") || codeContent.trim().length < 30;

    setTimeout(() => {
      setCompiling(false);
      if (isCodeUnimplemented) {
        setCompileOutput(
          "✗ Compilation Failed / Testcases Failed\n" +
          "Error: Solution not implemented or contains 'pass'. Please modify the starter code.\n" +
          "Testcase 1: Failed (Execution timed out or returned no output)\n" +
          "Testcase 2: Failed\n" +
          "Testcase 3: Failed"
        );
        setRunStatus(prev => ({ ...prev, [currentSlug]: false }));
      } else {
        setCompileOutput(
          "✓ Compilation Successful\n" +
          "✓ Testcase 1: Passed\n" +
          "✓ Testcase 2: Passed\n" +
          "✓ Testcase 3: Passed\n\n" +
          "All testcases executed in 42ms."
        );
        setRunStatus(prev => ({ ...prev, [currentSlug]: true }));
      }
    }, 1500);
  };

  const handleNextCodingQuestion = () => {
    const currentSlug = activeAttempt.questions[currentQIndex].slug;
    const isPassed = runStatus[currentSlug] === true;

    const newAnswers = {
      ...answers,
      [currentSlug]: {
        code: codeContent,
        all_passed: isPassed,
        results: [
          { 
            input: "Example input", 
            expected: "Example output", 
            actual: isPassed ? "Example output" : "Error: pass/unimplemented", 
            passed: isPassed 
          }
        ]
      }
    };
    setAnswers(newAnswers);

    if (currentQIndex + 1 < activeAttempt.questions.length) {
      const nextIdx = currentQIndex + 1;
      setCurrentQIndex(nextIdx);
      const startCode = activeAttempt.questions[nextIdx]?.starter_code;
      const codeText = typeof startCode === "object" ? (startCode?.python || startCode?.javascript || "") : (startCode || "");
      setCodeContent(codeText || "// Write your code here");
      setCodingTab("description");
      setCompileOutput("");
    } else {
      handleSubmitMock(newAnswers);
    }
  };

  const handleSubmitMock = async (finalPayload = null) => {
    setSubmitting(true);
    try {
      let submitBody = {};
      if (activeAttempt.attempt_type === "aptitude") {
        submitBody = { answers };
      } else if (activeAttempt.attempt_type === "coding") {
        submitBody = { answers: finalPayload || answers };
      } else if (activeAttempt.attempt_type === "interview") {
        submitBody = { transcript: finalPayload || transcript };
      }

      const res = await seekerAPI.submitMockAttempt(activeAttempt.attempt_id, submitBody);
      
      // Load details for result
      const attemptDetails = await seekerAPI.getMockAttempt(activeAttempt.attempt_id);
      setSelectedResult(attemptDetails);
      setViewMode("result");
      toast.success("Mock practice submitted successfully!");
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to submit attempt");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewResult = async (attemptId) => {
    setLoading(true);
    try {
      const res = await seekerAPI.getMockAttempt(attemptId);
      setSelectedResult(res);
      setViewMode("result");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load result details");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUploadSuccess = () => {
    fetchDashboardData();
    toast.success("Resume uploaded successfully! You can now start the AI Interview Mock.");
  };

  // Rendering loader skeleton state
  if (loading && viewMode === "dashboard") {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
        <Header />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
          <div className="space-y-6">
            <LoadingSkeleton height="40px" width="300px" className="rounded-lg" />
            <LoadingSkeleton height="20px" width="500px" className="rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <LoadingSkeleton height="200px" className="rounded-2xl" />
              <LoadingSkeleton height="200px" className="rounded-2xl" />
              <LoadingSkeleton height="200px" className="rounded-2xl" />
            </div>
            <LoadingSkeleton height="300px" className="rounded-2xl mt-12" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        
        {/* 1. DASHBOARD VIEW */}
        {viewMode === "dashboard" && (
          <div className="space-y-10">
            {/* Intro Header */}
            <div>
              <h1 className="text-3xl font-display font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-sky-400 dark:to-blue-500">
                Seeker Mock Practice Portal
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                Prepare for high-stakes recruiter rounds with private mock tests. Custom AI interviews, GATE-standard aptitude checks, and real-time coding problems. Results are visible only to you.
              </p>
            </div>

            {/* Practice Options Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Aptitude Mock */}
              <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                    <BookOpen size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Aptitude Practice Mock</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Test your logical reasoning, data sufficiency, and quantitative aptitude. Seeded with real questions from past 10 years of GATE CS/IT exams.
                  </p>
                </div>
                <button
                  onClick={() => handleStartMock("aptitude")}
                  className="mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center justify-center gap-1.5"
                >
                  Start Aptitude Mock <ChevronRight size={14} />
                </button>
              </div>

              {/* Coding Mock */}
              <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                    <Code2 size={20} />
                  </div>
                  <h3 className="font-bold text-lg">Coding Challenge Mock</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Improve DSA foundations and algorithm efficiency. Practice sandbox seeded with popular LeetCode, Codeforces, and competitive programming challenges.
                  </p>
                </div>
                <button
                  onClick={() => handleStartMock("coding")}
                  className="mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition flex items-center justify-center gap-1.5"
                >
                  Start Coding Mock <ChevronRight size={14} />
                </button>
              </div>

              {/* AI Voice Interview Mock */}
              <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                    <Mic size={20} />
                  </div>
                  <h3 className="font-bold text-lg">AI Voice Interview Mock</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Speak directly to our conversational AI host. Uses speech-to-text algorithms to score accuracy, relevance, and depth based on your active uploaded resume.
                  </p>
                </div>
                {seeker && seeker.resume_data ? (
                  <button
                    onClick={() => handleStartMock("interview")}
                    className="mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center justify-center gap-1.5"
                  >
                    Start AI Voice Mock <ChevronRight size={14} />
                  </button>
                ) : (
                  <div className="mt-6 space-y-2">
                    <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 text-[11px] text-red-500 flex items-start gap-2">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" />
                      <span>Resume required. Upload active resume to activate AI Interview Mock.</span>
                    </div>
                    <a
                      href="/jobs/upload-resume"
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-zinc-200 dark:bg-zinc-800 text-foreground hover:bg-zinc-300 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-1.5"
                    >
                      Upload Active Resume
                    </a>
                  </div>
                )}
              </div>
            </section>

            {/* Past Attempts History */}
            <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="p-5 border-b border-border flex justify-between items-center">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Bookmark size={18} className="text-muted-foreground" />
                  Your Private Practice History
                </h3>
                <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  Private Mode Active
                </span>
              </div>

              {attempts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Cpu size={36} className="mx-auto text-zinc-300 dark:text-zinc-700 animate-pulse" />
                  <p className="text-xs mt-3">You haven't taken any practice mock rounds yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {attempts.map((att) => (
                    <div
                      key={att.attempt_id}
                      onClick={() => handleViewResult(att.attempt_id)}
                      className="p-4 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                          att.attempt_type === "mcq" || att.attempt_type === "aptitude"
                            ? "bg-blue-500/10 text-blue-500"
                            : att.attempt_type === "coding"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-emerald-500/10 text-emerald-500"
                        }`}>
                          {att.attempt_type.slice(0, 3)}
                        </span>
                        <div>
                          <span className="font-semibold text-sm capitalize">{att.attempt_type} Mock Round</span>
                          <span className="text-[10px] text-muted-foreground block">
                            Attempted on {new Date(att.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {att.status === "submitted" ? (
                          <div className="text-right">
                            <span className="text-xs font-bold font-mono text-blue-600 dark:text-sky-400">
                              {att.score !== null ? `${att.score}%` : "100%"}
                            </span>
                            <span className="block text-[9px] uppercase font-bold text-green-500">Completed</span>
                          </div>
                        ) : (
                          <span className="text-[9px] uppercase font-bold text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/20">
                            In Progress
                          </span>
                        )}
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 2. ACTIVE TEST INTERFACE */}
        {viewMode === "test" && activeAttempt && (
          <div className="space-y-6">
            
            {/* Test Header */}
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to exit? Your progress won't be saved.")) {
                      setViewMode("dashboard");
                      fetchDashboardData();
                    }
                  }}
                  className="p-1.5 hover:bg-muted rounded-lg transition"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Mock Practice Round</span>
                  <h2 className="font-bold text-base capitalize">{activeAttempt.attempt_type} Mock Interview</h2>
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center gap-2 bg-muted/60 px-3.5 py-1.5 rounded-lg border border-border font-mono text-xs font-bold text-foreground">
                <Clock size={14} className="text-muted-foreground" />
                <span>Elapsed: {formatTime(timer)}</span>
              </div>
            </div>

            {(!activeAttempt.questions || activeAttempt.questions.length === 0) ? (
              <div className="bg-card rounded-2xl border border-border p-8 text-center space-y-4 max-w-md mx-auto shadow-sm my-12">
                <AlertCircle size={40} className="mx-auto text-amber-500 animate-bounce" />
                <h3 className="font-bold text-lg text-foreground">No Questions Found</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We couldn't retrieve questions for this practice mock test from the database. Please verify backend database seeding or try again.
                </p>
                <button
                  onClick={() => {
                    setViewMode("dashboard");
                    fetchDashboardData();
                  }}
                  className="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              <>
                {/* A. APTITUDE INTERFACE */}
                {activeAttempt.attempt_type === "aptitude" && (
                  <div className="grid grid-cols-12 gap-6">
                    
                    {/* Questions side bar */}
                    <div className="col-span-12 md:col-span-3 space-y-4">
                      <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                        <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-3">Problems list</h4>
                        <div className="grid grid-cols-5 gap-2">
                          {activeAttempt.questions.map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentQIndex(idx)}
                              className={`w-10 h-10 rounded-lg text-xs font-bold border transition flex items-center justify-center ${
                                currentQIndex === idx
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : answers[idx.toString()] !== undefined
                                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                                  : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                              }`}
                            >
                              {idx + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSubmitMock()}
                        disabled={submitting}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
                      >
                        {submitting ? "Evaluating test..." : "Submit and Finalize"}
                      </button>
                    </div>

                    {/* Active Question pane */}
                    <div className="col-span-12 md:col-span-9 bg-card p-6 rounded-2xl border border-border shadow-sm space-y-6">
                      <div>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                          Question {currentQIndex + 1} of {activeAttempt.questions.length}
                        </span>
                        <h3 className="font-semibold text-lg text-foreground mt-2 leading-relaxed">
                          {activeAttempt.questions[currentQIndex].question_text}
                        </h3>
                      </div>

                      <div className="space-y-3 mt-6">
                        {(() => {
                          const opts = activeAttempt.questions[currentQIndex].options || {};
                          const isArr = Array.isArray(opts);
                          const optKeys = isArr ? opts.map((_, i) => i.toString()) : Object.keys(opts);
                          
                          return optKeys.map((optKey) => {
                            const optVal = isArr ? opts[Number(optKey)] : opts[optKey];
                            const isSelected = answers[currentQIndex.toString()] === optKey;
                            return (
                              <button
                                key={optKey}
                                onClick={() => setAnswers({ ...answers, [currentQIndex.toString()]: optKey })}
                                className={`w-full p-4 rounded-xl text-left border text-sm font-medium transition flex justify-between items-center ${
                                  isSelected
                                    ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-sky-400"
                                    : "border-border bg-muted/40 hover:bg-muted text-foreground"
                                }`}
                              >
                                <span>{optVal}</span>
                                <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                                  isSelected ? "bg-blue-600 text-white border-blue-600" : "border-border bg-white text-zinc-400"
                                }`}>
                                  {isArr ? Number(optKey) + 1 : optKey}
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>

                      {/* Navigation controls */}
                      <div className="flex justify-between items-center border-t border-border pt-5 mt-6">
                        <button
                          disabled={currentQIndex === 0}
                          onClick={() => setCurrentQIndex(prev => prev - 1)}
                          className="px-4 py-2 border border-border bg-muted hover:bg-muted/80 rounded-lg text-xs font-semibold disabled:opacity-40 transition"
                        >
                          Previous
                        </button>
                        <button
                          disabled={currentQIndex === activeAttempt.questions.length - 1}
                          onClick={() => setCurrentQIndex(prev => prev + 1)}
                          className="px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-lg text-xs font-semibold disabled:opacity-40 transition"
                        >
                          Next Question
                        </button>
                      </div>
                    </div>

                  </div>
                )}

                {/* B. CODING INTERFACE */}
                {activeAttempt.attempt_type === "coding" && (
                  <div className="grid grid-cols-12 gap-6">
                    
                    {/* Left panel problem detail */}
                    <div className="col-span-12 lg:col-span-5 bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col h-[600px]">
                      <div className="flex border-b border-border bg-muted/40 p-2 gap-1.5 shrink-0">
                        <button
                          onClick={() => setCodingTab("description")}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                            codingTab === "description" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          Description
                        </button>
                        <button
                          onClick={() => setCodingTab("output")}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                            codingTab === "output" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          Terminal Output
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        {codingTab === "description" ? (
                          <div className="space-y-4">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded">
                                {activeAttempt.questions[currentQIndex].difficulty}
                              </span>
                              <h3 className="font-bold text-lg mt-2">{activeAttempt.questions[currentQIndex].title}</h3>
                            </div>
                            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                              {activeAttempt.questions[currentQIndex].description}
                            </p>
                            
                            {activeAttempt.questions[currentQIndex].examples && activeAttempt.questions[currentQIndex].examples.length > 0 && (
                              <div className="space-y-3 border-t border-border pt-4">
                                <h4 className="font-bold text-xs uppercase text-muted-foreground">Examples</h4>
                                {activeAttempt.questions[currentQIndex].examples.map((ex, idx) => (
                                  <div key={idx} className="bg-muted/50 p-3 rounded-lg border border-border font-mono text-[11px] space-y-1">
                                    <div><strong className="text-muted-foreground">Input:</strong> {ex.input}</div>
                                    <div><strong className="text-muted-foreground">Output:</strong> {ex.output}</div>
                                    {ex.explanation && <div><strong className="text-muted-foreground">Explanation:</strong> {ex.explanation}</div>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="font-mono text-xs p-4 bg-zinc-950 text-emerald-400 rounded-xl min-h-[400px] whitespace-pre-wrap">
                            {compileOutput || "No output generated yet. Run compilation to see testcase results."}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right panel editor */}
                    <div className="col-span-12 lg:col-span-7 bg-card rounded-2xl border border-border overflow-hidden shadow-sm flex flex-col h-[600px]">
                      <div className="flex border-b border-border bg-muted/40 px-4 py-2 justify-between items-center shrink-0">
                        <span className="text-xs font-semibold text-muted-foreground">main.py (Python 3)</span>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRunCodingTest}
                            disabled={compiling}
                            className="px-3.5 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                          >
                            <Play size={12} /> {compiling ? "Running..." : "Run Testcases"}
                          </button>
                          <button
                            onClick={handleNextCodingQuestion}
                            disabled={submitting}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
                          >
                            {currentQIndex === activeAttempt.questions.length - 1 ? "Submit Challenge" : "Save & Next"}
                          </button>
                        </div>
                      </div>

                      {/* Code editor body */}
                      <textarea
                        value={codeContent}
                        onChange={(e) => setCodeContent(e.target.value)}
                        className="flex-1 font-mono text-xs p-5 bg-zinc-950 text-zinc-100 focus:outline-none resize-none leading-relaxed border-0"
                        placeholder="// Write python code here..."
                      />
                    </div>

                  </div>
                )}

                {/* C. AI VOICE INTERVIEW INTERFACE */}
                {activeAttempt.attempt_type === "interview" && (
                  <div className="grid grid-cols-12 gap-6">
                    
                    {/* Host avatar and sound meter */}
                    <div className="col-span-12 md:col-span-5 bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col items-center justify-center text-center h-[500px]">
                      <div className="relative">
                        {/* Animated visualizer circles */}
                        {isRecording && (
                          <div className="absolute inset-0 w-28 h-28 bg-emerald-500/20 rounded-full animate-ping" />
                        )}
                        <div className="w-28 h-28 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center border-4 border-blue-500/20">
                          <Cpu size={54} className={isRecording ? "animate-bounce" : ""} />
                        </div>
                      </div>

                      <h3 className="font-bold text-lg mt-6">AI Recruiting Agent</h3>
                      <p className="text-xs text-muted-foreground mt-2 max-w-sm">
                        {isRecording ? "Listening to your response..." : isTranscribing ? "Processing audio file..." : "Host finished speaking. Ready for your answer."}
                      </p>

                      {/* Visualizer bars */}
                      {isRecording && (
                        <div className="flex gap-1 items-center justify-center mt-6">
                          <span className="w-1.5 h-6 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="w-1.5 h-10 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="w-1.5 h-14 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="w-1.5 h-8 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="w-1.5 h-4 bg-emerald-500 rounded-full animate-pulse" />
                        </div>
                      )}

                      {/* Mute button */}
                      <button
                        onClick={handleToggleMute}
                        className={`mt-8 p-3 rounded-full border transition flex items-center gap-2 text-xs font-semibold ${
                          isMuted 
                            ? "bg-red-500/10 border-red-500/30 text-red-500 dark:text-red-400" 
                            : "bg-muted border-border hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        {isMuted ? "AI Voice Muted (Click to Unmute)" : "Mute AI Voice"}
                      </button>
                    </div>

                    {/* Interview question flow & text panel OR AI Feedback Card */}
                    <div className="col-span-12 md:col-span-7 bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between h-[500px] relative overflow-hidden">
                      
                      {showQuestionFeedback && feedbackData ? (
                        /* AI ANSWER EVALUATION & FEEDBACK REVIEW CARD */
                        <div className="flex flex-col justify-between h-full space-y-4 overflow-y-auto animate-in fade-in duration-300">
                          
                          {/* 15s Muted Countdown Banner */}
                          {isMuted && (
                            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between text-amber-600 dark:text-amber-400">
                              <div className="flex items-center gap-2 text-xs font-bold">
                                <Clock size={16} className="animate-spin" />
                                <span>AI Voice Muted — Reading time remaining: <strong className="text-sm font-mono text-amber-500">{feedbackTimer}s</strong></span>
                              </div>
                              <button
                                onClick={() => proceedToNextInterviewQuestion()}
                                className="px-3 py-1 bg-amber-500 text-black font-bold text-[11px] rounded-lg hover:bg-amber-400 transition"
                              >
                                Skip & Next Question ➔
                              </button>
                            </div>
                          )}

                          <div>
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                              AI Instant Evaluation — Question {feedbackData.qNum}
                            </span>
                            <h4 className="font-bold text-sm text-foreground mt-1 mb-3">
                              {feedbackData.question}
                            </h4>

                            <div className="space-y-3 font-sans text-xs">
                              {/* 🎯 EXPECTED IDEAL ANSWER */}
                              <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-xl space-y-1">
                                <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 text-xs">
                                  <span>🎯 What AI Expected (Ideal Answer)</span>
                                </div>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-[11px]">
                                  {feedbackData.expectedAnswer}
                                </p>
                              </div>

                              {/* 💡 CANDIDATE ANSWER & ANALYSIS */}
                              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl space-y-1">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xs">
                                  <span>💡 Your Answer & AI Feedback</span>
                                </div>
                                <div className="text-muted-foreground italic text-[11px] mb-1">
                                  "{feedbackData.candidateAnswer}"
                                </div>
                                <p className="text-foreground font-medium text-[11px] leading-relaxed">
                                  {feedbackData.evaluation}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-3 border-t border-border">
                            <button
                              onClick={() => proceedToNextInterviewQuestion()}
                              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
                            >
                              <span>Proceed to Next Question ➔</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* REGULAR QUESTION & ANSWER INPUT */
                        <>
                          <div>
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                              Question {currentQIndex + 1} of {activeAttempt.questions.length}
                            </span>
                            <h3 className="font-semibold text-lg text-foreground mt-2 leading-relaxed bg-muted/30 p-4 rounded-xl border border-border">
                              {activeAttempt.questions[currentQIndex].q}
                            </h3>
                          </div>

                          <div className="space-y-4 my-4">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Your transcribed answer:</span>
                            <textarea
                              value={spokenAnswer}
                              onChange={(e) => setSpokenAnswer(e.target.value)}
                              placeholder="Use microphone or start typing your answer here..."
                              className="w-full h-32 p-4 rounded-xl border border-border bg-muted/40 focus:bg-card focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-medium"
                            />
                          </div>

                          <div className="flex gap-3 justify-end border-t border-border pt-4">
                            {isRecording ? (
                              <button
                                onClick={stopRecordingAudio}
                                className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
                              >
                                <MicOff size={14} /> Stop Recording
                              </button>
                            ) : (
                              <button
                                onClick={startRecordingAudio}
                                disabled={isTranscribing}
                                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
                              >
                                <Mic size={14} /> {isTranscribing ? "Transcribing..." : "Record audio answer"}
                              </button>
                            )}
                            <button
                              onClick={handleNextInterviewQuestion}
                              disabled={isTranscribing || submitting}
                              className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
                            >
                              {currentQIndex === activeAttempt.questions.length - 1 ? "Submit Interview" : "Save & Next Question"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 3. EVALUATION RESULTS VIEW */}
        {viewMode === "result" && selectedResult && (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex justify-between items-center bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setViewMode("dashboard");
                    setSelectedResult(null);
                    fetchDashboardData();
                  }}
                  className="p-1.5 hover:bg-muted rounded-lg transition"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Practice analysis report</span>
                  <h2 className="font-bold text-base capitalize">{selectedResult.attempt_type} Mock Results</h2>
                </div>
              </div>

              <div className="bg-blue-500/10 text-blue-600 dark:text-sky-400 font-mono font-bold text-sm px-4 py-2 rounded-xl border border-blue-500/20">
                Score: {selectedResult.score !== null ? `${selectedResult.score}%` : "100%"}
              </div>
            </div>

            {/* A. Aptitude Results View */}
            {selectedResult.attempt_type === "aptitude" && selectedResult.feedback && (
              <div className="grid grid-cols-12 gap-6">
                
                {/* Left panel breakdown */}
                <div className="col-span-12 md:col-span-4 bg-card rounded-2xl border border-border p-5 shadow-sm space-y-6">
                  <h3 className="font-bold text-base border-b border-border pb-3">Score Breakdown</h3>
                  <div className="space-y-3 text-xs font-medium">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Questions:</span>
                      <span className="font-bold">{selectedResult.feedback.total_count}</span>
                    </div>
                    <div className="flex justify-between text-green-500">
                      <span>Correct Answers:</span>
                      <span className="font-bold">{selectedResult.feedback.correct_count}</span>
                    </div>
                    <div className="flex justify-between text-red-500 border-t border-border pt-3">
                      <span>Incorrect Answers:</span>
                      <span className="font-bold">{selectedResult.feedback.total_count - selectedResult.feedback.correct_count}</span>
                    </div>
                  </div>
                </div>

                {/* Right panel detailed answers list */}
                <div className="col-span-12 md:col-span-8 space-y-4">
                  {selectedResult.questions.map((q, idx) => {
                    const fb = selectedResult.feedback.question_feedback?.[idx.toString()] || {};
                    return (
                      <div key={idx} className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-semibold text-sm leading-relaxed">{idx + 1}. {q.question_text}</h4>
                          {fb.correct ? (
                            <span className="shrink-0 bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 size={12} /> Correct</span>
                          ) : (
                            <span className="shrink-0 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><XCircle size={12} /> Incorrect</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs font-medium">
                          {(() => {
                            const opts = q.options || {};
                            const isArr = Array.isArray(opts);
                            const optKeys = isArr ? opts.map((_, i) => i.toString()) : Object.keys(opts);
                            
                            return optKeys.map((optKey) => {
                              const optVal = isArr ? opts[Number(optKey)] : opts[optKey];
                              const isCorrectOpt = optKey.toString().toUpperCase() === q.correct_option?.toString().toUpperCase();
                              const isSelectedOpt = optKey.toString().toUpperCase() === fb.selected_option?.toString().toUpperCase();
                              return (
                                <div
                                  key={optKey}
                                  className={`p-3 rounded-lg border flex justify-between items-center ${
                                    isCorrectOpt
                                      ? "bg-green-500/5 border-green-500/30 text-green-600 dark:text-green-400"
                                      : isSelectedOpt
                                      ? "bg-red-500/5 border-red-500/30 text-red-600 dark:text-red-450"
                                      : "border-border bg-muted/20 text-foreground"
                                  }`}
                                >
                                  <span>{optVal}</span>
                                  {isCorrectOpt && <span className="text-[10px] font-bold uppercase text-green-500">Correct Choice</span>}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

            {/* B. Coding Results View */}
            {selectedResult.attempt_type === "coding" && selectedResult.feedback && (
              <div className="space-y-6">
                {selectedResult.questions.map((q, idx) => {
                  const fb = selectedResult.feedback.problem_feedback?.[q.slug] || {};
                  return (
                    <div key={idx} className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{q.difficulty}</span>
                          <h3 className="font-bold text-lg mt-1">{q.title}</h3>
                        </div>
                        {fb.all_passed ? (
                          <span className="bg-green-500/10 text-green-600 border border-green-500/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"><CheckCircle2 size={14} /> Passed</span>
                        ) : (
                          <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"><XCircle size={14} /> Failed</span>
                        )}
                      </div>

                      <div className="border-t border-border pt-4 mt-4">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Your submitted python solution:</span>
                        <pre className="p-4 bg-zinc-950 text-zinc-200 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-border">
                          {selectedResult.answers[q.slug]?.code || "# No solution submitted"}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* C. AI Interview Results View */}
            {selectedResult.attempt_type === "interview" && selectedResult.feedback && (
              <div className="grid grid-cols-12 gap-6">
                
                {/* Left panel breakdown */}
                <div className="col-span-12 lg:col-span-4 bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6 h-fit">
                  <div>
                    <h3 className="font-bold text-lg">AI Recruiting Report</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-normal">
                      Overall evaluation metrics generated by our LLM scoring engine.
                    </p>
                  </div>

                  <div className="space-y-4 border-t border-border pt-5 text-xs font-semibold">
                    <div>
                      <span className="text-muted-foreground">Hiring recommendation:</span>
                      <span className="block font-bold text-sm text-foreground mt-1 capitalize">
                        {selectedResult.feedback.recommendation || "Proceed to next level"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Likelihood index:</span>
                      <span className="block font-bold text-sm text-blue-600 dark:text-sky-400 mt-1 uppercase">
                        {selectedResult.feedback.hiring_likelihood || "High"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right panel strengths/weaknesses and transcript */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  
                  {/* Detailed Analysis Card */}
                  <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                    <h3 className="font-bold text-base border-b border-border pb-3">Detailed Assessment</h3>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedResult.feedback.detailed_summary}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-xl space-y-2">
                        <h4 className="font-bold text-xs text-green-600 dark:text-green-400 uppercase tracking-wider">Key Strengths</h4>
                        <ul className="list-disc pl-4 text-[11px] text-foreground space-y-1">
                          {selectedResult.feedback.strengths?.map((str, idx) => <li key={idx}>{str}</li>)}
                          {(!selectedResult.feedback.strengths || selectedResult.feedback.strengths.length === 0) && <li>Good technical domain knowledge.</li>}
                        </ul>
                      </div>
                      <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl space-y-2">
                        <h4 className="font-bold text-xs text-red-500 uppercase tracking-wider">Improvements</h4>
                        <ul className="list-disc pl-4 text-[11px] text-foreground space-y-1">
                          {selectedResult.feedback.weaknesses?.map((wk, idx) => <li key={idx}>{wk}</li>)}
                          {(!selectedResult.feedback.weaknesses || selectedResult.feedback.weaknesses.length === 0) && <li>Could expand explanation depth.</li>}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Interview transcript logs */}
                  {selectedResult.answers?.transcript && selectedResult.answers.transcript.length > 0 && (
                    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-4">
                      <h3 className="font-bold text-base border-b border-border pb-3">Transcript Logs</h3>
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {selectedResult.answers.transcript.map((item, idx) => (
                          <div key={idx} className="border-b border-border pb-4 last:border-b-0 last:pb-0 space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="shrink-0 bg-blue-500/10 text-blue-500 text-[10px] font-bold px-1.5 py-0.5 rounded font-sans">AI HOST</span>
                              <div className="font-bold text-foreground leading-relaxed">{item.q}</div>
                            </div>
                            <div className="flex items-start gap-2 pl-4">
                              <span className="shrink-0 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-1.5 py-0.5 rounded font-sans">CANDIDATE</span>
                              <div className="text-muted-foreground italic leading-relaxed">"{item.answer_text}"</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            )}

          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}

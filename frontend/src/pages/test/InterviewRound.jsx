import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { testAPI } from "../../lib/api";
import { TestShell } from "../../components/test/TestShell";
import { useVoiceInterview } from "../../hooks/useVoiceInterview";
import { toast } from "react-hot-toast";

export default function InterviewRound() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const isMockTest = searchParams.get("is_mock_test") === "true";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [context, setContext] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);

  const updateIdx = (newIdx) => {
    setIdx(newIdx);
    idxRef.current = newIdx;
  };

  // Device diagnostic waiting room states
  const [deviceCheckPassed, setDeviceCheckPassed] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [micVolume, setMicVolume] = useState(0);
  const [cameraStatus, setCameraStatus] = useState("checking"); // "checking" | "allowed" | "denied"

  // Interview state logs
  const [spokenAnswer, setSpokenAnswer] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const localVideoRef = useRef(null);
  const activeVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize Voice Interview hook
  const {
    phase,
    startRecording,
    stopRecording,
    speakText,
    isAiSpeaking,
    isRecording,
    isTranscribing
  } = useVoiceInterview({
    token,
    onTranscriptReady: (text) => handleTranscript(text)
  });

  // Fetch initial context and questions
  useEffect(() => {
    if (!token) {
      setError("Missing token.");
      setLoading(false);
      return;
    }

    Promise.all([
      testAPI.validateToken(token),
      testAPI.getInterviewQuestions()
    ])
      .then(([ctxRes, qRes]) => {
        setContext(ctxRes);
        setQuestions(qRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load voice interview.");
        setLoading(false);
      });
  }, [token]);

  // Request media permissions for Waiting Room diagnostics
  useEffect(() => {
    if (loading || deviceCheckPassed || error) return;

    let stream = null;
    let audioCtx = null;
    let analyser = null;
    let source = null;
    let cancelled = false;

    (async () => {
      try {
        setCameraStatus("checking");
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setCameraStatus("allowed");

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Setup microphone level indicator
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioCtx();
        analyser = audioCtx.createAnalyser();
        source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 64;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const checkVolume = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const avg = sum / dataArray.length;
          setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
          requestAnimationFrame(checkVolume);
        };
        checkVolume();

      } catch (err) {
        console.error("Diagnostic permission failed", err);
        setCameraStatus("denied");
      }
    })();

    return () => {
      cancelled = true;
      if (audioCtx) audioCtx.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [loading, deviceCheckPassed, error]);

  // Handle entry into the active interview room
  const handleEnterInterview = () => {
    // Release waiting room media streams
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    setDeviceCheckPassed(true);

    // Promptly request fresh stream for active split video feed
    setTimeout(async () => {
      try {
        const activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(activeStream);
        if (activeVideoRef.current) {
          activeVideoRef.current.srcObject = activeStream;
        }
        
        // Start interview welcome TTS - FoloUp automated trigger
        speakText("Hello! I am your AI interviewer today. Let's begin the interview. Here is your first question.", () => {
          if (questions && questions[0]) {
            speakText(questions[0].q, () => {
              startRecording();
            });
          }
        });
      } catch (err) {
        console.error("Failed to load active webcam stream", err);
        toast.error("Camera access required for live assessment.");
      }
    }, 100);
  };

  // Real-time canvas recording visualizer
  useEffect(() => {
    if (!isRecording || !localStream) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    let audioCtx = null;
    let analyser = null;
    let source = null;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtx();
      analyser = audioCtx.createAnalyser();
      
      // Connect local audio track to visualizer
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const tempStream = new MediaStream([audioTrack]);
        source = audioCtx.createMediaStreamSource(tempStream);
        source.connect(analyser);
      }

      analyser.fftSize = 128;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;

        const drawWave = () => {
          if (!isRecording) return;
          animationFrameRef.current = requestAnimationFrame(drawWave);
          analyser.getByteFrequencyData(dataArray);

          ctx.fillStyle = "rgba(15, 23, 42, 0.4)"; // dark slate
          ctx.fillRect(0, 0, w, h);

          const barWidth = (w / bufferLength) * 1.5;
          let barHeight;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            ctx.fillStyle = `rgb(59, 130, 246)`; // Brand Blue
            ctx.fillRect(x, h - barHeight, barWidth - 1, barHeight);
            x += barWidth;
          }
        };
        drawWave();
      }
    } catch (e) {
      console.error("Active audio visualizer error", e);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioCtx) audioCtx.close();
    };
  }, [isRecording, localStream]);

  // Process answers received from recording transcription
  const handleTranscript = async (text) => {
    if (!text || text.trim() === "" || text.includes("Microphone captured silence") || text.includes("Transcription Error")) {
      speakText("I couldn't hear you clearly. Could you please repeat that?", () => {
        startRecording();
      });
      return;
    }

    setSpokenAnswer(text);
    setAiGenerating(true);
    setAiResponse("Evaluating response...");

    const currentIdx = idxRef.current;
    const q = questions[currentIdx];
    try {
      const res = await testAPI.submitInterviewAnswer(q.index, text);
      const feedback = res.feedback || "Thank you for that answer.";
      setAiResponse(feedback);
      
      // Auto conversational transition - FoloUp hands-free pattern
      if (currentIdx === questions.length - 1) {
        speakText(`${feedback} Thank you! You have answered all questions. The interview is now complete.`, () => {
          setCompleted(true);
          if (localStream) {
            localStream.getTracks().forEach((t) => t.stop());
          }
        });
      } else {
        const nextIdx = currentIdx + 1;
        const nextQ = questions[nextIdx];
        
        const transitions = [
          "Interesting, thank you. Let's move to our next question.",
          "Got it, thank you. Let me ask you this next.",
          "Thank you for sharing that. Moving on.",
          "Understood. Ready for the next question?"
        ];
        const selectedTransition = transitions[Math.floor(Math.random() * transitions.length)];
        
        // Sync screen question immediately so the text matches the spoke question
        updateIdx(nextIdx);
        
        speakText(`${feedback} ${selectedTransition} ${nextQ.q}`, () => {
          // Clear old response logs and start recording once AI finishes speaking
          setSpokenAnswer("");
          setAiResponse("");
          startRecording();
        });
      }
    } catch (err) {
      toast.error(err.message || "Failed to submit answer.");
      setAiResponse("Could not contact the evaluation agent.");
      speakText("There was an error saving your response. Let's try recording again.", () => {
        startRecording();
      });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleNext = () => {
    // Retain manual skip/next button support as fallback
    setSpokenAnswer("");
    setAiResponse("");
    const currentIdx = idxRef.current;
    if (currentIdx === questions.length - 1) {
      setCompleted(true);
      speakText("Thank you! You have answered all questions. You may now submit and exit the interview.");
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    } else {
      const nextIdx = currentIdx + 1;
      updateIdx(nextIdx);
      const nextQ = questions[nextIdx];
      speakText(nextQ.q, () => {
        startRecording();
      });
    }
  };

  const handleFinalSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Release camera streams
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      
      await testAPI.finalizeInterview();
      toast.success("Interview completed! Your answers are submitted.");
      
      const currentRoundNum = context.round_number;
      const nextRound = context.sibling_rounds?.find((r) => r.round_number === currentRoundNum + 1 || (r.status === "pending" && r.round_type !== "interview"));
      
      if (nextRound && nextRound.token) {
        navigate(`/test/${nextRound.round_type}?token=${nextRound.token}`);
      } else {
        if (context?.application_id) {
          navigate(`/jobs/applications?app_id=${context.application_id}`);
        } else {
          navigate("/jobs/applications");
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to finalize interview.");
      setSubmitting(false);
    }
  };

  // Handle teardown
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [localStream]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F6F2]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-xs text-gray-500 font-medium font-sans">Connecting to Voice Chamber...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-5 font-sans">
        <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
          <h3 className="font-semibold text-gray-900 text-base">Error Loading Interview</h3>
          <p className="text-xs text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const totalQuestions = questions.length;

  // --- RENDERING WAITING ROOM SCREEN ---
  if (!deviceCheckPassed) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex flex-col justify-between p-6 font-sans">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-2xl bg-white border border-gray-250/60 rounded-3xl p-8 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-6 space-y-5">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">Hardware Setup</span>
                <h1 className="text-xl font-bold text-gray-800 mt-1 leading-tight">AI Interview Diagnostics</h1>
                <p className="text-xs text-gray-500 mt-1 leading-normal">
                  Before launching the interview, please grant permission and test your hardware checks.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    cameraStatus === "allowed" ? "bg-green-100 text-green-700" : (cameraStatus === "denied" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-400")
                  }`}>
                    {cameraStatus === "allowed" ? "✓" : (cameraStatus === "denied" ? "✗" : "•")}
                  </div>
                  <span className="text-xs font-semibold text-gray-700">Webcam Diagnostic Check</span>
                </div>

                <div className="space-y-1.5 pl-8">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Microphone Gain level</span>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-75" style={{ width: `${micVolume}%` }} />
                  </div>
                  <span className="text-[9px] text-gray-400">Speak to see volume levels rise.</span>
                </div>
              </div>

              <button
                onClick={handleEnterInterview}
                disabled={cameraStatus !== "allowed"}
                className="w-full rounded-2xl bg-blue-600 py-3 text-xs font-bold text-white shadow hover:bg-blue-700 transition disabled:opacity-40"
              >
                Enter Assessment Room
              </button>
            </div>

            <div className="md:col-span-6 flex flex-col justify-center">
              <div className="aspect-video w-full rounded-2xl bg-slate-900 overflow-hidden border border-gray-150 flex items-center justify-center relative shadow-inner">
                {cameraStatus === "allowed" ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="text-center p-4">
                    <span className="text-xs text-slate-400 block font-medium">Camera Feed Offline</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Check browser permissions to continue</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING ACTIVE INTERVIEW split screen ---
  return (
    <TestShell
      roundName={context.round_name}
      roundType="interview"
      minutes={context.time_limit_minutes}
      candidateName={context.candidate_name}
      jobTitle={context.job_title}
      companyName={context.company_name}
      siblingRounds={context.sibling_rounds}
      onExpiry={handleFinalSubmit}
    >
      <div className="flex h-full items-center justify-center p-5 overflow-hidden font-sans">
        <div className="flex h-full w-full max-w-5xl flex-col rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-gray-150 px-6 py-3.5 bg-slate-50/50">
            <span className="font-semibold text-xs text-slate-700 tracking-wider">
              {!completed ? `Question ${idx + 1} of ${totalQuestions}` : "Interview Completed"}
            </span>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Review Proctored</span>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {!completed ? (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden h-full">
                
                {/* Left Panel: AI Avatar Orb & Question */}
                <div className="md:col-span-6 p-8 border-r border-gray-150 flex flex-col justify-between items-center text-center bg-slate-50/20">
                  <div className="flex-1 flex flex-col justify-center items-center space-y-6 w-full">
                    {/* Orb */}
                    <div className="relative h-28 w-28 flex items-center justify-center">
                      <div className={`absolute inset-0 rounded-full bg-blue-500/10 blur-xl transition duration-700 ${
                        isAiSpeaking ? "scale-150 opacity-100" : "scale-100 opacity-40"
                      }`} />
                      <div className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 border-2 border-blue-500 shadow-xl text-white font-bold text-base transition duration-300 ${
                        isAiSpeaking ? "animate-pulse scale-105 border-blue-400" : ""
                      }`}>
                        {isTranscribing ? (
                          <div className="flex gap-1.5 items-center">
                            <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="h-1.5 w-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        ) : (
                          "AI HOST"
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 w-full">
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest block">Active Question</span>
                      <h2 className="text-base font-bold text-gray-800 leading-normal max-w-md mx-auto">{q?.q}</h2>
                    </div>
                  </div>

                  {/* Recorder button controls */}
                  <div className="w-full max-w-sm pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex justify-center gap-3">
                      {!isRecording ? (
                        <button
                          onClick={startRecording}
                          disabled={isAiSpeaking || isTranscribing || aiGenerating}
                          className="flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 text-xs shadow-sm transition disabled:opacity-40"
                        >
                          <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                          Record Answer
                        </button>
                      ) : (
                        <button
                          onClick={stopRecording}
                          className="flex items-center gap-2 rounded-full bg-slate-950 hover:bg-slate-900 text-white font-bold px-6 py-2.5 text-xs shadow-sm transition"
                        >
                          <span className="h-2 w-2 bg-red-500 rounded-sm animate-pulse" />
                          Stop Recording
                        </button>
                      )}
                    </div>

                    {isRecording && (
                      <span className="text-[10px] text-blue-500 font-semibold animate-pulse block">🎙️ Listening... speak now. (Auto-saves when you stop talking)</span>
                    )}

                    {isTranscribing && (
                      <span className="text-[10px] text-slate-400 font-semibold animate-pulse block">⚙️ Transcribing spoken voice answer...</span>
                    )}
                  </div>
                </div>

                {/* Right Panel: Candidate Webcam monitor & Logs */}
                <div className="md:col-span-6 flex flex-col justify-between overflow-hidden h-full">
                  <div className="p-6 flex-1 overflow-y-auto space-y-5">
                    {/* Webcam preview stream */}
                    <div className="aspect-video w-full rounded-2xl bg-slate-900 border border-slate-100 overflow-hidden relative shadow-sm flex items-center justify-center">
                      <video
                        ref={activeVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover transform -scale-x-100"
                      />
                      
                      {/* Audio waveform overlay */}
                      {isRecording && (
                        <div className="absolute inset-0 bg-slate-950/40 flex flex-col justify-end">
                          <canvas ref={canvasRef} width={400} height={40} className="w-full h-10 opacity-80" />
                        </div>
                      )}
                    </div>

                    {/* Speech response logs */}
                    {(spokenAnswer || aiResponse) && (
                      <div className="rounded-2xl border border-gray-150 bg-slate-50/50 p-4 text-xs space-y-3.5 leading-relaxed">
                        {spokenAnswer && (
                          <div>
                            <span className="font-bold text-gray-400 uppercase tracking-wide block text-[9px]">Your Answer:</span>
                            <p className="mt-0.5 text-slate-800 italic">"{spokenAnswer}"</p>
                          </div>
                        )}
                        {aiResponse && (
                          <div className="border-t border-slate-200/60 pt-2.5">
                            <span className="font-bold text-blue-600 uppercase tracking-wide block text-[9px]">AI Assistant Evaluation:</span>
                            <p className="mt-0.5 text-slate-700">{aiResponse}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-end">
                    {spokenAnswer && !aiGenerating && (
                      <button
                        onClick={handleNext}
                        className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 text-xs shadow-sm"
                      >
                        {idx === totalQuestions - 1 ? "Complete Interview →" : "Next Question"}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/10">
                <div className="w-full max-w-md space-y-5">
                  <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">Assessment Complete!</h2>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                      All your voice responses and proctoring telemetry logs have been compiled successfully. Press below to finalize.
                    </p>
                  </div>

                  <button
                    onClick={handleFinalSubmit}
                    disabled={submitting}
                    className="w-full rounded-2xl bg-green-600 py-3 text-xs font-bold text-white shadow-md hover:bg-green-700 transition"
                  >
                    {submitting ? "Finalizing..." : "Submit and Exit Test Portal"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TestShell>
  );
}

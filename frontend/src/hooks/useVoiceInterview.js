import { useState, useRef, useCallback } from "react";
import { testAPI } from "../lib/api";

export function useVoiceInterview({ token, onTranscriptReady }) {
  const [phase, setPhase] = useState("idle");
  // "idle" | "ai_speaking" | "recording" | "transcribing" | "complete"
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioStreamRef = useRef(null);

  // Speak text with natural speech settings
  const speakText = useCallback((text, onDone) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setPhase("idle");
      onDone?.();
      return;
    }

    setPhase("ai_speaking");
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.90; // Natural, conversational speed
    utterance.pitch = 1.0;
    
    // Attempt to use a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.name.includes("Google") && v.lang.startsWith("en")
    ) || voices.find(
      (v) => v.lang.startsWith("en")
    ) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      setPhase("idle");
      onDone?.();
    };

    utterance.onerror = () => {
      setPhase("idle");
      onDone?.();
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Start recording microphone
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setPhase("transcribing");
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        
        try {
          const res = await testAPI.transcribeAudio(blob);
          if (res && res.text) {
            onTranscriptReady?.(res.text);
          } else {
            onTranscriptReady?.("[Microphone captured silence. Please try again.]");
          }
        } catch (err) {
          console.error("Audio transcription failed", err);
          onTranscriptReady?.("[Transcription Error: Please verify network connectivity.]");
        } finally {
          setPhase("idle");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setPhase("recording");
    } catch (err) {
      console.error("Failed to start voice capture", err);
      alert("Microphone permission denied or not found.");
      setPhase("idle");
    }
  }, [onTranscriptReady]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      setPhase("transcribing");
    }
  }, []);

  return {
    phase,
    startRecording,
    stopRecording,
    speakText,
    isAiSpeaking: phase === "ai_speaking",
    isRecording: phase === "recording",
    isTranscribing: phase === "transcribing"
  };
}

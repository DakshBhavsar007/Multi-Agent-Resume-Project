import { useState, useRef, useEffect } from "react";
import { testAPI } from "../../lib/api";

export function VoiceRecorder({ onTranscript, onStateChange }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (recording) {
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setTranscribing(true);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
          const res = await testAPI.transcribeAudio(blob);
          if (res && res.text) {
            onTranscript(res.text);
          }
        } catch (err) {
          console.error("Transcription failed", err);
          onTranscript("[Transcription Error: Please verify your microphone or check network.]");
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      if (onStateChange) onStateChange(true);
    } catch (err) {
      console.error("Could not start recording", err);
      alert("Microphone permission denied or not found.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      // Stop all tracks to release hardware light
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      if (onStateChange) onStateChange(false);
    }
  };

  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {!recording ? (
          <button
            onClick={startRecording}
            disabled={transcribing}
            className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-red-700 transition disabled:bg-gray-400"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
            {transcribing ? "Transcribing..." : "Record Answer"}
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-gray-800 transition"
          >
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
            Stop Recording ({m}:{s})
          </button>
        )}
      </div>
      {transcribing && (
        <span className="text-xs text-gray-500 animate-pulse">
          Processing voice and transcribing using AI...
        </span>
      )}
    </div>
  );
}

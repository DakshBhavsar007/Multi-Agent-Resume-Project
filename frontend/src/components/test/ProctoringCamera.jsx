import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { testAPI } from "../../lib/api";

export function ProctoringCamera() {
  const [searchParams] = useSearchParams();
  const isMockTest = searchParams.get("is_mock_test") === "true";

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pos, setPos] = useState(() => ({ x: window.innerWidth - 280, y: 88 }));
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);
  const [status, setStatus] = useState("loading");
  const [streamReady, setStreamReady] = useState(false);

  // Camera setup
  useEffect(() => {
    let stream = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreamReady(true);
        }
      } catch (err) {
        console.error("Camera access failed", err);
        setStatus("blocked");
        // Log block violation once
        try {
          if (isMockTest) {
            console.warn("Mock Test Mode: Skipping camera_blocked proctoring log.");
          } else {
            testAPI.saveProctoringFlag("camera_blocked", "");
          }
        } catch (e) {
          console.error(e);
        }
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Proctoring: Tab switch visibility check
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        try {
          if (isMockTest) {
            console.warn("Mock Test Mode: Skipping tab_switch proctoring log.");
          } else {
            testAPI.saveProctoringFlag("tab_switch", "");
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Human / face detection (FaceDetector when available, motion / presence fallback)
  useEffect(() => {
    if (!streamReady) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const FD = typeof window !== "undefined" ? window.FaceDetector : undefined;
    const detector = FD ? new FD({ fastMode: true }) : null;
    let prev = null;
    let cancelled = false;
    let missingStreak = 0;

    const tick = async () => {
      if (cancelled || video.readyState < 2) {
        if (!cancelled) requestAnimationFrame(tick);
        return;
      }
      try {
        let isDetected = false;
        if (detector) {
          const faces = await detector.detect(video);
          isDetected = faces.length > 0;
          setStatus(isDetected ? "detected" : "missing");
        } else {
          canvas.width = 64;
          canvas.height = 48;
          ctx.drawImage(video, 0, 0, 64, 48);
          const cur = ctx.getImageData(0, 0, 64, 48);
          if (prev) {
            let diff = 0;
            for (let i = 0; i < cur.data.length; i += 16) {
              diff += Math.abs(cur.data[i] - prev.data[i]);
            }
            // average brightness as a presence proxy
            let bright = 0;
            for (let i = 0; i < cur.data.length; i += 16) bright += cur.data[i];
            const avgBright = bright / (cur.data.length / 16);
            isDetected = avgBright > 25 && diff > 50;
            setStatus(isDetected ? "detected" : "missing");
          }
          prev = cur;
        }

        // If missing for too long (e.g. 5 ticks in a row = ~4 seconds), send proctoring alert flag
        if (!isDetected && status !== "blocked") {
          missingStreak++;
          if (missingStreak === 5) {
            // Take screenshot
            const fullCanvas = document.createElement("canvas");
            fullCanvas.width = video.videoWidth;
            fullCanvas.height = video.videoHeight;
            fullCanvas.getContext("2d")?.drawImage(video, 0, 0);
            const screenshot = fullCanvas.toDataURL("image/jpeg", 0.5);

            if (isMockTest) {
              console.warn("Mock Test Mode: Skipping no_face proctoring flag save.");
            } else {
              testAPI.saveProctoringFlag("no_face", screenshot).catch(console.error);
            }
          }
        } else {
          missingStreak = 0;
        }
      } catch (err) {
        // ignore frame errors
      }
      setTimeout(() => {
        if (!cancelled) requestAnimationFrame(tick);
      }, 800);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [streamReady]);

  // Drag handlers
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const w = containerRef.current?.offsetWidth ?? 260;
      const h = containerRef.current?.offsetHeight ?? 200;
      const x = Math.min(Math.max(0, e.clientX - dragOffset.current.x), window.innerWidth - w);
      const y = Math.min(Math.max(0, e.clientY - dragOffset.current.y), window.innerHeight - h);
      setPos({ x, y });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  const startDrag = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  };

  const statusMeta = {
    loading: { label: "Initializing", dot: "bg-gray-400" },
    detected: { label: "Human detected", dot: "bg-green-500" },
    missing: { label: "No face in frame", dot: "bg-amber-500" },
    error: { label: "Camera error", dot: "bg-red-500" },
    blocked: { label: "Camera blocked", dot: "bg-red-500" },
  }[status] || { label: "Initializing", dot: "bg-gray-400" };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 select-none"
      style={{
        left: pos.x,
        top: pos.y,
        width: minimized ? 200 : 260,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
        transition: dragging ? "none" : "width 180ms ease",
      }}
    >
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div
          onMouseDown={startDrag}
          className="flex cursor-grab items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2 active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${statusMeta.dot} ${status === "detected" ? "animate-pulse" : ""}`} />
            <span className="text-[11px] font-medium text-gray-800">Proctor</span>
            <span className="text-[11px] text-gray-500">· {statusMeta.label}</span>
          </div>
          <button
            onClick={() => setMinimized((m) => !m)}
            className="grid h-6 w-6 place-items-center rounded-full text-gray-400 hover:bg-gray-100"
            aria-label={minimized ? "Expand camera" : "Minimize camera"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {minimized ? <path d="M5 12h14" /> : <path d="M6 9l6 6 6-6" />}
            </svg>
          </button>
        </div>
        {!minimized && (
          <div className="relative aspect-[4/3] bg-black">
            {status !== "blocked" ? (
              <video
                ref={videoRef}
                className="h-full w-full scale-x-[-1] object-cover"
                muted
                playsInline
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center bg-gray-900 text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 mb-2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-[11px] font-medium">Camera Access Blocked</div>
                <div className="text-[9px] text-gray-400 mt-1">Please enable webcam to continue the assessment.</div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            {/* corner brackets */}
            <div className="pointer-events-none absolute inset-3">
              {(["tl", "tr", "bl", "br"]).map((c) => (
                <span
                  key={c}
                  className={`absolute h-4 w-4 border-blue-500 ${
                    c === "tl" ? "left-0 top-0 border-l-2 border-t-2" :
                    c === "tr" ? "right-0 top-0 border-r-2 border-t-2" :
                    c === "bl" ? "bottom-0 left-0 border-b-2 border-l-2" :
                    "bottom-0 right-0 border-b-2 border-r-2"
                  }`}
                />
              ))}
            </div>
            {status !== "blocked" && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> REC
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

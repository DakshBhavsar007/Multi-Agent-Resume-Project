import { useEffect, useState } from "react";

export function RoundTimer({ minutes, onExpiry }) {
  const [sec, setSec] = useState(minutes * 60);

  useEffect(() => {
    setSec(minutes * 60);
  }, [minutes]);

  useEffect(() => {
    const id = setInterval(() => {
      setSec((s) => {
        if (s <= 1) {
          clearInterval(id);
          onExpiry();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onExpiry]);

  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  const low = sec < 60;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        low
          ? "border-red-200 bg-red-50 text-red-600 animate-pulse"
          : "border-gray-200 bg-white text-gray-800"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M9 2h6" />
      </svg>
      <span className="font-mono tabular-nums">{m}:{s}</span>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ProctoringCamera } from "./ProctoringCamera";
import { RoundTimer } from "./RoundTimer";

export function TestShell({
  children,
  roundName,
  roundType,
  minutes,
  candidateName,
  jobTitle,
  companyName,
  siblingRounds = [],
  onExpiry
}) {
  const navigate = useNavigate();

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  const getRoundColorClass = (type) => {
    if (type === "mcq") return "bg-blue-500";
    if (type === "coding") return "bg-red-500";
    return "bg-green-500";
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50 text-gray-900 overflow-hidden font-sans">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              W
            </span>
            <span className="font-semibold text-lg tracking-tight">
              <span className="text-blue-600">W</span>
              <span className="text-red-500">o</span>
              <span className="text-yellow-500">r</span>
              <span className="text-blue-500">k</span>
              <span className="text-green-500">l</span>
              <span className="text-red-500">y</span>
            </span>
          </div>

          <div className="hidden h-6 w-px bg-gray-200 md:block" />

          {/* Sibling Rounds Tracker */}
          <nav className="hidden items-center gap-1.5 md:flex">
            {siblingRounds.map((r, i) => {
              const active = r.round_type === roundType;
              const isCompleted = r.status === "submitted" || r.status === "evaluated";

              return (
                <button
                  key={r.token}
                  disabled={isCompleted && !active}
                  onClick={() => {
                    if (r.token && !active) {
                      navigate(`/test/${r.round_type}?token=${r.token}`);
                    }
                  }}
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? "bg-blue-50 text-blue-700 border border-blue-100"
                      : isCompleted
                      ? "text-green-600 hover:bg-gray-50"
                      : "text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                      active
                        ? "bg-blue-600 text-white"
                        : isCompleted
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isCompleted ? "✓" : i + 1}
                  </span>
                  {r.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden flex-col items-end text-right md:flex">
            <span className="text-xs font-semibold text-gray-800">{jobTitle}</span>
            <span className="text-[10px] text-gray-500">{companyName}</span>
          </div>

          <div className="h-6 w-px bg-gray-200 hidden md:block" />

          {/* Time Limit & Timer */}
          {minutes > 0 && (
            <RoundTimer minutes={minutes} onExpiry={onExpiry} />
          )}

          {/* Candidate Avatar */}
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 shadow-sm">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {getInitials(candidateName)}
            </span>
            <span className="hidden text-xs font-medium text-gray-700 sm:block">
              {candidateName}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative flex-1 overflow-hidden">
        {children}
      </main>

      {/* Float Proctoring Camera */}
      <ProctoringCamera />
    </div>
  );
}

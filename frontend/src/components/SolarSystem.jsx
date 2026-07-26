'use client';

import React, { useState } from "react";
import { Orbit as OrbitIcon, Bot, Cpu, Database, FileCode2, Shield, Zap, Sparkles, Code2, Globe } from "lucide-react";
import { cn } from "../lib/utils";

const DefaultIcons = {
  react: (
    <svg viewBox="-11.5 -10.23174 23 20.46348" className="w-5 h-5" fill="none">
      <circle cx="0" cy="0" r="2.05" fill="#61DAFB" />
      <g stroke="#61DAFB" strokeWidth="1">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  ),
  nextjs: (
    <svg viewBox="0 0 180 180" className="w-5 h-5" fill="none">
      <circle cx="90" cy="90" r="90" fill="#000" stroke="#fff" strokeWidth="6" />
      <path
        d="M149.508 157.52L69.142 54H54v72h14.4V69.412l67.24 87.054a89.4 89.4 0 0013.868-1.046zM111.6 54h14.4v72h-14.4z"
        fill="#fff"
      />
    </svg>
  ),
  flutter: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <path d="M14.314 0L2.3 12l6 6 6-6-6-6 2.985-2.985L14.314 0zm0 6l-6 6 6 6 5.7-5.7-2.985-3L20.014 6H14.314z" fill="#54C5F8" />
      <path d="M14.314 12L8.3 18l6 6h5.7l-6-6 6-6h-5.7z" fill="#01579B" />
    </svg>
  ),
  vue: (
    <svg viewBox="0 0 256 221" className="w-5 h-5" fill="none">
      <path d="M204.8 0H256L128 220.8 0 0h51.2L128 132.48 204.8 0z" fill="#41B883" />
      <path d="M0 0l128 220.8L256 0h-51.2L128 132.48 51.2 0H0z" fill="#35495E" />
    </svg>
  ),
  typescript: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <rect width="24" height="24" rx="2" fill="#3178C6" />
      <path d="M5.5 12v-1.5h4.5V21h-2V12H5.5zm5.5-1.5h4.5v1.5h-3v2h3v1.5h-3v2h3V21h-4.5v-1.5h3v-2h-3v-1.5h3v-2h-3V10.5z" fill="#fff" />
    </svg>
  ),
  python: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <path
        d="M12.043 1.017c-2.157 0-2.078.918-2.078.918l.003 2.126h2.32v.639H7.768S5.449 4.487 5.449 6.72c0 2.233 0 2.767 0 2.767h1.568V8.282c0-.725.68-1.324 1.582-1.324h3.722c1.383 0 2.234-.84 2.234-2.234V3.11c0-1.156-.99-2.093-2.234-2.093h-2.32V1.017zm-1.09.934a.6.6 0 1 1 .002 1.2.6.6 0 0 1-.002-1.2z"
        fill="#387EB8"
      />
      <path
        d="M12.043 22.983c2.157 0 2.078-.918 2.078-.918l-.003-2.126h-2.32v-.639h4.518s2.32.217 2.32-2.017c0-2.233 0-2.767 0-2.767h-1.568v1.201c0 .725-.68 1.324-1.582 1.324h-3.722c-1.383 0-2.234.84-2.234 2.234v1.867c0 1.156.99 2.093 2.234 2.093h2.32v-.252h-.041z"
        fill="#FFD43B"
      />
    </svg>
  ),
  rust: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <circle cx="12" cy="12" r="10" stroke="#ff6f30" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" fill="#ff6f30" />
      <circle cx="12" cy="12" r="1.5" fill="#fff" />
    </svg>
  ),
  golang: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
      <path
        d="M3.8 8.15a.36.36 0 0 0-.36.41.36.36 0 0 0 .36.33h4.69a.36.36 0 0 0 .36-.33.36.36 0 0 0-.36-.41H3.8zm-2.56 1.8a.36.36 0 0 0-.36.45.36.36 0 0 0 .36.33h4.69a.36.36 0 0 0 .36-.33.36.36 0 0 0-.36-.45H1.24zm13.8 0a.36.36 0 0 0-.36.45.36.36 0 0 0 .36.33h4.69a.36.36 0 0 0 .36-.33.36.36 0 0 0-.36-.45h-4.69zm-2.56-1.8a.36.36 0 0 0-.36.41.36.36 0 0 0 .36.33h4.69a.36.36 0 0 0 .36-.33.36.36 0 0 0-.36-.41h-4.69z"
        fill="#00ADD8"
      />
      <path
        d="M22.83 11.1c-.43-1.27-1.53-2.03-2.96-2.03-1.28 0-2.27.49-3.22 1.33.4.35.77.79 1.08 1.3.48-.5 1.06-.96 1.9-.96.84 0 1.4.47 1.57 1.17.03.1.04.2.04.32v.27c-.54-.02-1.18-.05-1.83-.05-2.16 0-3.35.5-4.16 1.5-.78.96-.9 2.14-.9 3.08 0 1.34.5 2.55 1.8 2.55.84 0 1.43-.37 1.91-.86.35.55.72 1.01 1.3 1.31.62.32 1.28.38 2.13.38 1.99 0 3.2-.95 3.85-2.6.54-1.34.38-2.5.03-3.28h-2.73v.02zm-1.16 3.73c-.48.75-1.12 1.06-1.83 1.06-.36 0-.72-.1-1-.32-.3-.23-.5-.56-.5-1.1 0-.8.36-1.42 1.06-1.8.56-.3 1.3-.42 2.23-.42.17 0 .35 0 .54.01-.03.72-.23 1.63-.5 2.57zM8.3 9.02H4.76c-.88 0-1.6.72-1.6 1.6v2.85c0 .88.72 1.6 1.6 1.6H8.3c1.52 0 3.04-1.36 3.04-3.03 0-1.66-1.52-3.02-3.04-3.02zm0 3.95H5.43v-.7H8.3s.36.1.36.43c0 .34-.36.26-.36.26v.01z"
        fill="#00ADD8"
      />
    </svg>
  ),
};

export const DEFAULT_ORBITS = [
  {
    id: "inner",
    name: "Core Intelligence",
    radiusClass: "var(--radius-inner)",
    radiusPx: 175,
    speed: 22,
    items: [
      { id: "parser", label: "Parsing Agent", color: "#3B82F6", svg: <FileCode2 className="w-5 h-5 text-blue-400" /> },
      { id: "matcher", label: "Semantic Matcher", color: "#10B981", svg: <Sparkles className="w-5 h-5 text-emerald-400" /> },
      { id: "fraud", label: "Fraud Detector", color: "#EF4444", svg: <Shield className="w-5 h-5 text-red-400" /> },
    ],
  },
  {
    id: "mid",
    name: "Scoring & Analysis",
    radiusClass: "var(--radius-mid)",
    radiusPx: 285,
    speed: 34,
    items: [
      { id: "ats", label: "ATS Scorer", color: "#8B5CF6", svg: <Zap className="w-5 h-5 text-purple-400" /> },
      { id: "skill", label: "Skill Extraction", color: "#F59E0B", svg: <Bot className="w-5 h-5 text-amber-400" /> },
      { id: "ranking", label: "Realtime Ranking", color: "#06B6D4", svg: <Cpu className="w-5 h-5 text-cyan-400" /> },
      { id: "interview", label: "Interview AI", color: "#EC4899", svg: <Globe className="w-5 h-5 text-pink-400" /> },
    ],
  },
];

export const TECH_STACK_ORBITS = [
  {
    id: "inner",
    name: "Frontend SDKs",
    radiusClass: "var(--radius-inner)",
    radiusPx: 175,
    speed: 20,
    items: [
      { id: "react", label: "React SDK", color: "#61DAFB", svg: DefaultIcons.react },
      { id: "nextjs", label: "Next.js", color: "#ffffff", svg: DefaultIcons.nextjs },
      { id: "flutter", label: "Flutter", color: "#54C5F8", svg: DefaultIcons.flutter },
      { id: "vue", label: "Vue.js", color: "#42B883", svg: DefaultIcons.vue },
    ],
  },
  {
    id: "mid",
    name: "AI & Backend",
    radiusClass: "var(--radius-mid)",
    radiusPx: 285,
    speed: 32,
    items: [
      { id: "typescript", label: "TypeScript", color: "#3178C6", svg: DefaultIcons.typescript },
      { id: "python", label: "Python AI", color: "#FFD43B", svg: DefaultIcons.python },
    ],
  },
  {
    id: "outer",
    name: "Infrastructure",
    radiusClass: "var(--radius-outer)",
    radiusPx: 395,
    speed: 48,
    items: [
      { id: "rust", label: "Rust Core", color: "#FF6F30", svg: DefaultIcons.rust },
      { id: "golang", label: "Go Microservices", color: "#00ADD8", svg: DefaultIcons.golang },
    ],
  },
];

export const SolarSystem = React.forwardRef(
  (
    {
      centerLogo,
      centerLogoAlt = "Between Core AI Engine",
      orbits = DEFAULT_ORBITS,
      isPaused = false,
      speedMultiplier = 1,
      className,
      ...props
    },
    ref
  ) => {
    const [hoveredId, setHoveredId] = useState(null);
    const [isContainerHovered, setIsContainerHovered] = useState(false);
    const effectivePaused = isPaused || isContainerHovered || hoveredId !== null;

    const dustItems = [
      { delay: "-4s", radius: "165px", color: "#00f5d4" },
      { delay: "-11s", radius: "260px", color: "#a855f7" },
      { delay: "-19s", radius: "340px", color: "#3b82f6" },
      { delay: "-28s", radius: "395px", color: "#00f5d4" },
      { delay: "-7s", radius: "200px", color: "#ec4899" },
      { delay: "-15s", radius: "365px", color: "#eab308" },
      { delay: "-23s", radius: "430px", color: "#a855f7" },
    ];

    return (
      <div
        ref={ref}
        onMouseEnter={() => setIsContainerHovered(true)}
        onMouseLeave={() => setIsContainerHovered(false)}
        className={cn(
          "relative flex items-center justify-center w-full max-w-[940px] h-[320px] md:h-[450px] perspective-[1200px] select-none overflow-visible mx-auto cursor-pointer",
          className
        )}
        {...props}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --radius-inner: 175px;
            --radius-mid: 285px;
            --radius-outer: 395px;
          }

          @media (max-width: 768px) {
            :root {
              --radius-inner: 100px;
              --radius-mid: 165px;
              --radius-outer: 230px;
            }
          }

          @media (max-width: 480px) {
            :root {
              --radius-inner: 70px;
              --radius-mid: 115px;
              --radius-outer: 160px;
            }
          }

          @keyframes custom-orbitMove {
            0% {
              transform: translate(-50%, -50%) rotateZ(0deg) translateX(var(--orbit-radius));
            }
            100% {
              transform: translate(-50%, -50%) rotateZ(-360deg) translateX(var(--orbit-radius));
            }
          }

          @keyframes custom-billboardCancel {
            0% {
              transform: translate(-50%, -50%) rotateZ(0deg) rotateY(10deg) rotateX(-65deg);
            }
            100% {
              transform: translate(-50%, -50%) rotateZ(360deg) rotateY(10deg) rotateX(-65deg);
            }
          }

          @keyframes custom-sun-pulse {
            0% { transform: scale(0.9); opacity: 0.7; }
            100% { transform: scale(1.1); opacity: 1; }
          }

          @keyframes custom-spin-clockwise {
            0% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(0deg); }
            100% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(360deg); }
          }
          @keyframes custom-spin-counter {
            0% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(0deg); }
            100% { transform: rotateX(65deg) rotateY(-10deg) rotateZ(-360deg); }
          }

          .animate-custom-orbit {
            animation: custom-orbitMove var(--orbit-duration) linear infinite;
            animation-play-state: var(--orbit-play-state);
          }
          .animate-custom-billboard {
            animation: custom-billboardCancel var(--orbit-duration) linear infinite;
            animation-play-state: var(--orbit-play-state);
          }
          .animate-custom-sun-pulse {
            animation: custom-sun-pulse 4s ease-in-out infinite alternate;
          }
          .animate-custom-spin-cw {
            animation: custom-spin-clockwise 20s linear infinite;
          }
          .animate-custom-spin-ccw {
            animation: custom-spin-counter 30s linear infinite;
          }

          .orbit-logo-card {
            position: absolute;
            left: 50%;
            top: 50%;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0.45rem 0.95rem;
            background: rgba(10, 10, 15, 0.75);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 100px;
            font-weight: 600;
            color: #ffffff;
            white-space: nowrap;
            user-select: none;
            cursor: pointer;
            pointer-events: auto;
            transition: border-color 0.3s, color 0.3s, background 0.3s, box-shadow 0.3s, scale 0.3s;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }
        `}} />

        <div 
          className="absolute w-[360px] h-[360px] md:w-[940px] md:h-[940px] flex items-center justify-center"
          style={{
            transform: "rotateX(65deg) rotateY(-10deg)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Central Sun Core */}
          <div 
            className="absolute w-[100px] h-[100px] md:w-[130px] md:h-[130px] flex items-center justify-center z-20 pointer-events-none"
            style={{
              transform: "rotateY(10deg) rotateX(-65deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <div className="absolute w-[90px] h-[90px] md:w-[120px] md:h-[120px] rounded-full filter blur-md animate-custom-sun-pulse z-10 bg-sky-500/30" />
            
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-sky-400/60 shadow-[0_0_40px_rgba(56,189,248,0.5)] z-20 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-2 relative">
              {centerLogo ? (
                typeof centerLogo === "string" ? (
                  <img
                    className="w-10 h-10 md:w-14 md:h-14 rounded-full object-contain"
                    src={centerLogo}
                    alt={centerLogoAlt}
                  />
                ) : (
                  centerLogo
                )
              ) : (
                <>
                  <OrbitIcon className="w-7 h-7 md:w-9 md:h-9 text-sky-400 animate-spin" style={{ animationDuration: '12s' }} />
                  <span className="text-[9px] font-bold tracking-widest text-sky-400 uppercase mt-1">Core AI</span>
                </>
              )}
            </div>

            <div className="absolute w-[110px] h-[110px] md:w-[140px] md:h-[140px] rounded-full border border-dashed border-sky-400/40 animate-custom-spin-cw pointer-events-none" />
            <div className="absolute w-[150px] h-[150px] md:w-[185px] md:h-[185px] rounded-full border border-dashed border-blue-500/25 animate-custom-spin-ccw pointer-events-none" />
          </div>

          {/* Cosmic Dust Particles */}
          {dustItems.map((dust, idx) => (
            <div
              key={idx}
              className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full opacity-40 pointer-events-none animate-custom-orbit"
              style={{
                background: dust.color,
                boxShadow: `0 0 6px ${dust.color}`,
                animationDelay: dust.delay,
                animationPlayState: effectivePaused ? "paused" : "running",
                animationDuration: `${24 / speedMultiplier}s`,
                "--orbit-radius": dust.radius,
                "--orbit-duration": `${24 / speedMultiplier}s`,
                "--orbit-play-state": effectivePaused ? "paused" : "running",
              }}
            />
          ))}

          {/* Orbits and Planet Nodes */}
          {orbits.map((orbit) => {
            return (
              <React.Fragment key={orbit.id}>
                <div
                  className="absolute rounded-full border border-dashed border-zinc-700/60 pointer-events-none"
                  style={{
                    width: `calc(2 * ${orbit.radiusClass})`,
                    height: `calc(2 * ${orbit.radiusClass})`,
                    boxShadow: "inset 0 0 25px rgba(255, 255, 255, 0.01), 0 0 25px rgba(255, 255, 255, 0.01)",
                    "--orbit-radius": orbit.radiusClass,
                  }}
                />

                {orbit.items.map((item, idx, arr) => {
                  const delayValue = -(orbit.speed / arr.length) * idx;
                  const durationValue = orbit.speed / speedMultiplier;
                  const isHovered = hoveredId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none animate-custom-orbit"
                      style={{
                        animationDelay: `${delayValue}s`,
                        animationDuration: `${durationValue}s`,
                        animationPlayState: effectivePaused ? "paused" : "running",
                        "--orbit-radius": orbit.radiusClass,
                        "--orbit-duration": `${durationValue}s`,
                        "--orbit-play-state": effectivePaused ? "paused" : "running",
                        "--hover-color": item.color,
                        zIndex: isHovered ? 30 : 10,
                        transformStyle: "preserve-3d",
                      }}
                    >
                      <div
                        className="absolute right-0 top-1/2 h-[1.5px] origin-right -translate-y-1/2 pointer-events-none transition-opacity duration-300 z-0"
                        style={{
                          width: orbit.radiusClass,
                          opacity: isHovered ? 1 : 0,
                          background: `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.15) 20%, ${item.color} 80%, ${item.color} 100%)`,
                          boxShadow: `0 0 8px ${item.color}, 0 0 16px ${item.color}40`,
                        }}
                      />

                      <div
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="orbit-logo-card animate-custom-billboard"
                        style={{
                          animationDelay: `${delayValue}s`,
                          animationDuration: `${durationValue}s`,
                          animationPlayState: effectivePaused ? "paused" : "running",
                          backgroundColor: isHovered ? "#09090b" : "rgba(10, 10, 15, 0.85)",
                          borderColor: isHovered ? item.color : "rgba(255, 255, 255, 0.18)",
                          boxShadow: isHovered 
                            ? `0 0 24px rgba(0, 0, 0, 0.9), 0 0 18px ${item.color}60`
                            : "0 4px 20px rgba(0, 0, 0, 0.5)",
                          scale: isHovered ? 1.1 : 1,
                          "--orbit-duration": `${durationValue}s`,
                          "--orbit-play-state": effectivePaused ? "paused" : "running",
                        }}
                      >
                        <div 
                          className="transition-transform duration-300"
                          style={{
                            transform: isHovered ? "scale(1.15)" : "scale(1)",
                            color: item.color,
                          }}
                        >
                          {item.svg}
                        </div>
                        <span className="text-[11px] md:text-[13px] tracking-tight font-bold text-white">{item.label}</span>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }
);

SolarSystem.displayName = "SolarSystem";
export default SolarSystem;

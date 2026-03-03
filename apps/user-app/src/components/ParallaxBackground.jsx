import React, { useMemo } from "react";

const sectionTints = [
  "rgba(14, 116, 144, 0.12)",
  "rgba(22, 163, 74, 0.1)",
  "rgba(217, 119, 6, 0.08)",
  "rgba(22, 163, 74, 0.12)",
  "rgba(15, 23, 42, 0.16)",
];

export default function ParallaxBackground({ scrollProgress, activeSection = 0 }) {
  const layerTwoTranslate = useMemo(() => scrollProgress * 200, [scrollProgress]);
  const layerThreeTranslate = useMemo(() => scrollProgress * 100, [scrollProgress]);
  const tint = sectionTints[activeSection] || sectionTints[0];

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-[#0b1220] via-[#0f172a] to-[#071018]" />

      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ backgroundColor: tint }}
      />

      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.2) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        className="absolute inset-0"
        style={{ transform: `translateY(${layerTwoTranslate}px)` }}
      >
        <div className="absolute -right-48 top-1/2 h-176 w-176 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -top-12 left-1/3 h-72 w-72 rounded-full bg-sky-400/8 blur-3xl" />
      </div>

      <div
        className="absolute inset-0 opacity-30"
        style={{ transform: `translateY(${layerThreeTranslate}px)` }}
      >
        <span className="absolute left-[14%] top-[20%] h-1 w-1 rounded-full bg-sky-200/40" />
        <span className="absolute left-[28%] top-[34%] h-1 w-1 rounded-full bg-emerald-200/40" />
        <span className="absolute left-[47%] top-[18%] h-1 w-1 rounded-full bg-sky-200/40" />
        <span className="absolute left-[62%] top-[52%] h-1 w-1 rounded-full bg-emerald-200/40" />
        <span className="absolute left-[77%] top-[28%] h-1 w-1 rounded-full bg-sky-200/40" />
        <span className="absolute left-[84%] top-[66%] h-1 w-1 rounded-full bg-emerald-200/40" />
      </div>
    </div>
  );
}

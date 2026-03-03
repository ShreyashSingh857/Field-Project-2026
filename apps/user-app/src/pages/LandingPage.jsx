import React, { useMemo } from "react";
import { ArrowDown } from "lucide-react";
import { Globe3D } from "@/components/ui/3d-globe";
import ParallaxBackground from "../components/ParallaxBackground";
import useScrollProgress from "../hooks/useScrollProgress";

const sections = [
  {
    label: "GramWasteConnect",
    title: "Smart Waste Management",
    highlight: "for Rural India",
    description:
      "Real-time monitoring. AI insights. Accountable governance.",
    accent: "green",
    cta: true,
  },
  {
    label: "Smart Bin Monitoring",
    title: "80% Full Alert",
    highlight: "GPS-Tagged Bins",
    description:
      "Data-driven waste management.",
    bullets: ["80% Full Alert", "GPS-Tagged Bins", "SLA Tracking"],
    accent: "blue",
  },
  {
    label: "Empowering Safai Workers",
    title: "Live Tasks",
    highlight: "QR Verification",
    description:
      "Proof. Performance. Transparency.",
    bullets: ["Live Tasks", "QR Verification", "Route Optimization"],
    accent: "orange",
  },
  {
    label: "Villager Tools",
    title: "Live Bin Status",
    highlight: "AI Waste Identification",
    description:
      "Community-driven cleanliness.",
    bullets: ["Live Bin Status", "AI Waste Identification", "Waste Marketplace"],
    accent: "green",
  },
  {
    label: "Transparent Governance",
    title: "5-Level Role Access",
    highlight: "SLA Reports & Analytics",
    description:
      "Built for Panchayat to Zila Parishad.",
    bullets: ["5-Level Role Access", "SLA Reports", "Monthly Analytics"],
    accent: "slate",
    final: true,
  },
];

const markers = [
  { lat: 40.7128, lng: -74.006, src: "https://assets.aceternity.com/avatars/1.webp", label: "New York", section: 0 },
  { lat: 51.5074, lng: -0.1278, src: "https://assets.aceternity.com/avatars/2.webp", label: "London", section: 0 },
  { lat: 19.076, lng: 72.8777, src: "https://assets.aceternity.com/avatars/3.webp", label: "Mumbai", section: 1 },
  { lat: 1.3521, lng: 103.8198, src: "https://assets.aceternity.com/avatars/4.webp", label: "Singapore", section: 1 },
  { lat: -33.8688, lng: 151.2093, src: "https://assets.aceternity.com/avatars/5.webp", label: "Sydney", section: 2 },
  { lat: 35.6762, lng: 139.6503, src: "https://assets.aceternity.com/avatars/6.webp", label: "Tokyo", section: 2 },
  { lat: -23.5505, lng: -46.6333, src: "https://assets.aceternity.com/avatars/7.webp", label: "São Paulo", section: 3 },
  { lat: 25.2048, lng: 55.2708, src: "https://assets.aceternity.com/avatars/8.webp", label: "Dubai", section: 3 },
  { lat: -1.2921, lng: 36.8219, src: "https://assets.aceternity.com/avatars/9.webp", label: "Nairobi", section: 4 },
  { lat: 48.8566, lng: 2.3522, src: "https://assets.aceternity.com/avatars/10.webp", label: "Paris", section: 4 },
];

const getActiveSection = progress => {
  const index = Math.floor(progress * sections.length);
  return Math.min(sections.length - 1, Math.max(0, index));
};

const atmosphereBySection = ["#38bdf8", "#22c55e", "#f59e0b", "#22c55e", "#38bdf8"];
const intensityBySection = [0.45, 0.62, 0.5, 0.58, 0.68];

function accentClass(accent) {
  if (accent === "blue") return "text-sky-400";
  if (accent === "orange") return "text-amber-400";
  if (accent === "slate") return "text-slate-300";
  return "text-green-600";
}

export default function LandingPage() {
  const scrollProgress = useScrollProgress();

  const activeSection = useMemo(() => getActiveSection(scrollProgress), [scrollProgress]);
  const rotationY = useMemo(() => scrollProgress * Math.PI * 3.2, [scrollProgress]);
  const globeScale = 1.15;

  return (
    <div className="relative min-h-[400vh] overflow-x-hidden bg-neutral-950 text-white">
      <ParallaxBackground scrollProgress={scrollProgress} activeSection={activeSection} />

      <div className="pointer-events-none fixed inset-0 z-20 hidden items-center justify-end md:flex">
        <div
          style={{
            marginRight: "-12vw",
            width: "clamp(680px, 95vh, 1100px)",
            height: "clamp(680px, 95vh, 1100px)",
            transform: `scale(${globeScale})`,
            transition: "filter 700ms ease",
            filter: activeSection === 4 ? "drop-shadow(0 0 36px rgba(56,189,248,0.18))" : "none",
          }}
        >
          <div className="absolute -inset-20 rounded-full bg-sky-400/12 blur-[140px]" />
          <div className="absolute -inset-36 rounded-full bg-emerald-400/8 blur-[180px]" />
          <div
            className="absolute -inset-24 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(56,189,248,0.14) 0%, rgba(56,189,248,0.06) 35%, rgba(56,189,248,0) 72%)",
              filter: "blur(28px)",
            }}
          />
          <Globe3D
            className="relative h-full w-full"
            markers={markers}
            rotationY={rotationY}
            config={{
              autoRotate: false,
              autoRotateSpeed: 0,
              radius: 2.4,
              atmosphereColor: atmosphereBySection[activeSection],
              atmosphereIntensity: intensityBySection[activeSection],
              showAtmosphere: true,
              bumpScale: 1.5,
            }}
          />
        </div>
      </div>

      <main className="relative z-30">
        {sections.map((section, index) => {
          const isActive = activeSection === index;

          return (
            <section
              key={`${section.title}-${index}`}
              className="flex h-screen items-center"
              aria-current={isActive ? "true" : "false"}
            >
              <div className="mx-auto flex w-full max-w-7xl px-8">
                <div className="flex w-full flex-col justify-center gap-6 text-left md:w-1/2 md:pr-20">
                <p
                  className={`mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-700 ${
                    isActive
                      ? "border-sky-400/40 bg-sky-400/10 text-sky-300"
                      : "border-white/15 bg-white/5 text-neutral-500"
                  }`}
                >
                  {section.label}
                </p>

                <h2
                  className={`text-balance text-5xl font-semibold leading-tight tracking-tight transition-all duration-700 md:text-6xl ${
                    isActive ? "translate-y-0 opacity-100" : "translate-y-8 opacity-20"
                  }`}
                >
                  {section.title}
                  <br />
                  <span className={accentClass(section.accent)}>{section.highlight}</span>
                </h2>

                <p
                  className={`max-w-md text-lg leading-relaxed text-slate-300 transition-all duration-700 ${
                    isActive ? "translate-y-0 opacity-100" : "translate-y-6 opacity-15"
                  }`}
                >
                  {section.description}
                </p>

                {section.bullets && (
                  <ul className="space-y-3">
                    {section.bullets.map((item, bulletIndex) => (
                      <li
                        key={item}
                        className={`text-base text-slate-200 transition-all duration-700 ${
                          isActive ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                        }`}
                        style={{ transitionDelay: `${120 + bulletIndex * 120}ms` }}
                      >
                        <span className="mr-3 inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {section.cta && (
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button className="rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_14px_rgba(22,163,74,0.35)] transition hover:bg-green-500">
                      Explore System
                    </button>
                    <button className="rounded-md border border-slate-500 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-300">
                      View Live Map
                    </button>
                  </div>
                )}

                {section.final && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                    <h3 className="text-3xl font-semibold text-white">Cleaner Villages. Smarter Systems.</h3>
                    <button className="mt-4 rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_14px_rgba(22,163,74,0.35)] transition hover:bg-green-500">
                      Get Started
                    </button>
                  </div>
                )}
                </div>
              </div>
            </section>
          );
        })}
      </main>

      <div className="fixed bottom-8 left-6 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-xs text-neutral-300 backdrop-blur-md md:left-12">
        <ArrowDown className="h-3.5 w-3.5 text-emerald-400" />
        <span>Section {activeSection + 1} of {sections.length}</span>
      </div>
    </div>
  );
}

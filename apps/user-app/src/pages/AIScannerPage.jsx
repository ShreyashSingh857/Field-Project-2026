import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    ArrowLeft,
    Camera,
    MapPin,
    RefreshCw,
    Trash2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Leaf,
    Menu,
} from "lucide-react";

/* ─── Waste category config ──────────────────────────────── */
const CATEGORIES = {
    Recyclable: {
        color: "#1565C0",
        bg: "#E3F2FD",
        label: "♻️ Recyclable",
    },
    Compostable: {
        color: "#2E7D32",
        bg: "#E8F5E9",
        label: "🌱 Compostable",
    },
    Hazardous: {
        color: "#C62828",
        bg: "#FFEBEE",
        label: "⚠️ Hazardous",
    },
    "General Waste": {
        color: "#5D4037",
        bg: "#EFEBE9",
        label: "🗑️ General Waste",
    },
};

/* ─── Mock AI analysis (replace with real API call) ──────── */
const mockAnalyse = () =>
    new Promise(resolve => {
        setTimeout(() => {
            resolve({
                wasteType: "Plastic Bottle",
                category: "Recyclable",
                disposeIn: "Dry Waste Bin (Blue)",
                nearestBin: "150 meters away",
            });
        }, 2200);
    });

/* ─── Result Card ────────────────────────────────────────── */
function ResultCard({ photo, result, onScanAnother, t }) {
    const cat = CATEGORIES[result.category] ?? CATEGORIES["General Waste"];

    return (
        <div
            className="clay-card mx-auto w-full max-w-sm overflow-hidden"
            style={{
                animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
        >
            {/* Photo preview */}
            {photo && (
                <div className="relative h-44 w-full overflow-hidden rounded-t-[22px]">
                    <img src={photo} alt="Scanned waste" className="h-full w-full object-cover" />
                    <div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.25))" }}
                    />
                    <div
                        className="absolute bottom-2 left-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
                        style={{ backgroundColor: cat.color, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
                    >
                        {cat.label}
                    </div>
                </div>
            )}

            <div className="space-y-3 p-4">
                {/* Result rows */}
                {[
                    { label: t("aiScannerPage.wasteType"), value: result.wasteType, Icon: Trash2 },
                    { label: t("aiScannerPage.category"), value: result.category, Icon: CheckCircle2, color: cat.color },
                    { label: t("aiScannerPage.disposeIn"), value: result.disposeIn, Icon: Leaf },
                    { label: t("aiScannerPage.nearestBin"), value: result.nearestBin, Icon: MapPin },
                ].map(({ label, value, Icon, color }) => (
                    <div
                        key={label}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                        style={{
                            backgroundColor: "var(--clay-bg)",
                            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
                        }}
                    >
                        <div
                            className="clay-icon flex h-8 w-8 shrink-0 items-center justify-center"
                            style={{ backgroundColor: "#fff", color: color ?? "var(--clay-primary)" }}
                        >
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-medium" style={{ color: "var(--clay-muted)" }}>
                                {label}
                            </p>
                            <p className="truncate text-sm font-semibold text-black">{value}</p>
                        </div>
                    </div>
                ))}

                {/* View on map */}
                <button
                    className="clay-btn-wide mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white"
                    style={{
                        background: "linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))",
                        boxShadow: "0 4px 14px rgba(46,125,50,0.40), inset 0 1px 3px rgba(255,255,255,0.20)",
                    }}
                >
                    <MapPin className="h-4 w-4" />
                    {t("aiScannerPage.viewOnMap")}
                </button>

                {/* Scan another */}
                <button
                    onClick={onScanAnother}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium text-black transition"
                    style={{ backgroundColor: "var(--clay-bg)" }}
                >
                    <RefreshCw className="h-4 w-4" />
                    {t("aiScannerPage.scanAnother")}
                </button>
            </div>
        </div>
    );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function AIScannerPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [phase, setPhase] = useState("idle"); // idle | analysing | result
    const [photo, setPhoto] = useState(null);
    const [result, setResult] = useState(null);
    const [cameraStream, setCameraStream] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [error, setError] = useState(null);

    /* Attempt live camera; fallback to file input */
    const handleScanTap = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            setCameraStream(stream);
            setShowCamera(true);
        } catch {
            // No camera (desktop/denied) — open file picker
            fileInputRef.current?.click();
        }
    }, []);

    /* Capture frame from live video */
    const captureFromCamera = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

        // Stop stream
        cameraStream?.getTracks().forEach(t => t.stop());
        setCameraStream(null);
        setShowCamera(false);

        await runAnalysis(dataUrl);
    }, [cameraStream]);

    /* Handle file picker fallback */
    const handleFileChange = useCallback(async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async ev => {
            await runAnalysis(ev.target.result);
        };
        reader.readAsDataURL(file);
        // Reset input so same file can trigger again
        e.target.value = "";
    }, []);

    const runAnalysis = async dataUrl => {
        setPhoto(dataUrl);
        setPhase("analysing");
        try {
            const res = await mockAnalyse(dataUrl);
            setResult(res);
            setPhase("result");
        } catch {
            setError("Could not analyse image. Please try again.");
            setPhase("idle");
        }
    };

    const reset = () => {
        setPhase("idle");
        setPhoto(null);
        setResult(null);
        setError(null);
    };

    return (
        <div className="min-h-screen text-black" style={{ backgroundColor: "var(--clay-bg)" }}>
            <div className="relative min-h-screen w-full" style={{ backgroundColor: "var(--clay-bg)" }}>

                {/* ── Header ── */}
                <header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div
                            className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden"
                            style={{ backgroundColor: "#fff" }}
                        >
                            <img src="/Logo.png" alt="GramWaste Connect" className="h-9 w-9 object-contain" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-black sm:text-base">{t("aiScannerPage.title")}</p>
                            <p className="text-xs sm:text-sm" style={{ color: "var(--clay-muted)" }}>
                                {t("aiScannerPage.subtitle")}
                            </p>
                        </div>
                    </div>
                </header>

                {/* ── Main Content ── */}
                <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-6 pb-20 sm:px-5">

                    {/* ── Live Camera View ── */}
                    {showCamera && (
                        <div className="clay-card w-full overflow-hidden p-0">
                            <div className="relative w-full overflow-hidden rounded-[22px]">
                                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    onLoadedMetadata={() => videoRef.current?.play()}
                                    className="w-full rounded-[22px] bg-black"
                                    style={{ maxHeight: "55vw" }}
                                />
                                {/* Scan overlay frame */}
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <div
                                        className="h-36 w-36 rounded-2xl border-2 border-white/70"
                                        style={{ boxShadow: "0 0 0 2000px rgba(0,0,0,0.35)" }}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 p-4">
                                <button
                                    onClick={() => {
                                        cameraStream?.getTracks().forEach(t => t.stop());
                                        setShowCamera(false);
                                        setCameraStream(null);
                                    }}
                                    className="clay-btn-round flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-black"
                                    style={{ borderRadius: "16px" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={captureFromCamera}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white"
                                    style={{
                                        background: "linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))",
                                        boxShadow: "0 4px 14px rgba(46,125,50,0.40)",
                                        borderRadius: "16px",
                                    }}
                                >
                                    <Camera className="h-4 w-4" />
                                    Capture
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Idle / Analysing ── */}
                    {!showCamera && phase !== "result" && (
                        <>
                            {/* Big scan button */}
                            <div className="flex flex-col items-center gap-4">
                                <button
                                    type="button"
                                    onClick={handleScanTap}
                                    disabled={phase === "analysing"}
                                    aria-label="Scan waste"
                                    className="relative flex items-center justify-center transition"
                                    style={{
                                        width: 148,
                                        height: 148,
                                        borderRadius: "50%",
                                        background:
                                            phase === "analysing"
                                                ? "linear-gradient(135deg, #A5D6A7, #C8E6C9)"
                                                : "linear-gradient(135deg, #2E7D32, #4CAF50, #66BB6A)",
                                        boxShadow:
                                            "0 10px 30px rgba(46,125,50,0.40), 0 4px 10px rgba(0,0,0,0.10), inset 0 3px 6px rgba(255,255,255,0.25)",
                                        border: "3px solid rgba(255,255,255,0.35)",
                                        transform: phase === "analysing" ? "scale(0.96)" : "scale(1)",
                                        transition: "transform 0.25s ease, box-shadow 0.25s ease",
                                    }}
                                >
                                    {phase === "analysing" ? (
                                        <Loader2 className="h-14 w-14 animate-spin text-white" />
                                    ) : (
                                        <Camera className="h-14 w-14 text-white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }} />
                                    )}
                                    {/* Outer ring pulse */}
                                    {phase === "idle" && (
                                        <span
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                border: "2.5px solid rgba(76,175,80,0.4)",
                                                animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite",
                                            }}
                                        />
                                    )}
                                </button>

                                <p
                                    className="text-sm font-semibold"
                                    style={{ color: phase === "analysing" ? "var(--clay-muted)" : "var(--clay-primary)" }}
                                >
                                    {phase === "analysing" ? t("aiScannerPage.analysing") : t("aiScannerPage.tapToScan")}
                                </p>

                                {error && (
                                    <div
                                        className="flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium"
                                        style={{ backgroundColor: "#FFEBEE", color: "#C62828" }}
                                    >
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {t("aiScannerPage.error")}
                                    </div>
                                )}
                            </div>

                            {/* Illustration card */}
                            <div className="clay-card flex w-full max-w-sm items-center gap-4 p-4">
                                <img
                                    src="/Illustrations/recycle_8652972.png"
                                    alt="Person recycling waste"
                                    className="h-20 w-20 shrink-0 object-contain"
                                />
                                <p className="text-xs leading-5 text-black sm:text-sm">
                                    {t("aiScannerPage.tip")}
                                </p>
                            </div>

                            {/* Photo preview (before result, shown while analysing) */}
                            {photo && phase === "analysing" && (
                                <div className="clay-card w-full max-w-sm overflow-hidden p-0">
                                    <img
                                        src={photo}
                                        alt="Captured waste"
                                        className="h-48 w-full rounded-[22px] object-cover"
                                    />
                                    <div className="flex items-center justify-center gap-2 py-3 text-sm font-medium" style={{ color: "var(--clay-primary)" }}>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t("aiScannerPage.aiIdentifying")}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Result Card ── */}
                    {phase === "result" && result && (
                        <ResultCard photo={photo} result={result} onScanAnother={reset} t={t} />
                    )}
                </main>

                {/* Hidden file input fallback */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {/* Hidden canvas for camera capture */}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* ── Keyframes ── */}
            <style>{`
				@keyframes slideUp {
					from { opacity: 0; transform: translateY(28px); }
					to   { opacity: 1; transform: translateY(0); }
				}
				@keyframes ping {
					75%, 100% { transform: scale(1.22); opacity: 0; }
				}
			`}</style>
        </div>
    );
}

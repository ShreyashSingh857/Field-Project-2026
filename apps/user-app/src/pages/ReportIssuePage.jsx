import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, Camera, CheckCircle2, Loader2,
  MapPin, Mic, MicOff, Send, X,
} from 'lucide-react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import api from '../services/axiosInstance';

/* ─── Status badge ──────────────────────────────────────────── */
const STATUS = {
  pending:  { bg: '#FFF8E1', c: '#F57F17', l: 'Pending' },
  assigned: { bg: '#E3F2FD', c: '#1565C0', l: 'Assigned' },
  resolved: { bg: '#E8F5E9', c: '#2E7D32', l: 'Resolved' },
};
const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: s.bg, color: s.c }}>
      {s.l}
    </span>
  );
};

/* ─── Reverse geocode helper ────────────────────────────────── */
const reverseGeocode = async (lat, lng) => {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
  const j = await res.json();
  return j.display_name || '';
};

/* ─── Main Page ─────────────────────────────────────────────── */
export default function ReportIssuePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q] = useSearchParams();
  const mineOnly = q.get('mine') === 'true';
  const cameraInputRef = useRef(null);

  /* ── My Reports mode ── */
  const [myReports, setMyReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    if (!mineOnly) return;
    (async () => {
      setReportsLoading(true);
      try { const { data } = await api.get('/issues?mine=true'); setMyReports(data.issues || []); }
      finally { setReportsLoading(false); }
    })();
  }, [mineOnly]);

  /* ── Form state ── */
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null); // { file, url }
  const [pos, setPos] = useState([20.5937, 78.9629]);
  const [locationText, setLocationText] = useState('');
  const [gpsLoading, setGpsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ── Hybrid Speech-to-text state ── */
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [livePreview, setLivePreview] = useState('');
  
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  /* ── Geolocation ── */
  useEffect(() => {
    if (q.get('location')) setLocationText(q.get('location'));
    navigator.geolocation?.getCurrentPosition(async (g) => {
      const newPos = [g.coords.latitude, g.coords.longitude];
      setPos(newPos);
      setLocationText(await reverseGeocode(newPos[0], newPos[1]));
      setGpsLoading(false);
    }, () => setGpsLoading(false));
  }, []);

  /* ── Camera capture ── */
  const openCamera = () => cameraInputRef.current?.click();
  const handleCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) setPhoto({ file, url: URL.createObjectURL(file) });
    e.target.value = '';
  };

  /* ── Hybrid Speech recognition & Recording ── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsTranscribing(true);
        try {
          // Create WebM audio blob
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice-note.webm');
          
          // Send to Whisper via backend
          const { data } = await api.post('/ai/speech/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          if (data?.text) {
            setDescription((prev) => (prev ? `${prev} ${data.text}` : data.text).trim());
          }
        } catch (error) {
          console.error('Whisper transcription failed', error);
          // If backend fails, fallback gracefully by appending the live preview text (which may be less accurate)
          setDescription((prev) => (prev ? `${prev} ${livePreview}` : livePreview).trim());
        } finally {
          setIsTranscribing(false);
          setLivePreview('');
        }
      };

      mediaRecorderRef.current = mr;
      mr.start();
      setIsListening(true);
      setLivePreview('');

      // Also start Web Speech API for real-time live preview (rough text)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.lang = 'hi-IN'; // Hindi defaults, accepts english too
        rec.continuous = true;
        rec.interimResults = true;
        
        rec.onresult = (event) => {
          let preview = '';
          for (let i = 0; i < event.results.length; i++) {
            preview += event.results[i][0].transcript;
          }
          setLivePreview(preview);
        };
        
        rec.onerror = () => { /* Ignore errors as Whisper is primary fallback */ };
        rec.start();
        recognitionRef.current = rec;
      }
    } catch (err) {
      alert('Microphone access is required to use this feature.');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleMic = () => {
    if (isListening) stopRecording();
    else startRecording();
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!description.trim() || isTranscribing) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('description', description);
      form.append('location_lat', String(pos[0]));
      form.append('location_lng', String(pos[1]));
      form.append('location_address', locationText);
      if (photo?.file) form.append('photo', photo.file);
      if (q.get('bin_id')) form.append('bin_id', q.get('bin_id'));
      await api.post('/issues', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success screen ── */
  if (submitted) return (
    <div className="min-h-screen text-black" style={{ backgroundColor: 'var(--clay-bg)' }}>
      <div className="relative min-h-screen w-full grid place-items-center px-4" style={{ backgroundColor: 'var(--clay-bg)' }}>
        <div className="text-center">
          <div className="mx-auto clay-icon mb-3 flex h-16 w-16 items-center justify-center" style={{ backgroundColor: 'var(--clay-card)', color: 'var(--clay-primary)' }}>
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h2 className="text-xl font-bold text-black">{t('reportIssue.successTitle', { defaultValue: 'Report Submitted!' })}</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--clay-muted)' }}>
            {t('reportIssue.successMessage', { defaultValue: 'A Safai Mitra will be assigned to your area soon.' })}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))' }}
          >
            {t('reportIssue.backToDashboard', { defaultValue: 'Back to Dashboard' })}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-black" style={{ backgroundColor: 'var(--clay-bg)' }}>
      <div className="relative min-h-screen w-full" style={{ backgroundColor: 'var(--clay-bg)' }}>

        {/* ── Header ── */}
        <header className="clay-header sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={() => navigate(-1)} className="clay-btn-round inline-flex h-10 w-10 items-center justify-center text-black" aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="clay-icon flex h-11 w-11 items-center justify-center overflow-hidden" style={{ backgroundColor: '#fff' }}>
              <img src="/Logo.png" alt="GramWaste Connect" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-black sm:text-base">
                {mineOnly ? t('reportIssue.myReports', { defaultValue: 'My Reports' }) : t('reportIssue.title', { defaultValue: 'Report a Problem' })}
              </p>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--clay-muted)' }}>
                {t('reportIssue.subtitle', { defaultValue: 'Help us keep your village clean' })}
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-md space-y-3 px-4 py-4 pb-24">

          {/* ── My Reports View ── */}
          {mineOnly ? (
            <>
              {reportsLoading && <Loader2 className="mx-auto h-6 w-6 animate-spin" style={{ color: 'var(--clay-primary)' }} />}
              {!reportsLoading && myReports.length === 0 && (
                <div className="py-12 text-center text-sm" style={{ color: 'var(--clay-muted)' }}>
                  {t('reportIssue.noReports', { defaultValue: 'No reports submitted yet.' })}
                </div>
              )}
              {!reportsLoading && myReports.map((r) => (
                <div key={r.id} className="clay-card p-4">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-black">{r.description}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--clay-muted)' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </>
          ) : (
            <>
              {/* ── Description + Mic ── */}
              <section className="clay-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="clay-icon flex h-8 w-8 items-center justify-center" style={{ backgroundColor: 'var(--clay-bg)', color: 'var(--clay-primary)' }}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-medium text-black">{t('reportIssue.descLabel', { defaultValue: 'Describe the problem' })}</p>
                  </div>
                  
                  {/* Mic toggle */}
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={isTranscribing}
                    title={isListening ? 'Stop recording' : 'Record voice note'}
                    className="clay-btn-round inline-flex h-9 w-9 items-center justify-center transition"
                    style={{
                      backgroundColor: isTranscribing ? 'var(--clay-bg)' : isListening ? '#FFEBEE' : 'var(--clay-card)',
                      color: isTranscribing ? 'var(--clay-muted)' : isListening ? '#C62828' : 'var(--clay-primary)',
                      animation: isListening ? 'mic-pulse 1s ease-in-out infinite' : 'none',
                    }}
                  >
                    {isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                </div>
                
                {/* Live Preview Text & Loading Indicator */}
                {isListening && (
                  <p className="mb-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500" style={{ animation: 'mic-pulse 1s infinite' }} />
                    Recording... {livePreview}
                  </p>
                )}
                {isTranscribing && (
                  <p className="mb-2 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Enhancing text with AI...
                  </p>
                )}

                <textarea
                  rows={3}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('reportIssue.descPlaceholder', { defaultValue: 'E.g. Garbage overflowing near the school gate...' })}
                  className="clay-lang-box w-full resize-none px-3 py-2 text-sm text-black outline-none disabled:opacity-50"
                  disabled={isListening || isTranscribing}
                />
                <p className="mt-1 text-right text-xs" style={{ color: 'var(--clay-muted)' }}>{description.length} / 500</p>
              </section>

              {/* ── Camera Photo ── */}
              <section className="clay-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Camera className="h-4 w-4" style={{ color: 'var(--clay-primary)' }} />
                  <p className="text-sm font-medium text-black">{t('reportIssue.photoLabel', { defaultValue: 'Take a Photo' })}</p>
                </div>

                {!photo ? (
                  <button
                    type="button"
                    onClick={openCamera}
                    className="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 gap-2 transition"
                    style={{ borderColor: 'var(--clay-card-alt)' }}
                  >
                    <Camera className="h-8 w-8" style={{ color: 'var(--clay-primary)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--clay-primary)' }}>
                      {t('reportIssue.tapToCapture', { defaultValue: 'Tap to take photo' })}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--clay-muted)' }}>
                      Opens your camera to capture the issue right now
                    </p>
                  </button>
                ) : (
                  <div className="relative">
                    <img src={photo.url} alt="Captured issue" className="aspect-video w-full rounded-xl object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      className="absolute right-2 top-2 clay-btn-round inline-flex h-7 w-7 items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={openCamera}
                      className="mt-2 w-full rounded-2xl py-2 text-xs font-medium text-black transition"
                      style={{ backgroundColor: 'var(--clay-bg)' }}
                    >
                      Retake Photo
                    </button>
                  </div>
                )}

                {/* Hidden camera-only input — no gallery access */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleCapture}
                />
              </section>

              {/* ── Location ── */}
              <section className="clay-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" style={{ color: 'var(--clay-primary)' }} />
                  <p className="text-sm font-medium text-black">{t('reportIssue.locationLabel', { defaultValue: 'Your Location' })}</p>
                </div>
                {gpsLoading ? (
                  <p className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--clay-muted)' }}>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t('reportIssue.detectingLocation', { defaultValue: 'Detecting location...' })}
                  </p>
                ) : (
                  <>
                    <p className="mb-2 text-xs" style={{ color: 'var(--clay-muted)' }}>{locationText || '-'}</p>
                    <div className="h-[180px] overflow-hidden rounded-xl">
                      <MapContainer center={pos} zoom={15} style={{ height: '100%', width: '100%' }}>
                        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker
                          position={pos}
                          draggable
                          eventHandlers={{
                            dragend: async (e) => {
                              const ll = e.target.getLatLng();
                              const newPos = [ll.lat, ll.lng];
                              setPos(newPos);
                              setLocationText(await reverseGeocode(newPos[0], newPos[1]));
                            },
                          }}
                        />
                      </MapContainer>
                    </div>
                  </>
                )}
              </section>

              {/* ── Submit ── */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !description.trim() || isTranscribing}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, var(--clay-primary), var(--clay-secondary))' }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('reportIssue.submitBtn', { defaultValue: 'Submit Report' })}
              </button>
            </>
          )}
        </main>
      </div>

      <style>{`
        @keyframes mic-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, Camera, CheckCircle2, Loader2,
  MapPin, Mic, MicOff, Send, X, RefreshCw
} from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
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

/* ─── Leaflet StrictMode Patch ──────────────────────────────── */
if (!L.Map.prototype._patchedInitContainer) {
  const _originalInit = L.Map.prototype._initContainer;
  L.Map.prototype._initContainer = function (id) {
    const container = L.DomUtil.get(id);
    if (container && container._leaflet_id) {
      container._leaflet_id = null;
    }
    _originalInit.call(this, id);
  };
  L.Map.prototype._patchedInitContainer = true;
}

/* ─── Reverse geocode helper ────────────────────────────────── */
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
    const j = await res.json();
    return j.display_name || '';
  } catch (error) {
    return 'Location not found';
  }
};

/* ─── ChangeView — Pans map dynamically ─────────────────────── */
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom(), { animate: true, duration: 1.0 });
  }, [center, map]);
  return null;
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function ReportIssuePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q] = useSearchParams();
  const mineOnly = q.get('mine') === 'true';

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
  const [pos, setPos] = useState([20.5937, 78.9629]);
  const [locationText, setLocationText] = useState('');
  const [gpsLoading, setGpsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ── Audio Memo State ── */
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const audioRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  /* ── Camera/Media State ── */
  const [media, setMedia] = useState(null); // { type: 'image' | 'video', url, file }
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const videoRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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

  /* ── Audio Recording Logic ── */
  const toggleAudio = async () => {
    if (isRecordingAudio) {
      if (audioRecorderRef.current) audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
        };
        audioRecorderRef.current = mr;
        mr.start();
        setIsRecordingAudio(true);
        setAudioBlob(null);
        setAudioUrl(null);
      } catch (err) {
        alert('Microphone access required to record voice notes.');
      }
    }
  };

  /* ── Live Camera Logic ── */
  useEffect(() => {
    if (showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showCamera, cameraStream]);

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      setCameraStream(stream);
      setShowCamera(true);
    } catch {
      alert('Camera access denied or unavailable.');
    }
  };

  const closeCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setShowCamera(false);
    if (isRecordingVideo && videoRecorderRef.current) {
        videoRecorderRef.current.stop();
    }
    setIsRecordingVideo(false);
  };

  const switchCamera = async () => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newMode } });
      setCameraStream(stream);
    } catch (e) { console.error(e); }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    
    closeCamera();
    
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    setMedia({ type: 'image', url: dataUrl, file });
  };

  const toggleVideoRecording = () => {
    if (isRecordingVideo) {
      if (videoRecorderRef.current) videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
    } else {
      if (!cameraStream) return;
      videoChunksRef.current = [];
      const mr = new MediaRecorder(cameraStream);
      mr.ondataavailable = e => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const mime = mr.mimeType || 'video/webm';
        const ext = mime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(videoChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        const file = new File([blob], `video.${ext}`, { type: mime });
        setMedia({ type: 'video', url, file });
        closeCamera();
      };
      videoRecorderRef.current = mr;
      mr.start();
      setIsRecordingVideo(true);
    }
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!description.trim() && !media && !audioBlob) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('description', description);
      form.append('location_lat', String(pos[0]));
      form.append('location_lng', String(pos[1]));
      form.append('location_address', locationText);
      
      if (media?.file) form.append('photo', media.file);
      if (audioBlob) form.append('audio_file', new File([audioBlob], 'voice-note.webm', { type: audioBlob.type }));
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
                    <p className="text-sm font-semibold text-black">{r.description || 'Report filed with media'}</p>
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
              {/* ── Description + Audio Mic ── */}
              <section className="clay-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <div className="clay-icon flex h-8 w-8 items-center justify-center" style={{ backgroundColor: 'var(--clay-bg)', color: 'var(--clay-primary)' }}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-medium text-black">{t('reportIssue.descLabel', { defaultValue: 'Describe the problem' })}</p>
                </div>
                
                <textarea
                  rows={3}
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('reportIssue.descPlaceholder', { defaultValue: 'What needs to be fixed?' })}
                  className="clay-lang-box w-full resize-none px-3 py-2 text-sm text-black outline-none disabled:opacity-50"
                  disabled={isRecordingAudio}
                />
                <p className="mt-1 text-right text-[10px]" style={{ color: 'var(--clay-muted)' }}>{description.length} / 500</p>

                {/* Inline Voice Note Tool */}
                <div className="mt-2 flex items-center justify-between border-t pt-2" style={{ borderColor: 'var(--clay-bg)' }}>
                  <div className="flex flex-1 items-center gap-2">
                    {audioUrl ? (
                      <div className="flex w-full items-center gap-2 rounded-xl px-2 py-1" style={{ backgroundColor: 'var(--clay-bg)' }}>
                        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                        <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
                        <button type="button" onClick={() => { setAudioUrl(null); setAudioBlob(null); }} className="clay-btn-round ml-auto h-7 w-7 text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs font-medium" style={{ color: isRecordingAudio ? '#C62828' : 'var(--clay-muted)' }}>
                        {isRecordingAudio ? 'Recording Voice Note...' : 'Attach a Voice Note'}
                      </p>
                    )}
                  </div>
                  
                  {!audioUrl && (
                    <button
                      type="button"
                      onClick={toggleAudio}
                      title={isRecordingAudio ? 'Stop Recording' : 'Record Voice Note'}
                      className="clay-btn-round inline-flex h-9 w-9 shrink-0 items-center justify-center transition ml-2"
                      style={{
                        backgroundColor: isRecordingAudio ? '#FFEBEE' : 'var(--clay-bg)',
                        color: isRecordingAudio ? '#C62828' : 'var(--clay-primary)',
                        animation: isRecordingAudio ? 'mic-pulse 1s ease-in-out infinite' : 'none',
                      }}
                    >
                      {isRecordingAudio ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </section>

              {/* ── Live Camera Photo/Video ── */}
              <section className="clay-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Camera className="h-4 w-4" style={{ color: 'var(--clay-primary)' }} />
                  <p className="text-sm font-medium text-black">Capture Photo or Video</p>
                </div>

                {showCamera ? (
                  <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ height: '320px' }}>
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={() => videoRef.current?.play()}
                      className="h-full w-full object-cover"
                    />
                    
                    {/* Live Rec Indicator */}
                    {isRecordingVideo && (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-red-600/90 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        REC
                      </div>
                    )}

                    {/* Camera Controls */}
                    <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-6">
                      <button 
                        type="button" 
                        onClick={closeCamera} 
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {/* Capture Photo Button */}
                      {!isRecordingVideo && (
                        <button 
                          type="button" 
                          onClick={capturePhoto} 
                          className="h-14 w-14 rounded-full border-4 border-white bg-white/20 transition active:scale-95"
                          title="Take Photo"
                        />
                      )}

                      {/* Capture Video Button */}
                      <button 
                        type="button" 
                        onClick={toggleVideoRecording} 
                        className={`h-14 w-14 rounded-full border-4 border-white transition flex items-center justify-center ${isRecordingVideo ? 'bg-red-500 scale-90' : 'bg-red-500/20 active:scale-95'}`}
                        title={isRecordingVideo ? 'Stop Video' : 'Record Video'}
                      >
                         <span className={`block rounded-sm bg-white transition-all ${isRecordingVideo ? 'h-4 w-4' : 'h-3 w-3 rounded-full'}`} />
                      </button>

                      <button 
                        type="button" 
                        onClick={switchCamera} 
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
                        title="Switch Camera"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : !media ? (
                  <button
                    type="button"
                    onClick={openCamera}
                    className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 transition"
                    style={{ borderColor: 'var(--clay-card-alt)' }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--clay-bg)', color: 'var(--clay-primary)' }}>
                      <Camera className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--clay-primary)' }}>Start Camera</p>
                    <p className="text-xs" style={{ color: 'var(--clay-muted)' }}>Take a photo or hold to record video</p>
                  </button>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl bg-black">
                    {media.type === 'video' ? (
                      /* eslint-disable-next-line jsx-a11y/media-has-caption */
                      <video src={media.url} controls className="aspect-video w-full object-cover" />
                    ) : (
                      <img src={media.url} alt="Captured issue" className="aspect-video w-full object-cover" />
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setMedia(null)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    
                    <div className="absolute bottom-2 left-2 right-2">
                       <button
                         type="button"
                         onClick={openCamera}
                         className="w-full rounded-xl py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-md"
                         style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                       >
                         Retake Media
                       </button>
                    </div>
                  </div>
                )}
                
                {/* Hidden canvas for taking photos */}
                <canvas ref={canvasRef} className="hidden" />
              </section>

              {/* ── Location ── */}
              <section className="clay-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" style={{ color: 'var(--clay-primary)' }} />
                  <p className="text-sm font-medium text-black">{t('reportIssue.locationLabel', { defaultValue: 'Your Location' })}</p>
                </div>
                
                <p className="mb-2 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--clay-muted)' }}>
                  {gpsLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t('reportIssue.detectingLocation', { defaultValue: 'Detecting location...' })}
                    </>
                  ) : (
                    locationText || '-'
                  )}
                </p>

                <div className="h-[180px] overflow-hidden rounded-xl bg-gray-100">
                  <MapContainer 
                    center={pos} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <ChangeView center={pos} />
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker
                      position={pos}
                      draggable
                      eventHandlers={{
                        dragend: async (e) => {
                          const ll = e.target.getLatLng();
                          const newPos = [ll.lat, ll.lng];
                          setPos(newPos);
                          setLocationText('Updating location...');
                          setLocationText(await reverseGeocode(newPos[0], newPos[1]));
                        },
                      }}
                    />
                  </MapContainer>
                </div>
              </section>

              {/* ── Submit ── */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || (!description.trim() && !media && !audioBlob)}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white disabled:opacity-70 transition-opacity"
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

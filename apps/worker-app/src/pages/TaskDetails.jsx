import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { completeTask, loadTaskDetails, startTask } from '../features/tasks/taskSlice';

export default function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { selectedTask: task, loading, error } = useSelector((s) => s.tasks);
  const [beforePhotoFile, setBeforePhotoFile] = useState(null);
  const [afterPhotoFile, setAfterPhotoFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState('');
  const [afterPreview, setAfterPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  useEffect(() => { if (id) dispatch(loadTaskDetails(id)); }, [dispatch, id]);

  const started = task?.status === 'in_progress' || task?.status === 'done';
  const canComplete = started && beforePhotoFile && afterPhotoFile;

  const dueText = useMemo(() => {
    if (!task?.due_at) return 'N/A';
    return new Date(task.due_at).toLocaleString('en-IN');
  }, [task?.due_at]);

  const onStart = async () => {
    await dispatch(startTask(id));
    await dispatch(loadTaskDetails(id));
  };

  const onComplete = async () => {
    if (!canComplete) return;
    setSubmitting(true);
    const result = await dispatch(completeTask({ taskId: id, beforePhotoFile, afterPhotoFile }));
    setSubmitting(false);
    if (!result.error) navigate('/');
  };

  if (loading || !task) return <div className="p-4 text-sm">Loading task details...</div>;
  if (error) return <div className="p-4 text-sm text-red-600">{error}</div>;

  return (
    <div className="bg-[var(--sm-bg)] min-h-screen pb-[120px]">
      <div className="sm-topbar">
        <button onClick={() => navigate(-1)} className="text-white">Back</button>
        <span className="ml-3 text-[16px] font-semibold">Task Details</span>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4">
          <h2 className="text-[16px] font-bold">{task.bin?.label || task.title}</h2>
          <div className="text-[13px] text-gray-600 mt-1">{task.location_address || 'N/A'}</div>
          <div className="text-[12px] text-gray-500 mt-2">Due: {dueText}</div>
          <div className="text-[12px] mt-1">Status: <strong>{task.status}</strong></div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4">
          <h3 className="text-[14px] font-semibold mb-3">Proof of Resolution</h3>
          <CameraCaptureCard title="Before Photo" onCapture={(file, preview) => { setBeforePhotoFile(file); setBeforePreview(preview); }} preview={beforePreview} />
          <CameraCaptureCard title="After Photo" onCapture={(file, preview) => { setAfterPhotoFile(file); setAfterPreview(preview); }} preview={afterPreview} />
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-4">
          <h3 className="text-[14px] font-semibold mb-2">Radio Note</h3>
          <textarea className="w-full border rounded-lg p-2 text-[13px]" rows={3} placeholder="Add short voice/radio note" value={voiceText} onChange={(e) => setVoiceText(e.target.value)} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-40">
        {!started ? (
          <button className="sm-btn-primary" onClick={onStart}>Start Task</button>
        ) : (
          <button className="sm-btn-primary" onClick={onComplete} disabled={!canComplete || submitting}>
            {submitting ? 'Uploading...' : 'Mark Resolved'}
          </button>
        )}
      </div>
    </div>
  );
}

function CameraCaptureCard({ title, onCapture, preview }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment');

  const startCam = async () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  useEffect(() => { startCam(); return () => streamRef.current?.getTracks().forEach((t) => t.stop()); }, [facingMode]);

  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file, URL.createObjectURL(blob));
    }, 'image/jpeg', 0.9);
  };

  return <div className="mb-4 border rounded-lg p-2"><div className="text-[12px] font-medium mb-2">{title} (Camera only)</div><video ref={videoRef} autoPlay playsInline muted className="w-full rounded border bg-black" style={{ maxHeight: 190 }} /><div className="flex gap-2 mt-2"><button type="button" className="px-3 py-1 rounded bg-[#185FA5] text-white text-[12px]" onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}>Flip Camera</button><button type="button" className="px-3 py-1 rounded bg-[var(--sm-primary)] text-white text-[12px]" onClick={capture}>Capture</button></div>{preview && <img src={preview} alt={title} className="mt-2 w-full rounded border" style={{ maxHeight: 140, objectFit: 'cover' }} />}</div>;
}

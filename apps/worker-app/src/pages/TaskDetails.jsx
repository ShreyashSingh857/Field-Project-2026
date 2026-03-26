import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { completeTask, loadTaskDetails, startTask } from '../features/tasks/taskSlice';
import { uploadPhoto } from '../features/photoUpload/photoSlice';
import { getSLAColor } from '../features/sla/slaAPI';
import { loadSLA, selectSLA } from '../features/sla/slaSlice';

const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { selectedTask: task, loading, error } = useSelector((s) => s.tasks);
  const sla = useSelector(selectSLA);
  useEffect(() => { if (id) dispatch(loadTaskDetails(id)); }, [dispatch, id]);
  useEffect(() => { if (id) dispatch(loadSLA(id)); }, [dispatch, id]);

  const [qrScanned, setQrScanned] = useState(false);
  const [beforePhoto, setBeforePhoto] = useState(false);
  const [afterPhoto, setAfterPhoto] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNote, setVoiceNote] = useState(null);
  const [proofPhotoFile, setProofPhotoFile] = useState(null);

  const canComplete = qrScanned && beforePhoto && afterPhoto;
  const fillLevel = task.fill_level ?? task.bin?.fill_level ?? 0;
  const dueAt = task.due_at
    ? new Date(task.due_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  const handleComplete = () => {
    if (canComplete) {
      dispatch(uploadPhoto({ file: proofPhotoFile, taskId: id }));
      dispatch(completeTask({ taskId: id, proofPhotoUrl: null }));
      navigate('/');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setVoiceNote("Issue with bin lid - Requires maintenance.");
    } else {
      setIsRecording(true);
      setVoiceNote(null);
    }
  };

  const getFillColor = (fillLevel) => {
    if (fillLevel >= 80) return '#E24B4A';
    if (fillLevel >= 50) return '#EF9F27';
    return '#639922';
  };

  if (loading || !task) return <div className="p-4 text-sm">Loading...</div>;
  if (error) return <div className="p-4 text-sm text-red-600">{error}</div>;

  return (
    <div className="bg-[var(--sm-bg)] min-h-screen pb-[120px]">
      <div className="sm-topbar">
        <button onClick={() => navigate(-1)} className="p-2 text-white">
          <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-[16px] font-semibold text-white ml-2 flex-1">Task Details</span>
      </div>

      <div className="p-4">
        {/* Task Info Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-[18px] font-bold text-[var(--sm-text)] mb-1">{task.bin?.label || task.title}</h2>
              <div className="text-[13px] text-[var(--sm-text-muted)] flex items-center gap-1">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {task.location_address}
              </div>
            </div>
            <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-[12px] font-bold">
              {task.bin?.id}
            </span>
          </div>

          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-gray-50 rounded p-2 border border-gray-100">
                <div className="text-[10px] text-[var(--sm-text-muted)] uppercase tracking-wide">Area Type</div>
                <div className="text-[12px] font-semibold">{task.status}</div>
              </div>
              <div className="bg-gray-50 rounded p-2 border border-gray-100">
                <div className="text-[10px] text-[var(--sm-text-muted)] uppercase tracking-wide">Density</div>
                <div className="text-[12px] font-semibold">{dueAt}</div>
              </div>
            </div>

            <div className="flex justify-between text-[13px] font-medium mb-2">
              <span>{t('fillLevel')}</span>
              <span style={{ color: getFillColor(fillLevel) }} className="font-bold">{fillLevel}%</span>
            </div>
            <div className="fill-bar-bg h-2.5">
              <div
                className="fill-bar-progress"
                style={{ width: `${fillLevel}%`, backgroundColor: getFillColor(fillLevel) }}
              ></div>
            </div>
            <div className="text-right text-[11px] text-[var(--sm-text-muted)] mt-1">
              Reached 80% {task.status}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-100">
            <svg width="20" height="20" className="text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-[13px] font-semibold text-red-700">
              SLA Goal: <span className="font-bold">{dueAt}</span>
            </div>
          </div>
          <div className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold" style={{ backgroundColor: `${getSLAColor(sla?.data?.due_at || task.due_at)}22`, color: getSLAColor(sla?.data?.due_at || task.due_at) }}>
            SLA Status: {(sla?.data?.status || task.status || 'pending').replace('_', ' ')}
          </div>
        </div>

        {/* Proof of Work Section */}
        <h3 className="text-[14px] font-bold text-[var(--sm-text)] mb-3 px-1 uppercase tracking-wide opacity-80">{t('proofOfWork')}</h3>
        
        <div className="flex flex-col gap-3 mb-6">
          {/* Action 1: QR Scan */}
          <button onClick={() => { setQrScanned(true); dispatch(startTask(id)); }} className={`flex items-center justify-between p-4 rounded-xl border ${qrScanned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${qrScanned ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="text-left">
                <div className={`text-[15px] font-semibold ${qrScanned ? 'text-green-800' : 'text-[var(--sm-text)]'}`}>{t('scanQr')}</div>
                <div className={`text-[12px] ${qrScanned ? 'text-green-600' : 'text-gray-500'}`}>
                  {qrScanned ? 'Verified Bin Match' : 'Mandatory for location proof'}
                </div>
              </div>
            </div>
            {qrScanned && (
              <svg width="24" height="24" className="text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Action 2: Before Photo */}
          <button onClick={() => setBeforePhoto(true)} disabled={!qrScanned} className={`flex items-center justify-between p-4 rounded-xl border ${beforePhoto ? 'bg-green-50 border-green-200' : !qrScanned ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${beforePhoto ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left">
                <div className={`text-[15px] font-semibold ${beforePhoto ? 'text-green-800' : 'text-[var(--sm-text)]'}`}>{t('beforePhoto')}</div>
                <div className={`text-[12px] ${beforePhoto ? 'text-green-600' : 'text-gray-500'}`}>
                  {beforePhoto ? 'Photo Uploaded' : 'Capture full bin view'}
                </div>
              </div>
            </div>
            {beforePhoto && (
              <svg width="24" height="24" className="text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Action 3: After Photo */}
          <button onClick={() => setAfterPhoto(true)} disabled={!beforePhoto} className={`flex items-center justify-between p-4 rounded-xl border ${afterPhoto ? 'bg-green-50 border-green-200' : !beforePhoto ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${afterPhoto ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left">
                <div className={`text-[15px] font-semibold ${afterPhoto ? 'text-green-800' : 'text-[var(--sm-text)]'}`}>{t('afterPhoto')}</div>
                <div className={`text-[12px] ${afterPhoto ? 'text-green-600' : 'text-gray-500'}`}>
                  {afterPhoto ? 'Photo Uploaded' : 'Capture empty bin view'}
                </div>
              </div>
            </div>
            {afterPhoto && (
              <svg width="24" height="24" className="text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* Voice & Issue Report Section */}
        <div className="mb-4 bg-red-50 border border-red-100 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[14px] font-bold text-red-800">Report Issue</h3>
            <span className="text-[11px] bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-semibold">Priority Escalation</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <label className="flex items-center gap-2 p-2 bg-white rounded border border-red-100 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-red-600 rounded focus:ring-red-500" />
              <span className="text-[12px] font-medium text-gray-700">Damaged Bin</span>
            </label>
            <label className="flex items-center gap-2 p-2 bg-white rounded border border-red-100 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-red-600 rounded focus:ring-red-500" />
              <span className="text-[12px] font-medium text-gray-700">Sensor Fault</span>
            </label>
            <button className="col-span-2 flex items-center justify-center gap-2 py-2 bg-white border border-gray-300 rounded text-gray-700 font-medium text-[13px] active:bg-gray-50">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              Attach Photo of Damage
            </button>
          </div>
          
          <button 
            onClick={toggleRecording}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${
              isRecording ? 'bg-red-600 text-white shadow-md' : 'bg-white border border-red-200 text-red-700'
            }`}
          >
            {isRecording ? (
              <>
                <span className="animate-pulse h-3 w-3 bg-white rounded-full inline-block"></span>
                Recording... Tap to Stop
              </>
            ) : (
              <>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Hold to Add Voice Note
              </>
            )}
          </button>

          {voiceNote && (
            <div className="mt-3 bg-white p-3 border border-red-100 rounded-lg flex items-start gap-2">
              <svg width="18" height="18" className="text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <div>
                <p className="text-[12px] italic text-gray-700">"{voiceNote}"</p>
                <div className="text-[10px] text-gray-400 mt-1">Transcribed automatically</div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setProofPhotoFile(e.target.files?.[0] || null)}
        />
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)] z-40">
          <button 
            className="sm-btn-primary w-full shadow-lg shadow-green-900/20"
            disabled={!canComplete}
            onClick={handleComplete}
          >
            {canComplete ? t('markCompleted') : 'Complete All Steps Above'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;
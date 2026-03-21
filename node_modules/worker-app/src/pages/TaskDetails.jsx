import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const mockTaskDetails = {
  t1: {
    id: 't1',
    binId: 'BIN-104',
    binName: 'Main Square Bin',
    fillLevel: 95,
    location: 'Near Panchayat Office, Sector 4',
    slaCountdown: '15 mins left',
    status: 'pending'
  }
};

const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const task = mockTaskDetails[id] || mockTaskDetails['t1']; // Fallback to avoid error on mock

  const [qrScanned, setQrScanned] = useState(false);
  const [beforePhoto, setBeforePhoto] = useState(false);
  const [afterPhoto, setAfterPhoto] = useState(false);

  // Validate if task can be completed
  const canComplete = qrScanned && beforePhoto && afterPhoto;

  const handleComplete = () => {
    if (canComplete) {
      alert("Task Completed Successfully!");
      navigate('/');
    }
  };

  const getFillColor = (fillLevel) => {
    if (fillLevel >= 80) return '#E24B4A';
    if (fillLevel >= 50) return '#EF9F27';
    return '#639922';
  };

  return (
    <div className="bg-[var(--sm-bg)] min-h-screen pb-[100px]">
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
              <h2 className="text-[18px] font-bold text-[var(--sm-text)] mb-1">{task.binName}</h2>
              <div className="text-[13px] text-[var(--sm-text-muted)] flex items-center gap-1">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {task.location}
              </div>
            </div>
            <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-[12px] font-bold">
              {task.binId}
            </span>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-[13px] font-medium mb-2">
              <span>{t('fillLevel')}</span>
              <span style={{ color: getFillColor(task.fillLevel) }} className="font-bold">{task.fillLevel}%</span>
            </div>
            <div className="fill-bar-bg h-2.5">
              <div 
                className="fill-bar-progress" 
                style={{ width: `${task.fillLevel}%`, backgroundColor: getFillColor(task.fillLevel) }}
              ></div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-100">
            <svg width="20" height="20" className="text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-[13px] font-semibold text-red-700">
              SLA Goal: <span className="font-bold">{task.slaCountdown}</span>
            </div>
          </div>
        </div>

        {/* Proof of Work Section */}
        <h3 className="text-[14px] font-bold text-[var(--sm-text)] mb-3 px-1 uppercase tracking-wide opacity-80">{t('proofOfWork')}</h3>
        
        <div className="flex flex-col gap-3 mb-8">
          {/* Action 1: QR Scan */}
          <button 
            onClick={() => setQrScanned(true)}
            className={`flex items-center justify-between p-4 rounded-xl border ${qrScanned ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
          >
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
          <button 
            onClick={() => setBeforePhoto(true)}
            disabled={!qrScanned}
            className={`flex items-center justify-between p-4 rounded-xl border ${beforePhoto ? 'bg-green-50 border-green-200' : !qrScanned ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}
          >
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
          <button 
            onClick={() => setAfterPhoto(true)}
            disabled={!beforePhoto}
            className={`flex items-center justify-between p-4 rounded-xl border ${afterPhoto ? 'bg-green-50 border-green-200' : !beforePhoto ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}
          >
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

        {/* Submit Button */}
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
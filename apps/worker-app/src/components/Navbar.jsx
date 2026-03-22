import React, { useState, useEffect } from 'react';

const Navbar = ({ workerName, area, onLanguageToggle, lang }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="sm-topbar relative">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white text-[var(--sm-primary)] flex items-center justify-center font-bold text-lg">
          {workerName.charAt(0)}
        </div>
        <div>
          <div className="text-[16px] font-semibold flex items-center gap-2">
            {workerName}
            {!isOnline && (
              <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                Offline Mode
              </span>
            )}
            {isOnline && (
              <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 opacity-80">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Online
              </span>
            )}
          </div>
          <div className="text-[12px] opacity-90">{area}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={() => {
            if(window.confirm('🚨 Trigger SOS Emergency Alert? This will immediately notify your supervisor.')) {
              alert('SOS Sent! Supervisor is being notified.');
            }
          }}
          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-sm flex items-center justify-center border-2 border-red-400"
          title="SOS / Emergency"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
        <button 
          onClick={onLanguageToggle}
          className="bg-white/20 px-3 py-1.5 rounded text-sm font-bold border border-white/40"
        >
          {lang.toUpperCase()}
        </button>
      </div>
    </div>
  );
};

export default Navbar;
import React from 'react';

const Navbar = ({ workerName, area, onLanguageToggle, lang }) => {
  return (
    <div className="sm-topbar">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white text-[var(--sm-primary)] flex items-center justify-center font-bold text-lg">
          {workerName.charAt(0)}
        </div>
        <div>
          <div className="text-[16px] font-semibold">{workerName}</div>
          <div className="text-[12px] opacity-90">{area}</div>
        </div>
      </div>
      <div>
        <button 
          onClick={onLanguageToggle}
          className="bg-white/20 px-3 py-1 rounded text-sm font-medium border border-white/40"
        >
          {lang === 'en' ? 'EN' : lang === 'hi' ? 'HI' : 'MR'}
        </button>
      </div>
    </div>
  );
};

export default Navbar;
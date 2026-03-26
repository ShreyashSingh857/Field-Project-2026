import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import BottomNav from '../components/BottomNav';
import { useTranslation } from 'react-i18next';
import { logout } from '../features/auth/authSlice';

const Profile = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { worker } = useSelector((s) => s.auth);
  const [lang, setLang] = useState(i18n.language || 'en');

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="bg-[var(--sm-bg)] min-h-screen pb-[100px]">
      {/* Simple Custom Navbar for Profile to allow space for content */}
      <div className="sm-topbar">
        <div className="flex-1">
          <p className="m-0 text-white text-[16px] font-semibold">My Profile & Performance</p>
        </div>
      </div>

      <div className="p-4">
        {/* Profile Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--sm-primary)] text-white text-3xl font-bold flex items-center justify-center mx-auto mb-3 shadow-md">
            RK
          </div>
          <h2 className="text-[20px] font-bold text-[var(--sm-text)] m-0">{worker?.name || 'Worker'}</h2>
          <p className="text-[14px] text-[var(--sm-text-muted)] font-mono mt-1">{worker?.employee_id || 'N/A'}</p>
          <p className="text-[12px] text-[var(--sm-text-muted)] mt-1">Village: {worker?.village_id || 'N/A'}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-left">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-[11px] text-[var(--sm-text-muted)] uppercase font-semibold mb-1">Assigned Area</p>
              <p className="text-[14px] font-semibold text-[var(--sm-text)]">{worker?.assigned_area || 'Not assigned'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-[11px] text-[var(--sm-text-muted)] uppercase font-semibold mb-1">Phone</p>
              <p className="text-[14px] font-semibold text-[var(--sm-text)]">{worker?.phone || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Advanced Performance Dashboard */}
        <h3 className="text-[14px] font-bold text-[var(--sm-primary)] mb-3 px-1 uppercase tracking-wide">Performance Stats (This Week)</h3>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-2">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[24px] font-bold text-[var(--sm-text)]">94%</span>
            <span className="text-[11px] text-[var(--sm-text-muted)] font-semibold text-center mt-1">SLA Adherence</span>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[24px] font-bold text-[var(--sm-text)]">22m</span>
            <span className="text-[11px] text-[var(--sm-text-muted)] font-semibold text-center mt-1">Avg Completion Time</span>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center col-span-2">
            <div className="flex gap-2 items-center mb-2">
              <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <span className="text-[24px] font-bold text-[var(--sm-text)]">₹ 450</span>
            </div>
            <span className="text-[12px] text-[var(--sm-text-muted)] font-semibold text-center">Incentives Earned</span>
            <div className="w-full bg-gray-100 h-2 rounded-full mt-3">
              <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
            <span className="text-[10px] text-gray-500 mt-1">₹50 to next milestone</span>
          </div>
        </div>

        {/* Gamification / Badges */}
        <h3 className="text-[14px] font-bold text-[var(--sm-primary)] mb-3 px-1 uppercase tracking-wide">My Badges</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 mb-2 -mx-4 px-4 hide-scrollbar">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border-4 border-yellow-100 flex items-center justify-center shadow-sm">
              <svg width="28" height="28" className="text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold mt-2">Speedster</span>
            <span className="text-[9px] text-gray-500">Fastest Ward</span>
          </div>
          
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-700 border-4 border-green-100 flex items-center justify-center shadow-sm">
              <svg width="28" height="28" className="text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold mt-2">Zero Overdue</span>
            <span className="text-[9px] text-gray-500">7 Days Streak</span>
          </div>

          <div className="flex flex-col items-center flex-shrink-0 opacity-50 grayscale">
            <div className="w-16 h-16 rounded-full bg-gray-200 border-4 border-gray-100 flex items-center justify-center shadow-sm">
              <svg width="28" height="28" className="text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <span className="text-[11px] font-bold mt-2">Local Hero</span>
            <span className="text-[9px] text-gray-500">Unlock at 100 tasks</span>
          </div>
        </div>

        {/* Settings & Preferences */}
        <h3 className="text-[14px] font-bold text-[var(--sm-primary)] mb-3 px-1 uppercase tracking-wide mt-2">Settings</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center">
            <span className="font-semibold text-[14px]">App Language</span>
            <div className="flex gap-2">
              {['en', 'hi', 'mr'].map((l) => (
                <button 
                  key={l}
                  onClick={() => handleLanguageChange(l)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${lang === l ? 'bg-[var(--sm-primary)] text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-b border-gray-50 flex justify-between items-center">
            <span className="font-semibold text-[14px]">Map Offline Mode</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--sm-primary)]"></div>
            </label>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full bg-white border-2 border-red-500 text-red-600 font-bold py-3.5 rounded-xl text-[16px] active:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>

      </div>
      
      <BottomNav />
    </div>
  );
};

export default Profile;

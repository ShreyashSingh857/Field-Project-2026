import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import BottomNav from '../components/BottomNav';
import { useTranslation } from 'react-i18next';
import { logout } from '../features/auth/authSlice';
import { loadTasks } from '../features/tasks/taskSlice';

const Profile = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { worker } = useSelector((s) => s.auth);
  const tasks = useSelector((s) => s.tasks.items || []);
  const [lang, setLang] = useState(i18n.language || 'en');

  useEffect(() => {
    if (!worker?.id) return;
    dispatch(loadTasks({ workerId: worker.id, villageId: worker.village_id }));
  }, [dispatch, worker?.id, worker?.village_id]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const active = tasks.filter((t) => t.status !== 'done').length;
    const overdue = tasks.filter((t) => t.due_at && new Date(t.due_at) < new Date() && t.status !== 'done').length;
    return { total, done, active, overdue };
  }, [tasks]);

  const initials = useMemo(() => {
    const name = (worker?.name || 'Worker').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || 'W') + (parts[1]?.[0] || '');
  }, [worker?.name]);

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
      <div className="sm-topbar">
        <div className="flex-1">
          <p className="m-0 text-white text-[16px] font-semibold">Worker Profile</p>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-5 text-center">
          <div className="w-20 h-20 rounded-full bg-[var(--sm-primary)] text-white text-3xl font-bold flex items-center justify-center mx-auto mb-3">
            {initials.toUpperCase()}
          </div>
          <h2 className="text-[20px] font-bold text-[var(--sm-text)] m-0">{worker?.name || 'Worker'}</h2>
          <p className="text-[13px] text-[var(--sm-text-muted)] font-mono mt-1">{worker?.employee_id || 'N/A'}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 text-left">
            <InfoCard label="Assigned Area" value={worker?.assigned_area || 'Not assigned'} />
            <InfoCard label="Phone" value={worker?.phone || 'Not provided'} />
            <InfoCard label="Village ID" value={worker?.village_id || 'N/A'} />
            <InfoCard label="Creator Admin ID" value={worker?.created_by_admin_id || 'N/A'} />
          </div>
        </div>

        <h3 className="text-[14px] font-bold text-[var(--sm-primary)] mb-3 px-1 uppercase tracking-wide">Task Summary</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <InfoCard label="Total Assigned" value={String(stats.total)} />
          <InfoCard label="Completed" value={String(stats.done)} />
          <InfoCard label="Active" value={String(stats.active)} />
          <InfoCard label="Overdue" value={String(stats.overdue)} />
        </div>

        <h3 className="text-[14px] font-bold text-[var(--sm-primary)] mb-3 px-1 uppercase tracking-wide">Settings</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 flex justify-between items-center">
            <span className="font-semibold text-[14px]">App Language</span>
            <div className="flex gap-2">
              {['en', 'hi', 'mr'].map((l) => (
                <button
                  key={l}
                  onClick={() => handleLanguageChange(l)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold ${lang === l ? 'bg-[var(--sm-primary)] text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleLogout} className="w-full bg-white border-2 border-red-500 text-red-600 font-bold py-3.5 rounded-xl text-[16px]">
          Logout
        </button>
      </div>

      <BottomNav />
    </div>
  );
};

function InfoCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-[11px] text-[var(--sm-text-muted)] uppercase font-semibold mb-1">{label}</p>
      <p className="text-[13px] font-semibold text-[var(--sm-text)] break-all">{value}</p>
    </div>
  );
}

export default Profile;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import TaskCard from '../components/TaskCard';

// Mock data for Phase 1 MVP
const mockTasks = [
  {
    id: 't1',
    binId: 'BIN-104',
    binName: 'Main Square Bin',
    fillLevel: 95,
    priority: 'high',
    slaCountdown: '15 mins left',
    distance: '200m',
    status: 'pending',
    overdue: false,
  },
  {
    id: 't2',
    binId: 'BIN-108',
    binName: 'Market Line 2',
    fillLevel: 80,
    priority: 'high',
    slaCountdown: 'Overdue by 10 mins',
    distance: '450m',
    status: 'pending',
    overdue: true,
  },
  {
    id: 't3',
    binId: 'BIN-085',
    binName: 'School Road Bin',
    fillLevel: 55,
    priority: 'medium',
    slaCountdown: '2 hours left',
    distance: '1.2km',
    status: 'in_progress',
    overdue: false,
  },
  {
    id: 't4',
    binId: 'BIN-012',
    binName: 'River Side Bin',
    fillLevel: 10,
    priority: 'low',
    slaCountdown: 'Completed',
    distance: '800m',
    status: 'completed',
    overdue: false,
  }
];

const TaskDashboard = () => {
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState('en');
  
  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'hi' : lang === 'hi' ? 'mr' : 'en';
    setLang(nextLang);
    i18n.changeLanguage(nextLang);
  };

  const tasksCompleted = mockTasks.filter(t => t.status === 'completed').length;
  const totalTasks = mockTasks.length;

  return (
    <div className="bg-[var(--sm-bg)] min-h-screen">
      <Navbar 
        workerName="Ramesh Kumar" 
        area="South Village Sector" 
        onLanguageToggle={toggleLang} 
        lang={lang} 
      />
      
      <div className="sm-page">
        {/* Simple Performance View */}
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6 flex justify-between items-center border border-gray-100">
          <div>
            <div className="text-[var(--sm-text-muted)] text-[12px] font-medium mb-1">{t('todayTasks')}</div>
            <div className="text-[20px] font-bold text-[var(--sm-text)]">
              {tasksCompleted} / {totalTasks}
              <span className="text-[14px] font-normal text-[var(--sm-text-muted)] ml-2">{t('tasksCompleted')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-[var(--sm-primary)] flex items-center justify-center font-bold text-[var(--sm-primary)]">
            {Math.round((tasksCompleted / totalTasks) * 100)}%
          </div>
        </div>

        {/* Notifications (Mock Phase 1) */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6 flex items-start gap-3">
          <div className="mt-0.5 text-orange-600">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-orange-800">{t('slaAlert')}</div>
            <div className="text-[12px] text-orange-700">Market Line 2 bin is overdue!</div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[16px] font-bold text-[var(--sm-text)]">{t('todayTasks')}</h2>
          <span className="text-[12px] text-[var(--sm-text-muted)]">{totalTasks} {t('assigned')}</span>
        </div>

        {/* Task List */}
        <div className="flex flex-col gap-1">
          {mockTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default TaskDashboard;
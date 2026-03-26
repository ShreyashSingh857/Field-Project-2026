import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import BottomNav from '../components/BottomNav';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import { initTaskRealtime, loadTasks, stopTaskRealtime } from '../features/tasks/taskSlice';

const toCardTask = (task) => {
  const fillLevel = task?.bin?.fill_level ?? 0;
  const priority = task.priority === 1 ? 'high' : task.priority === 3 ? 'low' : 'medium';
  const status = task.status === 'done' ? 'completed' : task.status;

  return {
    id: task.id,
    binId: task?.bin?.id?.slice(0, 8) || 'BIN',
    binName: task?.bin?.label || task.title,
    fillLevel,
    priority,
    slaCountdown: task.due_at ? `Due ${new Date(task.due_at).toLocaleTimeString()}` : 'No SLA',
    distance: '--',
    status,
    overdue: task.due_at ? new Date(task.due_at) < new Date() && status !== 'completed' : false,
    smartPick: priority === 'high',
    smartReason: priority === 'high' ? 'Priority task' : undefined,
  };
};

const TaskDashboard = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const [lang, setLang] = useState('en');
  const { worker } = useSelector((state) => state.auth);
  const { items, loading } = useSelector((state) => state.tasks);

  useEffect(() => {
    if (!worker?.id) return;

    dispatch(loadTasks({ workerId: worker.id, villageId: worker.village_id }));
    if (worker.village_id) {
      dispatch(initTaskRealtime({ villageId: worker.village_id }));
    }

    return () => {
      dispatch(stopTaskRealtime());
    };
  }, [dispatch, worker?.id, worker?.village_id]);

  const cardTasks = useMemo(() => items.map(toCardTask), [items]);
  const tasksCompleted = cardTasks.filter((task) => task.status === 'completed').length;
  const totalTasks = cardTasks.length || 1;

  const toggleLang = () => {
    const nextLang = lang === 'en' ? 'hi' : lang === 'hi' ? 'mr' : 'en';
    setLang(nextLang);
    i18n.changeLanguage(nextLang);
  };

  return (
    <div className="bg-[var(--sm-bg)] min-h-screen">
      <Navbar
        workerName={worker?.name || 'Worker'}
        area={worker?.assigned_area || 'Assigned Area'}
        onLanguageToggle={toggleLang}
        lang={lang}
      />

      <div className="sm-page">
        <div className="bg-white rounded-lg p-4 shadow-sm mb-6 flex justify-between items-center border border-gray-100">
          <div>
            <div className="text-[var(--sm-text-muted)] text-[12px] font-medium mb-1">{t('todayTasks')}</div>
            <div className="text-[20px] font-bold text-[var(--sm-text)]">
              {tasksCompleted} / {cardTasks.length}
              <span className="text-[14px] font-normal text-[var(--sm-text-muted)] ml-2">{t('tasksCompleted')}</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-[var(--sm-primary)] flex items-center justify-center font-bold text-[var(--sm-primary)]">
            {Math.round((tasksCompleted / totalTasks) * 100)}%
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[16px] font-bold text-[var(--sm-text)]">{t('todayTasks')}</h2>
          <span className="text-[12px] text-[var(--sm-text-muted)]">{cardTasks.length} {t('assigned')}</span>
        </div>

        {loading && <div className="text-sm text-gray-600 mb-3">Loading tasks...</div>}

        <div className="flex flex-col gap-1 pb-20">
          {cardTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {!loading && cardTasks.length === 0 && (
            <div className="text-sm text-gray-500 bg-white p-4 rounded-lg border border-gray-100">No tasks assigned yet.</div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default TaskDashboard;

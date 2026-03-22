import React from 'react';
import { useNavigate } from 'react-router-dom';

const TaskCard = ({ task }) => {
  const navigate = useNavigate();

  // Helper to determine border color class
  const getBorderClass = (priority, status) => {
    if (status === 'completed') return 'status-completed';
    if (priority === 'high') return 'high';
    if (priority === 'medium') return 'medium';
    return 'low';
  };

  const getBadgeClass = (priority) => {
    if (priority === 'high') return 'high';
    if (priority === 'medium') return 'medium';
    return 'low';
  };

  const getFillColor = (fillLevel) => {
    if (fillLevel >= 80) return '#E24B4A'; // red
    if (fillLevel >= 50) return '#EF9F27'; // orange
    return '#639922'; // green
  };

  return (
    <div 
      className={`sm-task-card ${getBorderClass(task.priority, task.status)}`}
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-[14px] text-[var(--sm-text)] flex items-center gap-2">
            {task.binName}
            {task.smartPick && (
              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 leading-none shadow-sm">
                <svg width="10" height="10" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                AI PICK
              </span>
            )}
          </h3>
          {task.smartReason && (
            <p className="text-[10px] text-purple-600 mt-0.5 font-medium">{task.smartReason}</p>
          )}
        </div>
        <span className={`sm-badge ${getBadgeClass(task.priority)}`}>
          {task.priority.toUpperCase()}
        </span>
      </div>

      <div className="text-[12px] text-[var(--sm-text-muted)] mb-3 flex justify-between">
        <span>ID: {task.binId}</span>
        <span>{task.distance} away</span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-[11px] font-medium mb-1">
          <span>Fill Level</span>
          <span style={{ color: getFillColor(task.fillLevel) }}>{task.fillLevel}%</span>
        </div>
        <div className="fill-bar-bg">
          <div 
            className="fill-bar-progress" 
            style={{ width: `${task.fillLevel}%`, backgroundColor: getFillColor(task.fillLevel) }}
          ></div>
        </div>
      </div>

      <div className="flex justify-between items-center text-[12px]">
        <div className="flex items-center gap-1 font-medium" style={{ color: task.overdue ? '#E24B4A' : 'var(--sm-text-muted)' }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {task.status === 'completed' ? 'Completed' : task.slaCountdown}
        </div>
        <div className="font-semibold" style={{ color: 'var(--sm-primary)' }}>
          {task.status === 'completed' ? 'View Details' : 'Start Task'} &rarr;
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
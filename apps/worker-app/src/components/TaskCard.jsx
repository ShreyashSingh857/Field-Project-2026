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
        <h3 className="font-semibold text-[14px] text-[var(--sm-text)]">{task.binName}</h3>
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
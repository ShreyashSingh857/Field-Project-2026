import api from '../../services/axiosInstance';

async function fetchBaseData() {
  const [tasksRes, binsRes, issuesRes, workersRes] = await Promise.allSettled([
    api.get('/tasks'),
    api.get('/bins'),
    api.get('/issues'),
    api.get('/workers'),
  ]);
  return {
    tasks: tasksRes.status === 'fulfilled' ? tasksRes.value.data?.tasks || [] : [],
    bins: binsRes.status === 'fulfilled' ? binsRes.value.data?.bins || [] : [],
    issues: issuesRes.status === 'fulfilled' ? issuesRes.value.data?.issues || [] : [],
    workers: workersRes.status === 'fulfilled' ? workersRes.value.data?.workers || [] : [],
  };
}

function dayKey(iso) {
  if (!iso) return null;
  return new Date(iso).toISOString().slice(0, 10);
}

export async function getTaskCompletionByDay() {
  const { tasks } = await fetchBaseData();
  const byDay = {};
  tasks.forEach((t) => {
    const key = dayKey(t.created_at || t.updated_at);
    if (!key) return;
    if (!byDay[key]) byDay[key] = { day: key, completed: 0, pending: 0 };
    if (t.status === 'done') byDay[key].completed += 1;
    else byDay[key].pending += 1;
  });
  return Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day));
}

export async function getBinFillHistory() {
  const { bins } = await fetchBaseData();
  const avgFill = bins.length
    ? Number((bins.reduce((acc, b) => acc + Number(b.fill_level ?? 0), 0) / bins.length).toFixed(1))
    : 0;
  return [{ day: new Date().toISOString().slice(0, 10), averageFill: avgFill }];
}

export async function getWorkerPerformance() {
  const { tasks, workers } = await fetchBaseData();
  return workers.map((w) => {
    const assigned = tasks.filter((t) => t.assigned_worker_id === w.id).length;
    const completed = tasks.filter((t) => t.assigned_worker_id === w.id && t.status === 'done').length;
    const rate = assigned ? ((completed / assigned) * 100).toFixed(1) : '0.0';
    return { name: w.name || w.employee_id || 'Worker', assigned, completed, rate };
  });
}

export async function getIssueResolutionStats() {
  const { issues } = await fetchBaseData();
  const open = issues.filter((i) => i.status === 'open').length;
  const assigned = issues.filter((i) => i.status === 'assigned').length;
  const resolved = issues.filter((i) => i.status === 'resolved').length;
  const rejected = issues.filter((i) => i.status === 'rejected').length;
  const totalIssues = issues.length;
  const resolutionRate = totalIssues ? Number(((resolved / totalIssues) * 100).toFixed(1)) : 0;
  return {
    data: [
      { name: 'Open', value: open, fill: '#F59E0B' },
      { name: 'Assigned', value: assigned, fill: '#3B82F6' },
      { name: 'Resolved', value: resolved, fill: '#10B981' },
      { name: 'Rejected', value: rejected, fill: '#6B7280' },
    ],
    resolutionRate,
    totalIssues,
  };
}

export async function getBinStatusDistribution() {
  const { bins } = await fetchBaseData();
  const counts = { Low: 0, Medium: 0, High: 0 };
  bins.forEach((b) => {
    const fill = Number(b.fill_level ?? 0);
    if (fill >= 80) counts.High += 1;
    else if (fill >= 40) counts.Medium += 1;
    else counts.Low += 1;
  });
  return [
    { name: 'Low', value: counts.Low, fill: '#10B981' },
    { name: 'Medium', value: counts.Medium, fill: '#F59E0B' },
    { name: 'High', value: counts.High, fill: '#EF4444' },
  ];
}

export async function getAggregatePerformanceByPanchayat() {
  const { tasks } = await fetchBaseData();
  const grouped = {};
  tasks.forEach((t) => {
    const key = t.village_id || 'unassigned';
    if (!grouped[key]) grouped[key] = { name: key, total_tasks: 0, completed: 0 };
    grouped[key].total_tasks += 1;
    if (t.status === 'done') grouped[key].completed += 1;
  });
  return Object.values(grouped).map((g) => ({
    ...g,
    sla_compliance: g.total_tasks ? Number(((g.completed / g.total_tasks) * 100).toFixed(1)) : 0,
  }));
}

export async function getReportById(reportId) {
  const { data } = await api.get('/reports');
  const reports = data?.reports || [];
  return reports.find((r) => r.id === reportId) || null;
}

export async function downloadReport(reportId) {
  const report = await getReportById(reportId);
  if (!report?.file_url) {
    throw new Error('Report download is not available for this record.');
  }
  return report.file_url;
}

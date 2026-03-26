import api from '../../services/axiosInstance';

export async function fetchIssues(filters = {}) {
  const { data } = await api.get('/issues', { params: filters });
  return data?.issues || [];
}

export async function convertIssueToTask(issue, taskData) {
  const created = await api.post('/tasks', {
    source_issue_id: issue.id,
    type: taskData.type,
    priority: taskData.priority,
    assigned_worker_id: taskData.assigned_worker_id || null,
    due_at: taskData.due_at,
    title: issue.description?.slice(0, 120) || 'Issue Resolution Task',
    description: issue.description || 'Auto-created from issue',
    location_lat: issue.location_lat,
    location_lng: issue.location_lng,
    location_address: issue.location_address || 'N/A',
    village_id: issue.village_id || null,
    bin_id: issue.bin_id || null,
  });
  await api.patch(`/issues/${issue.id}`, { status: 'assigned', created_task_id: created.data?.id });
  return created.data;
}

export async function rejectIssue(issueId, rejectionReason) {
  const { data } = await api.patch(`/issues/${issueId}`, { status: 'rejected', rejection_reason: rejectionReason });
  return data;
}

export async function updateIssueStatus(issueId, status) {
  const { data } = await api.patch(`/issues/${issueId}`, { status });
  return data;
}

export async function getIssueById(issueId) {
  const issues = await fetchIssues();
  return issues.find((i) => i.id === issueId) || null;
}

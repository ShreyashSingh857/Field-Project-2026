import api from '../../services/axiosInstance';

export async function fetchIssues(filters = {}) {
  const { data } = await api.get('/issues', { params: filters });
  return data?.issues || [];
}

export async function convertIssueToTask(issueId, taskData) {
  const created = await api.post('/tasks', { ...taskData, source_issue_id: issueId });
  await api.patch(`/issues/${issueId}`, { status: 'assigned', created_task_id: created.data?.id });
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

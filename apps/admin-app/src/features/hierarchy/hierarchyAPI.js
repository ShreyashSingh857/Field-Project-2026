import api from '../../services/axiosInstance';

function unwrapApiError(err) {
  const message = err?.response?.data?.error || err?.response?.data?.message || err?.message;
  throw new Error(message || 'Request failed');
}

export async function fetchSubAdmins() {
  try {
    const { data } = await api.get('/admin/sub-admins');
    return data?.admins || [];
  } catch (err) {
    return unwrapApiError(err);
  }
}

export async function createSubAdmin(subAdminData) {
  try {
    const { data } = await api.post('/admin/sub-admins', subAdminData);
    return data?.admin || data;
  } catch (err) {
    return unwrapApiError(err);
  }
}

export async function deactivateSubAdmin(subAdminId) {
  try {
    const { data } = await api.delete(`/admin/sub-admins/${subAdminId}`);
    return data?.admin || data;
  } catch (err) {
    return unwrapApiError(err);
  }
}

export async function getHierarchyTree() {
  const admins = await fetchSubAdmins();
  return { children: admins };
}

export async function updateSubAdmin(subAdminId, updates) {
  try {
    const { data } = await api.patch(`/admin/sub-admins/${subAdminId}`, updates);
    return data?.admin || data;
  } catch (err) {
    return unwrapApiError(err);
  }
}

export async function getSubAdminById(adminId) {
  const admins = await fetchSubAdmins();
  return admins.find((a) => a.id === adminId) || null;
}

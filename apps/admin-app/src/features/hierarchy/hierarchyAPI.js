import api from '../../services/axiosInstance';

export async function fetchSubAdmins() {
  const { data } = await api.get('/admin/sub-admins');
  return data?.admins || [];
}

export async function createSubAdmin(subAdminData) {
  const { data } = await api.post('/admin/sub-admins', subAdminData);
  return data?.admin || data;
}

export async function deactivateSubAdmin(subAdminId) {
  const { data } = await api.delete(`/admin/sub-admins/${subAdminId}`);
  return data?.admin || data;
}

export async function getHierarchyTree() {
  const admins = await fetchSubAdmins();
  return { children: admins };
}

export async function updateSubAdmin(subAdminId, updates) {
  const { data } = await api.patch(`/admin/sub-admins/${subAdminId}`, updates);
  return data?.admin || data;
}

export async function getSubAdminById(adminId) {
  const admins = await fetchSubAdmins();
  return admins.find((a) => a.id === adminId) || null;
}

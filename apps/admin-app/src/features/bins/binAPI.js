import api from '../../services/axiosInstance';

export async function fetchBins(filters = {}) {
  const params = { ...filters };
  const { data } = await api.get('/bins', { params });
  return data?.bins || [];
}

export async function createBin(binData) {
  const { data } = await api.post('/bins', binData);
  return data;
}

export async function updateBin(binId, updates) {
  const { data } = await api.patch(`/bins/${binId}`, updates);
  return data;
}

export async function fetchWardSubAdmins() {
  const { data } = await api.get('/admin/ward-subadmins');
  return data?.wardMembers || [];
}

export async function saveWardJurisdiction(wardId, geometry, parentBoundaryGeometry = null) {
  const { data } = await api.put(`/admin/ward-subadmins/${wardId}/jurisdiction`, {
    geometry,
    parentBoundaryGeometry,
  });
  return data?.wardMember || null;
}

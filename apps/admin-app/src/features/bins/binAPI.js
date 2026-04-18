import api from '../../services/axiosInstance';

function unwrapApiError(err) {
  const message = err?.response?.data?.error || err?.response?.data?.message || err?.message;
  throw new Error(message || 'Request failed');
}

export async function fetchBins(filters = {}) {
  try {
    const params = { ...filters };
    const { data } = await api.get('/bins', { params });
    return data?.bins || [];
  } catch (err) {
    return unwrapApiError(err);
  }
}

export async function createBin(binData) {
  try {
    const { data } = await api.post('/bins', binData);
    return data;
  } catch (err) {
    return unwrapApiError(err);
  }
}

export async function updateBin(binId, updates) {
  try {
    const { data } = await api.patch(`/bins/${binId}`, updates);
    return data;
  } catch (err) {
    return unwrapApiError(err);
  }
}

export async function fetchWardSubAdmins() {
  try {
    const { data } = await api.get('/admin/ward-subadmins');
    return data?.wardMembers || [];
  } catch (err) {
    return unwrapApiError(err);
  }
}

export async function saveWardJurisdiction(wardId, geometry, parentBoundaryGeometry = null) {
  try {
    const { data } = await api.put(`/admin/ward-subadmins/${wardId}/jurisdiction`, {
      geometry,
      parentBoundaryGeometry,
    });
    return data?.wardMember || null;
  } catch (err) {
    return unwrapApiError(err);
  }
}

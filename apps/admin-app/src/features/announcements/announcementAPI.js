import api from '../../services/axiosInstance';

export async function fetchAnnouncements(adminIdOrFilters = {}, scope, filters) {
  const params =
    filters && typeof filters === 'object'
      ? filters
      : adminIdOrFilters && typeof adminIdOrFilters === 'object'
      ? adminIdOrFilters
      : {};
  const { data } = await api.get('/announcements', { params });
  return data?.announcements || [];
}

export async function createAnnouncement(announcementData) {
  const { data } = await api.post('/announcements', announcementData);
  return data?.announcement || data;
}

export async function deleteAnnouncement(announcementId) {
  const { data } = await api.delete(`/announcements/${announcementId}`);
  return data;
}

export async function togglePin(announcementId, is_pinned) {
  const { data } = await api.patch(`/announcements/${announcementId}`, { is_pinned });
  return data?.announcement || data;
}

export async function updateAnnouncement(announcementId, updates) {
  const { data } = await api.patch(`/announcements/${announcementId}`, updates);
  return data?.announcement || data;
}

export async function getAnnouncementById(announcementId) {
  const items = await fetchAnnouncements({});
  return items.find((a) => a.id === announcementId) || null;
}

export async function getPinnedAnnouncements() {
  const items = await fetchAnnouncements({});
  return items.filter((a) => a.is_pinned);
}

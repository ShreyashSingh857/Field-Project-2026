import { z } from 'zod';

const optionalUuid = z.string().uuid().optional().nullable();

export const adminLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const workerLoginSchema = z.object({
  employee_id: z.string().trim().min(1),
  password: z.string().min(1),
});

export const workerPasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8),
});

export const workerCreateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(6).max(20).optional().nullable(),
  assigned_area: z.string().trim().min(1).optional().nullable(),
  village_id: optionalUuid,
  language: z.enum(['en', 'hi', 'mr']).optional(),
  password: z.string().min(8).optional(),
});

export const workerUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(6).max(20).optional().nullable(),
  assigned_area: z.string().trim().min(1).optional(),
  language: z.enum(['en', 'hi', 'mr']).optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one updatable field is required',
});

export const workerStatusSchema = z.object({
  is_active: z.boolean(),
});

export const taskCreateSchema = z.object({
  type: z.string().optional(),
  title: z.string().trim().min(1),
  description: z.string().optional().nullable(),
  location_lat: z.coerce.number().min(-90).max(90),
  location_lng: z.coerce.number().min(-180).max(180),
  location_address: z.string().optional().nullable(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  assigned_worker_id: optionalUuid,
  village_id: optionalUuid,
  bin_id: optionalUuid,
  source_issue_id: optionalUuid,
  due_at: z.string().datetime().optional().nullable(),
});

export const taskStatusUpdateSchema = z.object({
  status: z.string().trim().min(1),
  assigned_worker_id: optionalUuid,
});

export const issueCreateSchema = z.object({
  description: z.string().trim().min(1),
  location_lat: z.coerce.number().min(-90).max(90),
  location_lng: z.coerce.number().min(-180).max(180),
  location_address: z.string().trim().optional().nullable(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
});

export const issueUpdateSchema = z.object({
  status: z.string().optional(),
  rejection_reason: z.string().optional().nullable(),
  created_task_id: optionalUuid,
  priority: z.coerce.number().int().min(1).max(3).optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one update field is required',
});

export const marketplaceCreateSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0),
  contact_number: z.string().trim().min(6).max(20),
});

export const marketplaceUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0).optional(),
  contact_number: z.string().trim().min(6).max(20).optional(),
});

export const approveListingSchema = z.object({
  notes: z.string().optional().nullable(),
});

export const rejectListingSchema = z.object({
  reason: z.string().trim().min(1),
});

export const banSellerSchema = z.object({
  reason: z.string().trim().min(1),
});

export const announcementCreateSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  target_village_id: optionalUuid,
  is_pinned: z.boolean().optional(),
});

export const announcementUpdateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
  target_village_id: optionalUuid,
  is_pinned: z.boolean().optional(),
  is_active: z.boolean().optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one field is required',
});

export const sensorIngestSchema = z.object({
  bin_id: optionalUuid,
  sensor_device_id: z.string().trim().optional().nullable(),
  fill_level: z.coerce.number().int().min(0).max(100).optional(),
  measured_distance_cm: z.coerce.number().min(0).optional(),
  battery_pct: z.coerce.number().min(0).max(100).optional(),
  signal_rssi: z.coerce.number().optional(),
  timestamp: z.string().datetime().optional(),
}).refine((v) => Boolean(v.bin_id || v.sensor_device_id), {
  message: 'bin_id or sensor_device_id is required',
}).refine((v) => v.fill_level != null || v.measured_distance_cm != null, {
  message: 'fill_level or measured_distance_cm is required',
});

export const createBinSchema = z.object({
  label: z.string().trim().min(1),
  location_lat: z.coerce.number().min(-90).max(90),
  location_lng: z.coerce.number().min(-180).max(180),
  location_address: z.string().optional().nullable(),
  village_id: optionalUuid,
  fill_level: z.coerce.number().int().min(0).max(100).optional(),
  assigned_panchayat_id: optionalUuid,
  sensor_device_id: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const updateBinSchema = z.object({
  label: z.string().trim().min(1).optional(),
  location_lat: z.coerce.number().min(-90).max(90).optional(),
  location_lng: z.coerce.number().min(-180).max(180).optional(),
  location_address: z.string().optional().nullable(),
  village_id: optionalUuid,
  fill_level: z.coerce.number().int().min(0).max(100).optional(),
  assigned_panchayat_id: optionalUuid,
  sensor_device_id: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const createRecyclingSchema = z.object({
  name: z.string().trim().min(1),
  location_lat: z.coerce.number().min(-90).max(90),
  location_lng: z.coerce.number().min(-180).max(180),
  village_id: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  accepts: z.array(z.string()).optional(),
});

export const updateRecyclingSchema = z.object({
  name: z.string().trim().min(1).optional(),
  location_lat: z.coerce.number().min(-90).max(90).optional(),
  location_lng: z.coerce.number().min(-180).max(180).optional(),
  village_id: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  accepts: z.array(z.string()).optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'At least one field is required',
});

export const escalationResolveSchema = z.object({
  kind: z.enum(['issue', 'task']).optional(),
});

export const aiChatSchema = z.object({
  message: z.string().trim().min(1),
  history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  language: z.enum(['en', 'hi', 'mr']).optional(),
});

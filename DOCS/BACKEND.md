# GramWasteConnect — Backend Reference Document

> **Stack:** Node.js + Express | **Database:** Supabase Postgres | **Storage:** Supabase Storage Buckets
> **Auth:** Supabase Auth (users) + JWT (workers & admins)
> **AI:** Claude/Gemini API proxied through this backend
> This document is the complete implementation guide for the `backend/` folder.

---

## Project Structure

```
backend/
└── src/
    ├── config/
    │   ├── db.js               # Supabase client init (postgres + storage)
    │   └── supabase.js         # Supabase admin client (service role key)
    ├── controllers/
    │   ├── authController.js
    │   ├── binController.js
    │   ├── taskController.js
    │   ├── issueController.js
    │   ├── marketplaceController.js
    │   ├── announcementController.js
    │   ├── adminController.js
    │   ├── workerController.js
    │   └── aiController.js
    ├── middleware/
    │   ├── verifySupabaseAuth.js   # Validates Supabase JWT (user app)
    │   ├── verifyWorkerJWT.js      # Validates worker JWT
    │   ├── verifyAdminJWT.js       # Validates admin JWT
    │   ├── requireRole.js          # Admin role-based access control
    │   └── errorHandler.js
    ├── models/
    │   └── (queries via Supabase JS client — no ORM)
    ├── routes/
    │   ├── authRoutes.js
    │   ├── binRoutes.js
    │   ├── taskRoutes.js
    │   ├── issueRoutes.js
    │   ├── marketplaceRoutes.js
    │   ├── announcementRoutes.js
    │   ├── adminRoutes.js
    │   ├── workerRoutes.js
    │   └── aiRoutes.js
    ├── services/
    │   ├── jwtService.js
    │   ├── storageService.js       # Supabase Storage upload helpers
    │   ├── aiService.js            # Claude/Gemini API calls
    │   ├── taskService.js          # Business logic for task creation/assignment
    │   └── escalationService.js
    ├── utils/
    │   └── helpers.js
    └── server.js
```

---

## Environment Variables

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-for-workers-and-admins
JWT_EXPIRES_IN=7d
CLAUDE_API_KEY=your-anthropic-api-key
AI_MODEL=claude-opus-4-5
```

---

## Authentication Architecture

### 1. User App (Supabase Auth)
- Users sign up / log in via Supabase Auth on the client side.
- The client receives a Supabase JWT (access token).
- This token is sent in the `Authorization: Bearer <token>` header with every API request.
- Backend middleware `verifySupabaseAuth.js` validates it using the Supabase Admin client.

```javascript
// middleware/verifySupabaseAuth.js
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function verifySupabaseAuth(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  req.user = user; // { id, email, phone, ... }
  next();
}
```

### 2. Worker & Admin (Custom JWT)
- Workers and admins log in via `POST /api/auth/worker/login` or `POST /api/auth/admin/login`.
- Backend verifies credentials against Supabase Postgres (bcrypt password check).
- Issues a signed JWT containing `{ id, role, type: 'worker'|'admin' }`.
- Token sent in `Authorization: Bearer <token>` header.

```javascript
// services/jwtService.js
import jwt from 'jsonwebtoken';

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
```

```javascript
// middleware/verifyAdminJWT.js
export function verifyAdminJWT(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = verifyToken(token);
    if (decoded.type !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.admin = decoded; // { id, role, type: 'admin' }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

```javascript
// middleware/requireRole.js
// Usage: requireRole('panchayat_admin') or requireRole(['block_samiti', 'zilla_parishad'])
export function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!allowed.includes(req.admin?.role)) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    next();
  };
}
```

---

## API Routes Reference

All routes are prefixed with `/api`. JSON body for all POST/PATCH requests. Authentication header required unless noted as `[public]`.

---

### Auth Routes — `/api/auth`

#### `POST /api/auth/worker/login`
Login for Safai Mitra workers.
- **Auth:** None
- **Body:** `{ employee_id: string, password: string }`
- **Logic:** Look up worker by `employee_id` in `workers` table. Compare password with `bcrypt.compare`. Issue JWT with `{ id, type: 'worker', employee_id, village_id }`.
- **Response 200:** `{ token: string, worker: { id, name, employee_id, assigned_area, village_id } }`
- **Response 401:** `{ error: 'Invalid credentials' }`

#### `POST /api/auth/admin/login`
Login for all admin roles.
- **Auth:** None
- **Body:** `{ email: string, password: string }`
- **Logic:** Look up admin by `email` in `admins` table. Compare password. Issue JWT with `{ id, role, type: 'admin', jurisdiction_name }`.
- **Response 200:** `{ token: string, admin: { id, name, role, jurisdiction_name } }`
- **Response 401:** `{ error: 'Invalid credentials' }`

#### `POST /api/auth/admin/change-password`
- **Auth:** `verifyAdminJWT`
- **Body:** `{ current_password: string, new_password: string }`
- **Response 200:** `{ message: 'Password updated' }`

#### `POST /api/auth/worker/change-password`
- **Auth:** `verifyWorkerJWT`
- **Body:** `{ current_password: string, new_password: string }`
- **Response 200:** `{ message: 'Password updated' }`

---

### Bin Routes — `/api/bins`

#### `GET /api/bins`
Fetch all active bins for a geographic area.
- **Auth:** `verifySupabaseAuth` (user) OR `verifyWorkerJWT` OR `verifyAdminJWT`
- **Query:** `?village_id=uuid` OR `?lat=float&lng=float&radius=meters` (default radius: 5000m)
- **Response 200:** `{ bins: [ { id, label, location_lat, location_lng, fill_level, fill_status, last_sensor_update, location_address } ] }`

#### `GET /api/bins/:id`
Fetch single bin detail.
- **Auth:** Any authenticated user
- **Response 200:** Full bin object including `location_address`, `last_sensor_update`, `fill_level`, `fill_status`, `sensor_device_id`.

#### `POST /api/bins`
Create a new bin.
- **Auth:** `verifyAdminJWT` + `requireRole('panchayat_admin')`
- **Body:** `{ label, location_lat, location_lng, location_address, village_id }`
- **Logic:** Sets `assigned_panchayat_id` to `req.admin.id`.
- **Response 201:** Created bin object.

#### `PATCH /api/bins/:id`
Update bin info (label, address, active status).
- **Auth:** `verifyAdminJWT` + `requireRole('panchayat_admin')`
- **Body:** Any of `{ label, location_address, is_active }`
- **Response 200:** Updated bin object.

#### `PATCH /api/bins/:id/sensor`
IoT sensor pushes fill level update. This is the future-ready sensor endpoint.
- **Auth:** API Key in `X-Sensor-Key` header (hardcoded env var for now: `SENSOR_API_KEY`)
- **Body:** `{ fill_level: integer, device_id: string }`
- **Logic:**
  1. Verify `device_id` matches `bins.sensor_device_id`.
  2. Update `bins.fill_level` and `bins.last_sensor_update`.
  3. Insert row into `bin_sensor_log`.
  4. The `compute_fill_status` trigger auto-updates `fill_status`.
  5. If `fill_level >= 80`, optionally trigger a task creation for bin cleanup.
- **Response 200:** `{ message: 'Updated', fill_level, fill_status }`
- **Note:** Until hardware is deployed, this endpoint can be called manually or via a test script to simulate sensor data. Frontend always reads from `bins` table — it never calls sensors directly.

---

### Task Routes — `/api/tasks`

#### `GET /api/tasks`
Fetch tasks. Scoped by caller's identity.
- **Auth:** `verifyWorkerJWT` OR `verifyAdminJWT`
- **Worker:** Returns tasks where `assigned_worker_id = req.worker.id` OR tasks in `village_id = req.worker.village_id` with `status = 'pending'` (unassigned area tasks and reported issues).
- **Admin (panchayat_admin):** Returns all tasks created by this admin or in their villages.
- **Admin (higher levels):** Returns aggregated tasks across all jurisdictions below them.
- **Query:** `?status=pending|assigned|done` `?village_id=uuid` `?type=bin_clean|litter_pickup`
- **Response 200:** `{ tasks: [ { id, type, title, description, location_lat, location_lng, location_address, status, priority, assigned_worker_id, created_at, due_at } ] }`

#### `GET /api/tasks/:id`
Fetch single task with full detail.
- **Auth:** `verifyWorkerJWT` OR `verifyAdminJWT`
- **Response 200:** Full task object plus `assigned_worker` name, `proof_photo_url`, `source_issue`.

#### `POST /api/tasks`
Create a new task manually.
- **Auth:** `verifyAdminJWT` + `requireRole('panchayat_admin')`
- **Body:** `{ type, title, description, location_lat, location_lng, location_address, priority, village_id, assigned_worker_id?, bin_id?, due_at? }`
- **Logic:**
  1. Create task with `created_by_admin_id = req.admin.id`.
  2. If `assigned_worker_id` provided, set status to `'assigned'`.
  3. Log status change in `task_status_log`.
- **Response 201:** Created task object.

#### `PATCH /api/tasks/:id/assign`
Assign a task to a worker.
- **Auth:** `verifyAdminJWT` + `requireRole('panchayat_admin')`
- **Body:** `{ worker_id: uuid }`
- **Logic:** Update `assigned_worker_id`, set `status = 'assigned'`, log in `task_status_log`.
- **Response 200:** Updated task.

#### `PATCH /api/tasks/:id/start`
Worker marks task as started.
- **Auth:** `verifyWorkerJWT`
- **Logic:** Verify `assigned_worker_id = req.worker.id`. Set `status = 'in_progress'`, `started_at = NOW()`. Log in `task_status_log`.
- **Response 200:** Updated task.

#### `PATCH /api/tasks/:id/complete`
Worker marks task as done and uploads proof photo.
- **Auth:** `verifyWorkerJWT`
- **Body:** `multipart/form-data` with `photo` (image file)
- **Logic:**
  1. Verify `assigned_worker_id = req.worker.id`.
  2. Upload photo to Supabase Storage bucket `task-proofs` at path `tasks/{task_id}/{timestamp}.jpg`.
  3. Set `proof_photo_url` to the public URL.
  4. Set `status = 'done'`, `completed_at = NOW()`.
  5. Log in `task_status_log`.
  6. If task has `source_issue_id`, update that issue's `status = 'resolved'`.
- **Response 200:** Updated task with `proof_photo_url`.

#### `PATCH /api/tasks/:id/cancel`
Cancel a task.
- **Auth:** `verifyAdminJWT` + `requireRole('panchayat_admin')`
- **Body:** `{ reason?: string }`
- **Logic:** Set `status = 'cancelled'`. Log in `task_status_log`.
- **Response 200:** Updated task.

---

### Issue Routes — `/api/issues`

#### `POST /api/issues`
User reports a waste problem.
- **Auth:** `verifySupabaseAuth`
- **Body:** `multipart/form-data` with `description`, `location_lat`, `location_lng`, `location_address?`, `photo` (optional image file)
- **Logic:**
  1. If photo provided, upload to Supabase Storage bucket `issue-photos` at path `issues/{user_id}/{timestamp}.jpg`.
  2. Determine `village_id` from user's profile.
  3. Insert into `issue_reports` with `status = 'open'`.
- **Response 201:** Created issue object.

#### `GET /api/issues`
Fetch issues. Scoped by caller.
- **Auth:** `verifySupabaseAuth` (user sees own) OR `verifyAdminJWT` (admin sees their area)
- **User query:** Returns only `user_id = req.user.id`.
- **Admin query:** Returns all issues in their `village_id`s. Filter by `?status=open|assigned|resolved`.
- **Response 200:** `{ issues: [ ... ] }`

#### `PATCH /api/issues/:id/convert`
Admin converts an issue into a worker task.
- **Auth:** `verifyAdminJWT` + `requireRole('panchayat_admin')`
- **Body:** `{ assigned_worker_id?: uuid, priority?: 1|2|3, due_at?: string }`
- **Logic:**
  1. Create a new `tasks` row with `source_issue_id`, `reported_by_user_id`, location from the issue, `type = 'other'` (or admin can override).
  2. Update `issue_reports.status = 'assigned'` and `created_task_id = new task id`.
  3. Set `reviewed_by = req.admin.id`.
- **Response 201:** Created task object.

#### `PATCH /api/issues/:id/reject`
Admin rejects an issue report.
- **Auth:** `verifyAdminJWT` + `requireRole('panchayat_admin')`
- **Body:** `{ reason: string }`
- **Logic:** Set `status = 'rejected'`, `rejection_reason`, `reviewed_by`.
- **Response 200:** Updated issue.

---

### Marketplace Routes — `/api/marketplace`

#### `GET /api/marketplace`
Fetch all active listings.
- **Auth:** `verifySupabaseAuth`
- **Query:** `?village_id=uuid` `?page=1&limit=20`
- **Response 200:** `{ listings: [ { id, title, description, price, photo_url, contact_number, user: { name }, village: { name }, created_at } ] }`

#### `POST /api/marketplace`
Post a new listing.
- **Auth:** `verifySupabaseAuth`
- **Body:** `multipart/form-data` with `title`, `description`, `price`, `contact_number`, `photo` (image file)
- **Logic:**
  1. Upload photo to Supabase Storage bucket `marketplace-photos` at `listings/{user_id}/{timestamp}.jpg`.
  2. Insert listing with `user_id = req.user.id`, `village_id` from user's profile.
- **Response 201:** Created listing.

#### `DELETE /api/marketplace/:id`
Remove a listing.
- **Auth:** `verifySupabaseAuth`
- **Logic:** Verify `user_id = req.user.id`. Set `is_active = FALSE`.
- **Response 200:** `{ message: 'Listing removed' }`

---

### Announcement Routes — `/api/announcements`

#### `GET /api/announcements`
Fetch announcements for a village (used by User App's Waste Tips page).
- **Auth:** `verifySupabaseAuth`
- **Query:** `?village_id=uuid`
- **Logic:** Return announcements where `target_village_id = village_id` OR `target_village_id IS NULL` (broadcast), ordered by `is_pinned DESC, created_at DESC`.
- **Response 200:** `{ announcements: [ { id, title, content, is_pinned, created_at, admin: { name, role } } ] }`

#### `POST /api/announcements`
Admin posts an announcement.
- **Auth:** `verifyAdminJWT`
- **Body:** `{ title, content, target_village_id? }`
- **Logic:** Insert with `created_by = req.admin.id`. If `target_village_id` not provided, it broadcasts to all villages in the admin's jurisdiction.
- **Response 201:** Created announcement.

#### `DELETE /api/announcements/:id`
Remove an announcement.
- **Auth:** `verifyAdminJWT`
- **Logic:** Verify `created_by = req.admin.id` OR admin is a higher-level admin above the creator.
- **Response 200:** `{ message: 'Announcement removed' }`

---

### Admin Management Routes — `/api/admin`

#### `GET /api/admin/me`
Get logged-in admin's profile.
- **Auth:** `verifyAdminJWT`
- **Response 200:** `{ id, name, email, role, jurisdiction_name, parent_admin_id, created_at }`

#### `GET /api/admin/sub-admins`
List all admins directly created by this admin (one level below).
- **Auth:** `verifyAdminJWT`
- **Logic:** Query `admins WHERE created_by = req.admin.id`.
- **Response 200:** `{ admins: [ ... ] }`

#### `POST /api/admin/create`
Create an admin account for the level directly below.
- **Auth:** `verifyAdminJWT`
- **Body:** `{ name, email, password, jurisdiction_name, jurisdiction_geom? }`
- **Logic:**
  1. Determine `role` of new admin based on `req.admin.role`:
     - `zilla_parishad` → creates `block_samiti`
     - `block_samiti` → creates `gram_panchayat`
     - `gram_panchayat` → creates `panchayat_admin`
     - `panchayat_admin` → FORBIDDEN (use worker create endpoint instead)
  2. Hash password with bcrypt (rounds: 12).
  3. Insert into `admins` with `parent_admin_id = req.admin.id`, `created_by = req.admin.id`.
- **Response 201:** `{ id, name, email, role, jurisdiction_name }`

#### `PATCH /api/admin/:id/deactivate`
Deactivate a sub-admin account.
- **Auth:** `verifyAdminJWT`
- **Logic:** Verify the target admin's `parent_admin_id` chain includes `req.admin.id`. Set `is_active = FALSE`.
- **Response 200:** `{ message: 'Admin deactivated' }`

#### `GET /api/admin/dashboard`
Aggregated stats for the admin's jurisdiction.
- **Auth:** `verifyAdminJWT`
- **Logic:** Scoped by role — panchayat_admin gets village-level stats, higher roles get aggregated counts.
- **Response 200:**
```json
{
  "bins": { "total": 24, "overflow": 1, "full": 3, "ok": 20 },
  "tasks": { "pending": 4, "in_progress": 3, "done_today": 7 },
  "workers": { "total": 5, "active": 5 },
  "issues": { "open": 2, "resolved_this_week": 8 }
}
```

---

### Worker Management Routes — `/api/workers`

#### `POST /api/workers`
Create a new Safai Mitra worker account.
- **Auth:** `verifyAdminJWT` + `requireRole('panchayat_admin')`
- **Body:** `{ name, phone?, assigned_area, village_id }`
- **Logic:**
  1. Auto-generate `employee_id` in format `GWC-WRK-XXXX` (sequential, padded).
  2. Auto-generate a temporary password (e.g., 8-char alphanumeric).
  3. Hash password with bcrypt.
  4. Insert into `workers` with `created_by_admin_id = req.admin.id`.
  5. Return plain-text credentials once (they are not stored in plain text after this).
- **Response 201:** `{ id, name, employee_id, temp_password, assigned_area }`

#### `GET /api/workers`
List all workers created by this panchayat admin.
- **Auth:** `verifyAdminJWT` + `requireRole('panchayat_admin')`
- **Response 200:** `{ workers: [ { id, name, employee_id, assigned_area, is_active, last_login_at } ] }`

#### `GET /api/workers/:id`
Worker's own profile.
- **Auth:** `verifyWorkerJWT`
- **Logic:** Only if `req.worker.id === params.id`.
- **Response 200:** `{ id, name, employee_id, assigned_area, village_id, language, created_at }`

#### `PATCH /api/workers/:id/deactivate`
Deactivate a worker.
- **Auth:** `verifyAdminJWT` + `requireRole('panchayat_admin')`
- **Logic:** Verify worker's `created_by_admin_id = req.admin.id`. Set `is_active = FALSE`.
- **Response 200:** `{ message: 'Worker deactivated' }`

---

### AI Routes — `/api/ai`

#### `POST /api/ai/scan`
Identify waste from a photo and return disposal instructions.
- **Auth:** `verifySupabaseAuth`
- **Body:** `multipart/form-data` with `photo` (image file)
- **Logic:**
  1. Read image as base64.
  2. Call Claude API with vision:
     ```
     System: "You are a waste management expert for rural India. When shown an image of waste, identify the waste type and provide clear, numbered, step-by-step disposal instructions in simple language. Respond in the same language as the user's request."
     User: [image] + "Identify this waste and tell me how to dispose of it properly."
     ```
  3. Return structured response.
- **Response 200:**
```json
{
  "waste_type": "Plastic bottle",
  "category": "Dry Waste",
  "steps": [
    "Rinse the bottle with water.",
    "Remove the cap and label if possible.",
    "Flatten the bottle to save space.",
    "Place in the dry waste bin (blue bin).",
    "Do not mix with wet/food waste."
  ],
  "tip": "Plastic bottles can be recycled. Many scrap dealers in villages buy them."
}
```

#### `POST /api/ai/chat`
Waste management chatbot.
- **Auth:** `verifySupabaseAuth`
- **Body:** `{ message: string, history: [ { role: 'user'|'assistant', content: string } ], language: 'en'|'hi'|'mr' }`
- **Logic:**
  1. Build message array from `history` + new `message`.
  2. Call Claude API:
     ```
     System: "You are a helpful waste management assistant for rural villages in India. Answer questions about waste disposal, recycling, composting, and sanitation in simple, friendly language. Keep answers concise and practical. Always respond in {language}."
     ```
  3. Return the assistant's reply.
- **Response 200:** `{ reply: string }`
- **Note:** History is managed on the frontend (Redux store). Backend is stateless.

---

## Middleware Stack (server.js)

```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// Stricter limit on AI routes (they're expensive)
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
app.use('/api/ai/', aiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/ai', aiRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(process.env.PORT || 5000);
```

---

## Supabase Client Setup

```javascript
// config/db.js
import { createClient } from '@supabase/supabase-js';

// Standard client (respects RLS — used for user-scoped operations)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Admin client (bypasses RLS — used for admin/worker operations)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

**Rule:** Always use `supabaseAdmin` for worker and admin API calls (since RLS is designed for Supabase Auth users only). Use `supabase` with user's JWT for user app calls where RLS should apply.

---

## File Upload Pattern (Supabase Storage)

```javascript
// services/storageService.js
import { supabaseAdmin } from '../config/db.js';

export async function uploadFile(bucket, path, buffer, mimetype) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: mimetype,
      upsert: false
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrl;
}
```

**Usage in controller:**
```javascript
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Route: PATCH /api/tasks/:id/complete
router.patch('/:id/complete', verifyWorkerJWT, upload.single('photo'), taskController.complete);

// In controller:
const url = await uploadFile(
  'task-proofs',
  `tasks/${taskId}/${Date.now()}.jpg`,
  req.file.buffer,
  req.file.mimetype
);
```

---

## Error Response Format

All errors follow this shape:
```json
{ "error": "Human-readable message", "code": "MACHINE_CODE" }
```

Common codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.

---

## SLA & Escalation Logic (services/escalationService.js)

- A task is considered overdue if `status != 'done'` and `NOW() > due_at`.
- Overdue tasks are visible in the admin dashboard with a warning badge.
- The escalation flow is manual: a higher-level admin can view overdue tasks from lower jurisdictions.
- Future: a cron job can auto-flag tasks overdue by more than 24 hours and send push notifications.

---

## Dependencies (package.json)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "@anthropic-ai/sdk": "^0.x",
    "bcryptjs": "^2.x",
    "cors": "^2.x",
    "dotenv": "^16.x",
    "express": "^4.x",
    "express-rate-limit": "^7.x",
    "helmet": "^7.x",
    "jsonwebtoken": "^9.x",
    "multer": "^1.x"
  }
}
```

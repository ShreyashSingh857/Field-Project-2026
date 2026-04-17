# Field Project Setup Guide

This monorepo contains:
- `backend` (Express API)
- `apps/user-app` (Vite + React)
- `apps/admin-app` (Vite + React)
- `apps/worker-app` (Vite + React)

## 1. Prerequisites
- Node.js 18+ (Node 22 recommended)
- npm 9+
- Supabase project (URL, anon key, service role key)
- Gemini API key (for AI image moderation)
- OpenAI API key (if using AI routes that require it)

Optional:
- Python virtual env (`.venv`) if you run geo seeding scripts

## 2. Install Dependencies
From repo root:

```bash
npm install
```

This installs all workspace dependencies (`apps/*` and `backend`).

## 3. Environment Setup
Create backend env file:

```bash
copy backend\.env.example backend\.env
```

Update `backend/.env` with real values:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
ADMIN_API_KEY=your-secret-admin-key

USER_APP_URL=http://localhost:5173
ADMIN_APP_URL=http://localhost:5174
WORKER_APP_URL=http://localhost:5175
BACKEND_BASE_URL=http://localhost:5000
```

Frontend apps read these variables (fallbacks are already in code):
- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If needed, add `.env` inside each app:
- `apps/user-app/.env`
- `apps/admin-app/.env`
- `apps/worker-app/.env`

Example app env:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 4. Database Setup
Run your SQL/migration scripts in Supabase SQL editor as required by your feature set (marketplace/auth/moderation/schema).

Useful SQL files in `backend/`:
- `GEOGRAPHIC_MIGRATION.sql`
- `MIGRATE_MARKETPLACE_MODERATION.sql`
- `RESET_DB.sql`

## 5. Run Everything with One Command
From repo root:

```bash
npm run dev
```

or:

```bash
npm run dev:all
```

What this does:
- Frees occupied dev ports automatically (`5000`, `5173`, `5174`, `5175`, ...)
- Starts backend + user + admin + worker together using `concurrently`

## 6. Default Local URLs
- Backend: `http://localhost:5000`
- User App: `http://localhost:5173`
- Admin App: `http://localhost:5174`
- Worker App: `http://localhost:5175`

## 7. Useful Commands
From repo root:

```bash
npm run dev:backend
npm run dev:user
npm run dev:admin
npm run dev:worker
```

Backend only (inside `backend`):

```bash
npm run start
npm run seed:demo
```

## 8. Troubleshooting
- `EADDRINUSE`: run `npm run dev` again (pre-script clears ports automatically).
- `401/No token`: ensure user/admin/worker is logged in and backend is running.
- CORS issues: verify `USER_APP_URL`, `ADMIN_APP_URL`, `WORKER_APP_URL` in `backend/.env`.
- Supabase errors: verify URL/keys and table schema/migrations.

## 9. Production Notes
- Do not commit real secrets in `.env`.
- Set secure `JWT_SECRET` and rotate keys in production.
- Restrict CORS origins to deployed domains only.

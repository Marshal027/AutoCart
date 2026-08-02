# Deployment

This repository deploys as two services:

- `frontend/` -> Vercel
- `backend/` -> Render

## 1. Deploy Django to Render

1. Push the repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Render will detect the root `render.yaml` and create `autocart-backend`.
4. Add the environment variables marked `sync: false` in the Render service settings.
5. Set `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to the Vercel URL. For example:

   `https://autocart.vercel.app`

6. Add the AI, Prava, and database values that the application needs.
7. Deploy and copy the public URL, for example:

   `https://autocart-backend.onrender.com`

The Render build runs migrations and collects static files. `DATABASE_URL` is optional for local-style SQLite, but Render's local filesystem is ephemeral. Use a Render Postgres database for persistent users, watchlists, and application data, then set its connection string as `DATABASE_URL`.

## 2. Deploy React to Vercel

1. In Vercel, choose **Add New > Project** and import the same repository.
2. Set **Root Directory** to `frontend`.
3. Use these settings:
   - Framework preset: `Vite`
   - Install command: `bun install`
   - Build command: `bun run build`
   - Output directory: `dist`

4. Add this environment variable:

   `VITE_API_BASE_URL=https://autocart-backend.onrender.com/api`

5. Deploy the project.

`frontend/vercel.json` keeps React Router routes working on refresh. After the first Vercel deployment, copy its URL back into Render's `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`, then redeploy the backend.

## 3. Verify

Open these URLs after deployment:

- `https://autocart-backend.onrender.com/admin/`
- `https://autocart-backend.onrender.com/api/`
- `https://your-project.vercel.app/`

Test a frontend API action such as search, watchlist loading, or checkout. If the browser reports a CORS error, check that the Vercel origin is entered without a trailing slash in both Render origin variables.

## Local development

Frontend API calls default to `/api`, so Vite continues proxying to `http://localhost:8000` locally. Copy `frontend/.env.example` only when you need to override that behavior.

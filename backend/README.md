# Backend Deployment Checklist (Render + Supabase Migration)

This directory is the Node.js backend API.

## Files

- `server.js`
- `.env`
- `.env.render`
- `.env.supabase`
- `package.json`
- `render.yaml`
- `scripts/mysql-to-postgres-migrate.js`
- `migrations/mysql_to_postgres/README.md`

## 1. Deploy backend to Render (current MySQL mode)

1. In Render, create a new **Web Service** from this repo.
2. Use repo root `render.yaml` (Blueprint deploy) or set manually:
   - Root dir: `backend`
   - Build: `npm install`
   - Start: `npm start`
3. Configure env vars using `backend/.env.render` as template.
4. Replace placeholder values:
   - `FRONTEND_URL`
   - `CORS_ORIGIN`
   - DB credentials
   - secrets (`JWT_SECRET`, `SESSION_SECRET`, SMTP)
5. Deploy and verify health:
   - `GET /api/health`

## 2. Production safety checklist

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- CORS configured for Vercel domain
- secrets not committed in git
- rotate SMTP app password before go-live

## 3. Prepare Supabase migration (Postgres)

When ready to move from MySQL to Supabase:

1. Fill `backend/.env.supabase`.
2. Run dry-run migration scaffold:

```bash
npm run migrate:mysql-to-pg
```

3. Review generated files:
- `migrations/mysql_to_postgres/generated_schema.sql`
- `migrations/mysql_to_postgres/migration_summary.json`

4. Apply migration to Supabase Postgres:

```bash
npm run migrate:mysql-to-pg:apply
```

## 4. Switch backend to Postgres mode (after query migration)

- Set `DB_CLIENT=postgres`
- Set `DATABASE_URL` (Supabase pooler URL)
- Keep `DB_SSL=true`

Note: current app query layer is MySQL-oriented. Full Postgres cutover requires query/driver migration in code.

## 5. Smoke tests after deploy

- Login (user/author/admin)
- Admin dashboard loads all sections
- Author registration + approval
- Profile image upload
- Contact form (if SMTP enabled)

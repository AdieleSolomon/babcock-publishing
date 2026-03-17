# Backend Deployment Checklist (Railway + Postgres)

This directory is the Node.js backend API.

## Files

- `server.js`
- `.env`
- `.env.railway`
- `package.json`
- `scripts/mysql-to-postgres-migrate.js`
- `migrations/mysql_to_postgres/README.md`

## 1. Deploy backend to Railway

1. In Railway, create a new project and add a **Service** from this repo.
2. Set the service root directory to `backend`.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add a Railway **PostgreSQL** database and copy its `DATABASE_URL`.
6. Configure env vars using `backend/.env.railway` as a template.
7. Replace placeholder values:
   - `FRONTEND_URL`
   - `CORS_ORIGIN`
   - `DATABASE_URL`
   - secrets (`JWT_SECRET`, `SESSION_SECRET`, SMTP)
8. Deploy and verify health:
   - `GET /api/health`

## 2. Production safety checklist

- `NODE_ENV=production`
- `HOST=0.0.0.0`
- CORS configured for Vercel domain
- secrets not committed in git
- rotate SMTP app password before go-live

## 3. Prepare Postgres migration (Railway)

If you need to migrate from MySQL to Railway Postgres:

1. Fill `backend/.env.migration` (see `.env.migration.example`).
2. Run dry-run migration scaffold:

```bash
npm run migrate:mysql-to-pg
```

3. Review generated files:
- `migrations/mysql_to_postgres/generated_schema.sql`
- `migrations/mysql_to_postgres/migration_summary.json`

4. Apply migration to Railway Postgres:

```bash
npm run migrate:mysql-to-pg:apply
```

## 4. Switch backend to Postgres mode

- Set `DB_CLIENT=postgres`
- Set `DATABASE_URL` (Railway Postgres URL)
- Keep `DB_SSL=true`

Note: `server.js` uses a cross-DB query adapter for MySQL/Postgres with `DB_CLIENT`.

## 5. Smoke tests after deploy

- Login (user/author/admin)
- Admin dashboard loads all sections
- Author registration + approval
- Profile image upload
- Contact form (if SMTP enabled)

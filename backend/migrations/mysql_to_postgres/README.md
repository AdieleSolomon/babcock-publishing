# MySQL -> Supabase Postgres Migration Scaffold

This folder stores generated migration artifacts from `scripts/mysql-to-postgres-migrate.js`.

## Commands

- Dry run (schema + summary only):
  - `npm run migrate:mysql-to-pg`
- Apply migration to Postgres (uses `DATABASE_URL`):
  - `npm run migrate:mysql-to-pg:apply`

## Required env

- MySQL source:
  - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Postgres target (Supabase):
  - `DATABASE_URL`
  - `DB_SSL=true` (recommended for Supabase)

## Notes

- This is a scaffold for initial migration and is intentionally conservative.
- Type mapping uses generic conversions (e.g. MySQL `enum` -> Postgres `TEXT`).
- Review generated schema before apply:
  - `migrations/mysql_to_postgres/generated_schema.sql`
- After migration, update backend query layer from MySQL syntax to Postgres syntax.

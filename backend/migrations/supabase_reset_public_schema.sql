begin;

-- Drop only app objects in the public schema.
drop schema if exists public cascade;
create schema public;

-- Restore standard Supabase grants.
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on schema public to postgres, service_role;

grant all privileges on all tables in schema public to postgres, service_role;
grant all privileges on all sequences in schema public to postgres, service_role;
grant all privileges on all routines in schema public to postgres, service_role;

alter default privileges for role postgres in schema public
  grant all on tables to postgres, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to postgres, service_role;
alter default privileges for role postgres in schema public
  grant all on routines to postgres, service_role;

commit;

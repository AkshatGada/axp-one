-- Isolated PostgreSQL acceptance only. This is NOT a Supabase migration.
-- Mimics signed JWT identity claims to exercise actual RLS/ACL/trigger behavior.
-- It does not prove Supabase Auth, email delivery or hosted session acceptance.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
 id uuid primary key, aud text, role text, email text,
 email_confirmed_at timestamptz, created_at timestamptz, updated_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
 select (nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'sub')::uuid;
$$;
create function auth.role() returns text language sql stable as $$
 select nullif(current_setting('request.jwt.claims', true),'')::jsonb ->> 'role';
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid(), auth.role() to anon, authenticated;

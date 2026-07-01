-- Enable Row Level Security on the read-only reference tables.
--
-- papers, questions, conversion_tables and conversion_rows are treated as
-- read-only reference data from the app's perspective: the Next.js clients
-- (browser + SSR) only ever SELECT from them using the anon key, and all
-- writes happen out-of-band via the service role (imports / migrations).
--
-- Policy model:
--   * public SELECT  -> anon + authenticated (covers every app read path)
--   * INSERT/UPDATE/DELETE -> service_role only
--
-- Notes:
--   * The service_role key bypasses RLS entirely, so writes performed by
--     server-side maintenance scripts keep working. The explicit
--     service_role write policies below are documentation of intent and a
--     safety net if BYPASSRLS behaviour ever changes.
--   * With RLS enabled and no permissive write policy for anon/authenticated,
--     any INSERT/UPDATE/DELETE from those roles is denied by default.

do $$
declare
  t text;
begin
  foreach t in array array['papers', 'questions', 'conversion_tables', 'conversion_rows']
  loop
    execute format('alter table public.%I enable row level security;', t);

    -- Public read access (anon + authenticated).
    execute format('drop policy if exists %I on public.%I;', t || '_select_public', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true);',
      t || '_select_public', t
    );

    -- Writes restricted to the service role.
    execute format('drop policy if exists %I on public.%I;', t || '_service_role_write', t);
    execute format(
      'create policy %I on public.%I for all to service_role using (true) with check (true);',
      t || '_service_role_write', t
    );
  end loop;
end $$;

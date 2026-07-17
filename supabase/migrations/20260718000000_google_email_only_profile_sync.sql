-- Do not copy Google name / picture into profiles on signup.
-- Users choose their own username; avatars are generated from that.

CREATE OR REPLACE FUNCTION public.sync_profile_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  insert into public.profiles (id, email, full_name, role, avatar_url)
  values (new.id, new.email, null, 'user', null)
  on conflict (id) do update set
    email = excluded.email,
    avatar_url = null,
    updated_at = now();
  return new;
end;
$$;

COMMENT ON FUNCTION public.sync_profile_from_auth() IS
  'Creates/updates profiles from auth.users using email only (no OAuth name or picture).';

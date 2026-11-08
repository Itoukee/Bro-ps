-- Called on a schedule so that the free tier does not pause the project after a
-- week without activity. Reads no table and returns no data, which is why it is
-- the one thing the anonymous key may call.
create function public.keepalive()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.keepalive() from public, anon, authenticated, service_role;
grant execute on function public.keepalive() to anon;

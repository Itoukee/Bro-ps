-- identity context: one profile per authenticated rider.
-- Email stays in auth.users and is deliberately not copied here.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 40),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Supabase grants everything to the API roles by default: start from nothing.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

create policy "riders read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "riders create their own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy "riders update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

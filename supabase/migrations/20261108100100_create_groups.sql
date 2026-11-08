-- groups context: a rider can belong to several groups and has one default group.
--
-- Clients get read access only. Creating, joining and leaving groups go through
-- server-side functions added with the group management feature, because
-- membership is the access boundary for every location row.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  rider_id uuid not null references public.profiles (id) on delete cascade,
  is_default boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, rider_id)
);

create index group_members_rider_id_idx on public.group_members (rider_id);

-- At most one default group per rider.
create unique index group_members_one_default_per_rider
  on public.group_members (rider_id)
  where is_default;

-- Not exposed through the API: PostgREST only serves the public schema.
create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- At least one default group for a rider who has any group. Deferred so that
-- switching default takes two updates in one transaction. Security definer so
-- the check sees every membership of the rider, whoever commits the change.
create function private.enforce_one_default_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.group_members m
    where m.rider_id in (old.rider_id, new.rider_id)
    group by m.rider_id
    having count(*) filter (where m.is_default) <> 1
  ) then
    raise exception 'a rider must have exactly one default group'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

revoke all on function private.enforce_one_default_group() from public;

create constraint trigger group_members_exactly_one_default
  after insert or update or delete on public.group_members
  deferrable initially deferred
  for each row execute function private.enforce_one_default_group();

-- Security definer so that policies on group_members can use it without
-- recursing into themselves. It takes no rider argument on purpose: it only
-- ever answers for the caller, so it cannot be used to probe other riders.
create function private.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members m
    where m.group_id = p_group_id
      and m.rider_id = (select auth.uid())
  );
$$;

revoke all on function private.is_group_member(uuid) from public;
grant execute on function private.is_group_member(uuid) to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

revoke all on public.groups from anon, authenticated;
revoke all on public.group_members from anon, authenticated;
grant select on public.groups to authenticated;
grant select on public.group_members to authenticated;
grant select, insert, update, delete on public.groups to service_role;
grant select, insert, update, delete on public.group_members to service_role;

create policy "members read their groups"
  on public.groups for select to authenticated
  using (private.is_group_member(id));

create policy "members read the members of their groups"
  on public.group_members for select to authenticated
  using (private.is_group_member(group_id));

-- group_members is itself restricted by the policy above, so this only matches
-- riders who share a group with the caller.
create policy "riders read the profiles of their group mates"
  on public.profiles for select to authenticated
  using (exists (
    select 1 from public.group_members m where m.rider_id = profiles.id
  ));

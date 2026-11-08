-- riding context: rides and their saved track points.
--
-- Live positions go through Realtime Broadcast and are never stored here.
-- Neither table records a speed: there must be no log of who went over the limit.

create table public.rides (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  rider_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- "At most one friend notification per rider, per ride". Set only by the
  -- server, never visible to clients, cleared when the ride ends.
  friend_speed_alert_sent boolean not null default false,
  -- A ride always belongs to a current member of its group. Losing membership
  -- or the account removes the rides and, in cascade, their points.
  foreign key (group_id, rider_id)
    references public.group_members (group_id, rider_id) on delete cascade,
  constraint rides_end_after_start check (ended_at is null or ended_at >= started_at),
  constraint rides_marker_only_while_active check (ended_at is null or not friend_speed_alert_sent)
);

create index rides_group_id_rider_id_idx on public.rides (group_id, rider_id);

create function private.clear_friend_speed_alert_marker()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.friend_speed_alert_sent := false;
  return new;
end;
$$;

revoke all on function private.clear_friend_speed_alert_marker() from public;

create trigger rides_clear_marker_on_end
  before update on public.rides
  for each row
  when (new.ended_at is not null and new.friend_speed_alert_sent)
  execute function private.clear_friend_speed_alert_marker();

create table public.ride_points (
  ride_id uuid not null references public.rides (id) on delete cascade,
  -- Device time, used to order the track. Points can arrive late from the
  -- offline buffer.
  recorded_at timestamptz not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  -- Server time, used for retention so that a client cannot exempt a point
  -- from deletion by sending a far future date.
  created_at timestamptz not null default now(),
  primary key (ride_id, recorded_at)
);

create index ride_points_created_at_idx on public.ride_points (created_at);

alter table public.rides enable row level security;
alter table public.ride_points enable row level security;

revoke all on public.rides from anon, authenticated;
revoke all on public.ride_points from anon, authenticated;

-- Column grants keep friend_speed_alert_sent away from clients entirely, so
-- clients must name their columns: select=* on rides is refused.
grant select (id, group_id, rider_id, started_at, ended_at) on public.rides to authenticated;
grant insert (group_id, rider_id) on public.rides to authenticated;
grant update (ended_at) on public.rides to authenticated;
grant select on public.ride_points to authenticated;
grant insert (ride_id, recorded_at, latitude, longitude) on public.ride_points to authenticated;
grant select, insert, update, delete on public.rides to service_role;
grant select, insert, update, delete on public.ride_points to service_role;

create policy "members read the rides of their groups"
  on public.rides for select to authenticated
  using (private.is_group_member(group_id));

create policy "riders start their own rides in their groups"
  on public.rides for insert to authenticated
  with check (rider_id = (select auth.uid()) and private.is_group_member(group_id));

-- An update can only end a ride that is still in progress, so a finished ride
-- cannot be reopened to resume sharing.
create policy "riders end their own rides"
  on public.rides for update to authenticated
  using (rider_id = (select auth.uid()) and ended_at is null)
  with check (rider_id = (select auth.uid()) and ended_at is not null);

-- Friends see a track only while the ride is in progress. Afterwards it belongs
-- to the rider alone, since a finished track usually starts or ends at home.
create policy "members read the points of rides in progress"
  on public.ride_points for select to authenticated
  using (exists (
    select 1
    from public.rides r
    where r.id = ride_points.ride_id
      and private.is_group_member(r.group_id)
      and (r.ended_at is null or r.rider_id = (select auth.uid()))
  ));

-- Location is accepted only for the rider's own ride and only for the time of
-- that ride, even when it arrives late from the offline buffer. The minute of
-- tolerance covers the phone and server clocks disagreeing slightly.
create policy "riders add points to their own rides"
  on public.ride_points for insert to authenticated
  with check (exists (
    select 1
    from public.rides r
    where r.id = ride_points.ride_id
      and r.rider_id = (select auth.uid())
      and ride_points.recorded_at >= r.started_at - interval '1 minute'
      and (r.ended_at is null or ride_points.recorded_at <= r.ended_at + interval '1 minute')
  ));

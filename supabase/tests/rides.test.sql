begin;
select plan(53);

-- Ana and Ben ride together in group 1. Cara is only in group 2.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'cara@example.test');
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'Ana'),
  ('00000000-0000-0000-0000-00000000000b', 'Ben'),
  ('00000000-0000-0000-0000-00000000000c', 'Cara');
insert into public.groups (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Sunday riders'),
  ('10000000-0000-0000-0000-000000000002', 'Other crew');
insert into public.group_members (group_id, rider_id, is_default) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', true),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', true);

-- r1: Ana active, alert already sent. r2: Ana ended. r3: Cara active.
-- r4: Ben active. r5: Ana active.
insert into public.rides (id, group_id, rider_id, started_at, ended_at, friend_speed_alert_sent) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000000a', '2026-01-01 10:00+00', null, true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000000a', '2026-01-01 08:00+00', '2026-01-01 09:00+00', false),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-00000000000c', '2026-01-01 10:00+00', null, false),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000000b', '2026-01-01 10:00+00', null, false),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000000a', '2026-01-01 12:00+00', null, false);

insert into public.ride_points (ride_id, recorded_at, latitude, longitude) values
  ('20000000-0000-0000-0000-000000000001', '2026-01-01 10:05+00', 48.85, 2.35),
  ('20000000-0000-0000-0000-000000000002', '2026-01-01 08:05+00', 45.76, 4.83),
  ('20000000-0000-0000-0000-000000000003', '2026-01-01 10:05+00', 43.30, 5.37);

select has_table('public', 'rides', 'rides table exists');
select has_table('public', 'ride_points', 'ride_points table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.rides'::regclass),
  true, 'row level security is enabled on rides');
select is(
  (select relrowsecurity from pg_class where oid = 'public.ride_points'::regclass),
  true, 'row level security is enabled on ride_points');

-- No log of who went over the limit
select is_empty(
  $$select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'ride_points' and column_name::text ilike '%speed%'$$,
  'ride_points stores no speed');
select is_empty(
  $$select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'rides' and column_name::text ilike '%speed%'
      and column_name::text <> 'friend_speed_alert_sent'$$,
  'the alert marker is the only speed related column on rides');

-- Retention deletes by server time, which a client cannot set
select isnt_empty(
  $$select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'ride_points'
      and indexdef like '%(created_at)'$$,
  'ride_points is indexed for deletion by age');

-- The alert marker is out of reach of clients at the privilege level, not only
-- through the row policies
select is(has_column_privilege('authenticated', 'public.rides', 'friend_speed_alert_sent', 'select'), false,
  'authenticated clients have no select privilege on the alert marker');
select is(has_column_privilege('authenticated', 'public.rides', 'friend_speed_alert_sent', 'insert'), false,
  'authenticated clients have no insert privilege on the alert marker');
select is(has_column_privilege('authenticated', 'public.rides', 'friend_speed_alert_sent', 'update'), false,
  'authenticated clients have no update privilege on the alert marker');

-- Acting as Ben, member of group 1
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select results_eq(
  $$select id from public.rides order by id$$,
  array['20000000-0000-0000-0000-000000000001'::uuid,
        '20000000-0000-0000-0000-000000000002'::uuid,
        '20000000-0000-0000-0000-000000000004'::uuid,
        '20000000-0000-0000-0000-000000000005'::uuid],
  'a member reads the rides of their groups and no others');
select results_eq(
  $$select latitude from public.ride_points
    where ride_id = '20000000-0000-0000-0000-000000000001'$$,
  array[48.85::double precision],
  'a member reads the points of a ride in progress in their group');
select is_empty(
  $$select latitude from public.ride_points
    where ride_id = '20000000-0000-0000-0000-000000000002'$$,
  'a member cannot read the points of a friend''s finished ride');
select throws_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude)
    values ('20000000-0000-0000-0000-000000000001', '2026-01-01 10:06+00', 1, 1)$$,
  '42501', null, 'a member cannot add points to a friend''s ride');
select is_empty(
  $$update public.rides set ended_at = now()
    where id = '20000000-0000-0000-0000-000000000001' returning id$$,
  'a member cannot end a friend''s ride');

-- The marker is invisible and read-only for every client
select throws_ok(
  $$select friend_speed_alert_sent from public.rides$$,
  '42501', null, 'a client cannot read the alert marker');
select throws_ok(
  $$select * from public.rides$$,
  '42501', null, 'a client cannot read the marker through a wildcard');
select throws_ok(
  $$update public.rides set friend_speed_alert_sent = true
    where id = '20000000-0000-0000-0000-000000000004'$$,
  '42501', null, 'a rider cannot set the alert marker on their own ride');
select throws_ok(
  $$insert into public.rides (group_id, rider_id, friend_speed_alert_sent) values
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', true)$$,
  '42501', null, 'a rider cannot create a ride with the alert marker set');

-- Acting as Ana, owner of r1, r2 and r5
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select results_eq(
  $$select latitude from public.ride_points
    where ride_id = '20000000-0000-0000-0000-000000000002'$$,
  array[45.76::double precision],
  'a rider reads the points of their own finished ride');
select lives_ok(
  $$insert into public.rides (group_id, rider_id) values
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a')$$,
  'a rider can start a ride in their group');
select throws_ok(
  $$insert into public.rides (group_id, rider_id) values
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b')$$,
  '42501', null, 'a rider cannot start a ride for someone else');
select throws_ok(
  $$insert into public.rides (group_id, rider_id) values
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'a rider cannot start a ride in a group they do not belong to');
select throws_ok(
  $$insert into public.rides (group_id, rider_id, started_at) values
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '2020-01-01')$$,
  '42501', null, 'a client cannot choose the start time of a ride');

select lives_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude)
    values ('20000000-0000-0000-0000-000000000001', '2026-01-01 10:06+00', 48.86, 2.36)$$,
  'a rider can add a point to their ride in progress');
select lives_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude)
    values ('20000000-0000-0000-0000-000000000002', '2026-01-01 08:30+00', 45.77, 4.84)$$,
  'a buffered point recorded during a finished ride can still be flushed');
select lives_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude)
    values ('20000000-0000-0000-0000-000000000002', '2026-01-01 07:59:30+00', 45.78, 4.85)$$,
  'a point within the clock tolerance of the ride is accepted');
select throws_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude)
    values ('20000000-0000-0000-0000-000000000002', '2026-01-01 09:30+00', 45.79, 4.86)$$,
  '42501', null, 'a point recorded after the ride ended is rejected');
select throws_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude)
    values ('20000000-0000-0000-0000-000000000002', '2026-01-01 07:00+00', 45.80, 4.87)$$,
  '42501', null, 'a point recorded before the ride started is rejected');
select throws_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude)
    values ('20000000-0000-0000-0000-000000000003', '2026-01-01 10:06+00', 1, 1)$$,
  '42501', null, 'a rider cannot add points to a ride in another group');
select throws_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude, created_at)
    values ('20000000-0000-0000-0000-000000000001', '2026-01-01 10:07+00', 1, 1, '2099-01-01')$$,
  '42501', null, 'a client cannot set the retention timestamp');
select throws_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude)
    values ('20000000-0000-0000-0000-000000000001', '2026-01-01 10:08+00', 91, 1)$$,
  '23514', null, 'an out of range latitude is rejected');
select throws_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude)
    values ('20000000-0000-0000-0000-000000000001', '2026-01-01 10:08+00', 1, 181)$$,
  '23514', null, 'an out of range longitude is rejected');
select throws_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude)
    values ('20000000-0000-0000-0000-000000000001', '2026-01-01 10:06+00', 1, 1)$$,
  '23505', null, 'the same point cannot be stored twice when a buffer is flushed again');
select throws_ok(
  $$update public.ride_points set latitude = 0$$,
  '42501', null, 'a rider cannot rewrite points');
select throws_ok(
  $$delete from public.ride_points$$,
  '42501', null, 'a rider cannot delete points directly');
select throws_ok(
  $$delete from public.rides$$,
  '42501', null, 'a rider cannot delete rides directly');

select isnt_empty(
  $$update public.rides set ended_at = now()
    where id = '20000000-0000-0000-0000-000000000001' returning id$$,
  'a rider can end their own ride');
select is_empty(
  $$update public.rides set ended_at = null
    where id = '20000000-0000-0000-0000-000000000002' returning id$$,
  'a finished ride cannot be reopened');
select throws_ok(
  $$update public.rides set ended_at = null
    where id = '20000000-0000-0000-0000-000000000005'$$,
  '42501', null, 'updating a ride can only end it');
select throws_ok(
  $$update public.rides set ended_at = '2020-01-01'
    where id = '20000000-0000-0000-0000-000000000005'$$,
  '23514', null, 'a ride cannot end before it started');

-- The marker is cleared when the ride ends, and is claimable once
reset role;
select is(
  (select friend_speed_alert_sent from public.rides where id = '20000000-0000-0000-0000-000000000001'),
  false, 'ending a ride clears the alert marker');
select throws_ok(
  $$insert into public.rides (group_id, rider_id, ended_at, friend_speed_alert_sent) values
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', now(), true)$$,
  '23514', null, 'an ended ride cannot carry the alert marker');

set local role service_role;
select isnt_empty(
  $$update public.rides set friend_speed_alert_sent = true
    where id = '20000000-0000-0000-0000-000000000004'
      and ended_at is null and not friend_speed_alert_sent returning id$$,
  'the server can claim the single friend notification for a ride');
select is_empty(
  $$update public.rides set friend_speed_alert_sent = true
    where id = '20000000-0000-0000-0000-000000000004'
      and ended_at is null and not friend_speed_alert_sent returning id$$,
  'the friend notification cannot be claimed twice for one ride');
reset role;

-- A ride always belongs to a member of its group
select throws_ok(
  $$insert into public.rides (group_id, rider_id) values
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b')$$,
  '23503', null, 'a ride cannot reference a rider outside the group');

-- Anonymous
set local request.jwt.claims to '';
set local role anon;
select throws_ok($$select id from public.rides$$, '42501', null, 'an anonymous caller cannot read rides');
select throws_ok($$select latitude from public.ride_points$$, '42501', null, 'an anonymous caller cannot read points');
select throws_ok(
  $$insert into public.ride_points (ride_id, recorded_at, latitude, longitude)
    values ('20000000-0000-0000-0000-000000000001', now(), 1, 1)$$,
  '42501', null, 'an anonymous caller cannot add points');
reset role;

-- Cascades: losing membership or the account removes the location data
delete from public.group_members
  where rider_id = '00000000-0000-0000-0000-00000000000b';
select is_empty(
  $$select 1 from public.rides where rider_id = '00000000-0000-0000-0000-00000000000b'$$,
  'leaving a group removes the rider''s rides in it');

delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select is_empty(
  $$select 1 from public.rides where rider_id = '00000000-0000-0000-0000-00000000000a'$$,
  'deleting an account removes the rider''s rides');
select is_empty(
  $$select 1 from public.ride_points
    where ride_id in ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002')$$,
  'deleting an account removes the rider''s points');
select results_eq(
  $$select count(*)::int from public.ride_points$$,
  array[1],
  'deleting an account leaves the points of other riders alone');

select * from finish();
rollback;

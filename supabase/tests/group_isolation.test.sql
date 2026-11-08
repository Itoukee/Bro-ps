-- Done criterion of issue #3: a user outside a group cannot read its members,
-- rides or points.
begin;
select plan(21);

-- Group 1: Ana and Ben. Group 2: Cara. Eve is in both. Dan has no group.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'cara@example.test'),
  ('00000000-0000-0000-0000-00000000000d', 'dan@example.test'),
  ('00000000-0000-0000-0000-00000000000e', 'eve@example.test');
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'Ana'),
  ('00000000-0000-0000-0000-00000000000b', 'Ben'),
  ('00000000-0000-0000-0000-00000000000c', 'Cara'),
  ('00000000-0000-0000-0000-00000000000d', 'Dan'),
  ('00000000-0000-0000-0000-00000000000e', 'Eve');
insert into public.groups (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Sunday riders'),
  ('10000000-0000-0000-0000-000000000002', 'Other crew');
insert into public.group_members (group_id, rider_id, is_default) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', true),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', true),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000e', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e', false);
insert into public.rides (id, group_id, rider_id, started_at) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-00000000000a', '2026-01-01 10:00+00'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-00000000000c', '2026-01-01 10:00+00');
insert into public.ride_points (ride_id, recorded_at, latitude, longitude) values
  ('20000000-0000-0000-0000-000000000001', '2026-01-01 10:05+00', 48.85, 2.35),
  ('20000000-0000-0000-0000-000000000002', '2026-01-01 10:05+00', 43.30, 5.37);

-- The data exists: the denied reads below are not empty for lack of rows
select results_eq(
  $$select count(*)::int from public.group_members where group_id = '10000000-0000-0000-0000-000000000001'$$,
  array[3], 'group 1 has members');
select results_eq(
  $$select count(*)::int from public.rides where group_id = '10000000-0000-0000-0000-000000000001'$$,
  array[1], 'group 1 has a ride');
select results_eq(
  $$select count(*)::int from public.ride_points where ride_id = '20000000-0000-0000-0000-000000000001'$$,
  array[1], 'the ride of group 1 has points');

set local role authenticated;

-- Control: a member of group 1 sees all of it
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select results_eq(
  $$select count(*)::int from public.group_members where group_id = '10000000-0000-0000-0000-000000000001'$$,
  array[3], 'a member reads the members of the group');
select results_eq(
  $$select count(*)::int from public.rides where group_id = '10000000-0000-0000-0000-000000000001'$$,
  array[1], 'a member reads the rides of the group');
select results_eq(
  $$select count(*)::int from public.ride_points where ride_id = '20000000-0000-0000-0000-000000000001'$$,
  array[1], 'a member reads the points of the group');

-- Cara belongs to another group
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is_empty(
  $$select rider_id from public.group_members where group_id = '10000000-0000-0000-0000-000000000001'$$,
  'a rider from another group cannot read the members');
select is_empty(
  $$select id from public.rides where group_id = '10000000-0000-0000-0000-000000000001'$$,
  'a rider from another group cannot read the rides');
select is_empty(
  $$select latitude from public.ride_points where ride_id = '20000000-0000-0000-0000-000000000001'$$,
  'a rider from another group cannot read the points');

-- Dan belongs to no group
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is_empty($$select rider_id from public.group_members$$, 'a rider with no group cannot read any member');
select is_empty($$select id from public.rides$$, 'a rider with no group cannot read any ride');
select is_empty($$select latitude from public.ride_points$$, 'a rider with no group cannot read any point');

-- Eve belongs to both, and sees both
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
select results_eq(
  $$select count(*)::int from public.rides$$,
  array[2], 'a rider in several groups reads the rides of each');

-- A rider with no token at all
reset role;
set local request.jwt.claims to '';
set local role anon;
select throws_ok($$select rider_id from public.group_members$$, '42501', null, 'an anonymous caller cannot read members');
select throws_ok($$select id from public.rides$$, '42501', null, 'an anonymous caller cannot read rides');
select throws_ok($$select latitude from public.ride_points$$, '42501', null, 'an anonymous caller cannot read points');

-- An authenticated role with no subject claim resolves to no rider
reset role;
set local role authenticated;
select is_empty($$select id from public.rides$$, 'a token without a subject reads no ride');

-- Access ends with membership
reset role;
delete from public.group_members
  where group_id = '10000000-0000-0000-0000-000000000001'
    and rider_id = '00000000-0000-0000-0000-00000000000b';
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is_empty(
  $$select rider_id from public.group_members where group_id = '10000000-0000-0000-0000-000000000001'$$,
  'a former member can no longer read the members');
select is_empty(
  $$select id from public.rides where group_id = '10000000-0000-0000-0000-000000000001'$$,
  'a former member can no longer read the rides');
select is_empty(
  $$select latitude from public.ride_points where ride_id = '20000000-0000-0000-0000-000000000001'$$,
  'a former member can no longer read the points');
select is_empty(
  $$select id from public.groups where id = '10000000-0000-0000-0000-000000000001'$$,
  'a former member can no longer read the group');

select * from finish();
rollback;

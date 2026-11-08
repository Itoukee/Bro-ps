begin;
select plan(15);

-- Ana and Ben share a group: settings stay private even between friends.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test');
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'Ana'),
  ('00000000-0000-0000-0000-00000000000b', 'Ben');
insert into public.groups (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Sunday riders');
insert into public.group_members (group_id, rider_id, is_default) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', true),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', true);

select has_table('public', 'notification_settings', 'notification_settings table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.notification_settings'::regclass),
  true, 'row level security is enabled on notification_settings');

-- Settings exist as soon as the profile does, with the product defaults
select is(
  (select friend_ride_alerts_enabled from public.notification_settings
   where rider_id = '00000000-0000-0000-0000-00000000000a'),
  true, 'friend ride start and end alerts are on by default');
select is(
  (select friend_speed_alerts_enabled from public.notification_settings
   where rider_id = '00000000-0000-0000-0000-00000000000a'),
  false, 'friend speed alerts are off by default');
select is(
  (select own_voice_alert_enabled from public.notification_settings
   where rider_id = '00000000-0000-0000-0000-00000000000a'),
  true, 'the rider''s own voice alert is on by default');

-- Acting as Ana
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select results_eq(
  $$select rider_id from public.notification_settings$$,
  array['00000000-0000-0000-0000-00000000000a'::uuid],
  'a rider reads only their own settings, not those of group mates');
select isnt_empty(
  $$update public.notification_settings
    set friend_speed_alerts_enabled = true, friend_ride_alerts_enabled = false, own_voice_alert_enabled = false
    where rider_id = '00000000-0000-0000-0000-00000000000a' returning rider_id$$,
  'a rider can change their own settings');
select is_empty(
  $$update public.notification_settings set friend_speed_alerts_enabled = true
    where rider_id = '00000000-0000-0000-0000-00000000000b' returning rider_id$$,
  'a rider cannot opt another rider in to speed alerts');
select throws_ok(
  $$update public.notification_settings set rider_id = '00000000-0000-0000-0000-00000000000b'$$,
  '42501', null, 'settings cannot be moved to another rider');
select throws_ok(
  $$insert into public.notification_settings (rider_id)
    values ('00000000-0000-0000-0000-00000000000b')$$,
  '42501', null, 'a client cannot create settings rows');
select throws_ok(
  $$delete from public.notification_settings$$,
  '42501', null, 'a client cannot delete settings rows');

-- Anonymous
reset role;
set local request.jwt.claims to '';
set local role anon;
select throws_ok($$select rider_id from public.notification_settings$$, '42501', null,
  'an anonymous caller cannot read settings');
select throws_ok($$update public.notification_settings set own_voice_alert_enabled = false$$, '42501', null,
  'an anonymous caller cannot change settings');
reset role;

-- Deleting an account removes the rider's settings
select lives_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-00000000000b'$$,
  'an account with settings can be deleted');
select is_empty(
  $$select 1 from public.notification_settings where rider_id = '00000000-0000-0000-0000-00000000000b'$$,
  'deleting an account removes the rider''s settings');

select * from finish();
rollback;

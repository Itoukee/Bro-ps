begin;
select plan(36);

-- Ana and Ben ride together in group 1. Cara is only in group 2. Dan has no group.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'cara@example.test'),
  ('00000000-0000-0000-0000-00000000000d', 'dan@example.test');
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'Ana'),
  ('00000000-0000-0000-0000-00000000000b', 'Ben'),
  ('00000000-0000-0000-0000-00000000000c', 'Cara'),
  ('00000000-0000-0000-0000-00000000000d', 'Dan');
insert into public.groups (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Sunday riders'),
  ('10000000-0000-0000-0000-000000000002', 'Other crew');
insert into public.group_members (group_id, rider_id, is_default) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', true),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', true);

select has_table('public', 'groups', 'groups table exists');
select has_table('public', 'group_members', 'group_members table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.groups'::regclass),
  true, 'row level security is enabled on groups');
select is(
  (select relrowsecurity from pg_class where oid = 'public.group_members'::regclass),
  true, 'row level security is enabled on group_members');

-- Membership helper: privileged, pinned, and not exposed through the API
select hasnt_function('public', 'is_group_member', 'the membership helper is not in the exposed schema');
select is(
  (select prosecdef from pg_proc where oid = 'private.is_group_member(uuid)'::regprocedure),
  true, 'the membership helper is security definer');
select is(
  (select proconfig from pg_proc where oid = 'private.is_group_member(uuid)'::regprocedure),
  array['search_path=""'], 'the membership helper has an empty fixed search_path');
select is(has_function_privilege('anon', 'private.is_group_member(uuid)', 'execute'), false,
  'anonymous callers cannot execute the membership helper');
select is(has_function_privilege('authenticated', 'private.is_group_member(uuid)', 'execute'), true,
  'authenticated riders can execute the membership helper');
select is(has_schema_privilege('anon', 'private', 'usage'), false,
  'anonymous callers have no usage on the private schema');

-- Acting as Ana, member of group 1
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is(private.is_group_member('10000000-0000-0000-0000-000000000001'), true,
  'the helper is true for a group the caller belongs to');
select is(private.is_group_member('10000000-0000-0000-0000-000000000002'), false,
  'the helper is false for a group the caller does not belong to');

select results_eq(
  $$select name from public.groups$$,
  array['Sunday riders'],
  'a rider reads only the groups they belong to');
select results_eq(
  $$select rider_id from public.group_members order by rider_id$$,
  array['00000000-0000-0000-0000-00000000000a'::uuid, '00000000-0000-0000-0000-00000000000b'::uuid],
  'a rider reads the members of their groups and no others');
select results_eq(
  $$select display_name from public.profiles order by display_name$$,
  array['Ana', 'Ben'],
  'a rider reads the profiles of their group mates and no others');

-- Membership is the access boundary: clients cannot write it directly
select throws_ok(
  $$insert into public.group_members (group_id, rider_id)
    values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'a rider cannot add themselves to another group');
select throws_ok(
  $$update public.group_members set is_default = false
    where rider_id = '00000000-0000-0000-0000-00000000000a'$$,
  '42501', null, 'a rider cannot update memberships directly');
select throws_ok(
  $$delete from public.group_members
    where rider_id = '00000000-0000-0000-0000-00000000000b'$$,
  '42501', null, 'a rider cannot remove memberships directly');
select throws_ok(
  $$insert into public.groups (name) values ('Sneaky')$$,
  '42501', null, 'a rider cannot create groups directly');
select throws_ok(
  $$update public.groups set name = 'Renamed'$$,
  '42501', null, 'a rider cannot rename groups directly');
select throws_ok(
  $$delete from public.groups$$,
  '42501', null, 'a rider cannot delete groups directly');

-- Dan is in no group at all
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
select is_empty($$select id from public.groups$$, 'a rider with no group reads no groups');
select is_empty($$select rider_id from public.group_members$$, 'a rider with no group reads no members');

-- Anonymous
reset role;
set local request.jwt.claims to '';
set local role anon;
select throws_ok($$select id from public.groups$$, '42501', null, 'an anonymous caller cannot read groups');
select throws_ok($$select rider_id from public.group_members$$, '42501', null, 'an anonymous caller cannot read members');

-- One default group per rider
reset role;
select lives_ok(
  $$insert into public.group_members (group_id, rider_id)
    values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a')$$,
  'a rider can belong to several groups');
select throws_ok(
  $$update public.group_members set is_default = true
    where group_id = '10000000-0000-0000-0000-000000000002'
      and rider_id = '00000000-0000-0000-0000-00000000000a'$$,
  '23505', null, 'a rider cannot have two default groups');
select throws_ok(
  $$update public.group_members set is_default = false
      where rider_id = '00000000-0000-0000-0000-00000000000a';
    set constraints all immediate$$,
  '23514', null, 'a rider with groups must keep a default group');
select throws_ok(
  $$insert into public.group_members (group_id, rider_id)
      values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d');
    set constraints all immediate$$,
  '23514', null, 'a first membership must be the default group');
select lives_ok(
  $$update public.group_members set is_default = false
      where group_id = '10000000-0000-0000-0000-000000000001'
        and rider_id = '00000000-0000-0000-0000-00000000000a';
    update public.group_members set is_default = true
      where group_id = '10000000-0000-0000-0000-000000000002'
        and rider_id = '00000000-0000-0000-0000-00000000000a';
    set constraints all immediate$$,
  'a rider can switch default group within one transaction');
select lives_ok(
  $$insert into public.group_members (group_id, rider_id, is_default)
      values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', true);
    set constraints all immediate$$,
  'a first membership marked default is accepted');
select lives_ok(
  $$delete from public.group_members
      where rider_id = '00000000-0000-0000-0000-00000000000d';
    set constraints all immediate$$,
  'a rider may leave their last group');

-- Deleting an account removes the rider from their groups
select lives_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
    set constraints all immediate$$,
  'an account with memberships can be deleted');
select is_empty(
  $$select 1 from public.group_members where rider_id = '00000000-0000-0000-0000-00000000000a'$$,
  'deleting an account removes the rider from their groups');
select is_empty(
  $$select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000a'$$,
  'deleting an account removes the profile');

-- Group names are validated
select throws_ok($$insert into public.groups (name) values ('   ')$$, '23514', null, 'a blank group name is rejected');

select * from finish();
rollback;

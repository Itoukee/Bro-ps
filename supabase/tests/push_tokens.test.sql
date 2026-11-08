begin;
select plan(14);

-- Ana and Ben share a group: a push token stays private even between friends.
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
insert into public.push_tokens (token, rider_id) values
  ('token-ben', '00000000-0000-0000-0000-00000000000b');

select has_table('public', 'push_tokens', 'push_tokens table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.push_tokens'::regclass),
  true, 'row level security is enabled on push_tokens');

-- Acting as Ana
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$insert into public.push_tokens (token, rider_id)
    values ('token-ana', '00000000-0000-0000-0000-00000000000a')$$,
  'a rider can register their own device token');
select throws_ok(
  $$insert into public.push_tokens (token, rider_id)
    values ('token-fake', '00000000-0000-0000-0000-00000000000b')$$,
  '42501', null, 'a rider cannot register a token for someone else');
select throws_ok(
  $$insert into public.push_tokens (token, rider_id)
    values ('', '00000000-0000-0000-0000-00000000000a')$$,
  '23514', null, 'an empty token is rejected');
select results_eq(
  $$select token from public.push_tokens$$,
  array['token-ana'],
  'a rider reads only their own tokens, not those of group mates');
select throws_ok(
  $$update public.push_tokens set rider_id = '00000000-0000-0000-0000-00000000000b'$$,
  '42501', null, 'a token cannot be reassigned to another rider');
select is_empty(
  $$delete from public.push_tokens where token = 'token-ben' returning token$$,
  'a rider cannot delete the token of a group mate');
select isnt_empty(
  $$delete from public.push_tokens where token = 'token-ana' returning token$$,
  'a rider can delete their own token');

-- Anonymous
reset role;
set local request.jwt.claims to '';
set local role anon;
select throws_ok($$select token from public.push_tokens$$, '42501', null, 'an anonymous caller cannot read tokens');
select throws_ok(
  $$insert into public.push_tokens (token, rider_id)
    values ('token-anon', '00000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'an anonymous caller cannot register a token');
reset role;

-- A token identifies one device
select throws_ok(
  $$insert into public.push_tokens (token, rider_id)
    values ('token-ben', '00000000-0000-0000-0000-00000000000a')$$,
  '23505', null, 'a token cannot belong to two riders');

-- Deleting an account removes the rider's tokens
select lives_ok(
  $$delete from auth.users where id = '00000000-0000-0000-0000-00000000000b'$$,
  'an account with a token can be deleted');
select is_empty(
  $$select 1 from public.push_tokens where token = 'token-ben'$$,
  'deleting an account removes the rider''s tokens');

select * from finish();
rollback;

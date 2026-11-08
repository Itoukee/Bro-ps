begin;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test');

select has_table('public', 'profiles', 'profiles table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'row level security is enabled on profiles'
);

-- Acting as Ana
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok(
  $$insert into public.profiles (id, display_name)
    values ('00000000-0000-0000-0000-00000000000a', 'Ana')$$,
  'a rider can create their own profile'
);
select throws_ok(
  $$insert into public.profiles (id, display_name)
    values ('00000000-0000-0000-0000-00000000000b', 'Not Ben')$$,
  '42501', null,
  'a rider cannot create a profile for someone else'
);
select throws_ok(
  $$insert into public.profiles (id, display_name)
    values ('00000000-0000-0000-0000-00000000000a', '   ')$$,
  '23514', null,
  'a blank display name is rejected'
);
select results_eq(
  $$select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'$$,
  array['Ana'],
  'a rider can read their own profile'
);
select results_eq(
  $$update public.profiles set display_name = 'Ana B.'
    where id = '00000000-0000-0000-0000-00000000000a' returning display_name$$,
  array['Ana B.'],
  'a rider can update their own display name'
);
select throws_ok(
  $$update public.profiles set id = '00000000-0000-0000-0000-00000000000b'
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '42501', null,
  'a rider cannot change their profile id'
);
select throws_ok(
  $$delete from public.profiles where id = '00000000-0000-0000-0000-00000000000a'$$,
  '42501', null,
  'a rider cannot delete a profile directly'
);

-- Ben has a profile, shares no group with Ana
reset role;
insert into public.profiles (id, display_name)
  values ('00000000-0000-0000-0000-00000000000b', 'Ben');
set local role authenticated;

select is_empty(
  $$select id from public.profiles where id = '00000000-0000-0000-0000-00000000000b'$$,
  'a rider cannot read the profile of a rider outside their groups'
);
select is_empty(
  $$update public.profiles set display_name = 'Hacked'
    where id = '00000000-0000-0000-0000-00000000000b' returning id$$,
  'a rider cannot update the profile of another rider'
);

-- Unauthenticated
reset role;
set local request.jwt.claims to '';
set local role anon;
select throws_ok(
  $$select id from public.profiles$$,
  '42501', null,
  'an anonymous caller cannot read profiles'
);
select throws_ok(
  $$insert into public.profiles (id, display_name)
    values ('00000000-0000-0000-0000-00000000000a', 'Anon')$$,
  '42501', null,
  'an anonymous caller cannot create a profile'
);

select * from finish();
rollback;

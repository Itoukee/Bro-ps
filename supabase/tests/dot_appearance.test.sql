begin;
select plan(30);

-- Ana and Ben share a group. Cara shares none with them.
-- Ana's profile is inserted before any rider chooses a look, as an existing row.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'cara@example.test'),
  ('00000000-0000-0000-0000-00000000000d', 'dan@example.test');
insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-00000000000a', 'Ana'),
  ('00000000-0000-0000-0000-00000000000b', 'Ben'),
  ('00000000-0000-0000-0000-00000000000c', 'Cara');
insert into public.groups (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Sunday riders');
insert into public.group_members (group_id, rider_id, is_default) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', true),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', true);

select col_not_null('public', 'profiles', 'dot_body_color', 'a profile always has a body color');
select col_not_null('public', 'profiles', 'dot_helmet_color', 'a profile always has a helmet color');
select col_not_null('public', 'profiles', 'dot_extra', 'a profile always has an extra');

select results_eq(
  $$select dot_body_color, dot_helmet_color, dot_extra from public.profiles
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  $$values ('#FFD84D'::text, '#6A45F5'::text, 'none'::text)$$,
  'a profile created without a look gets the default Dot'
);

-- Acting as Ana
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select results_eq(
  $$update public.profiles
    set dot_body_color = '#FF8FC7', dot_helmet_color = '#2F9BFF', dot_extra = 'mohawk'
    where id = '00000000-0000-0000-0000-00000000000a'
    returning dot_body_color, dot_helmet_color, dot_extra$$,
  $$values ('#FF8FC7'::text, '#2F9BFF'::text, 'mohawk'::text)$$,
  'a rider can update their own Dot'
);
select lives_ok(
  $$update public.profiles set dot_body_color = '#7ED957', dot_helmet_color = '#7ED957'
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  'a color in both palettes is accepted for the body and the helmet'
);
select lives_ok(
  $$update public.profiles set dot_extra = 'stache'
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  'a rider can pick another extra on its own'
);

-- The palette
select throws_ok(
  $$update public.profiles set dot_body_color = '#000000'
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', null,
  'a body color outside the palette is rejected'
);
select throws_ok(
  $$update public.profiles set dot_body_color = '#6A45F5'
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', null,
  'a helmet color is rejected as a body color'
);
select throws_ok(
  $$update public.profiles set dot_body_color = '#ffd84d'
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', null,
  'a body color in lower case is rejected'
);
select throws_ok(
  $$update public.profiles set dot_helmet_color = '#000000'
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', null,
  'a helmet color outside the palette is rejected'
);
select throws_ok(
  $$update public.profiles set dot_helmet_color = '#FFD84D'
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', null,
  'a body color is rejected as a helmet color'
);
select throws_ok(
  $$update public.profiles set dot_extra = 'wings'
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', null,
  'an unknown extra is rejected'
);
select throws_ok(
  $$update public.profiles set dot_body_color = null
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '23502', null,
  'a body color cannot be removed'
);
select throws_ok(
  $$update public.profiles set dot_helmet_color = null
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '23502', null,
  'a helmet color cannot be removed'
);
select throws_ok(
  $$update public.profiles set dot_extra = null
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '23502', null,
  'an extra cannot be removed'
);

-- Other riders
select results_eq(
  $$select dot_body_color from public.profiles where id = '00000000-0000-0000-0000-00000000000b'$$,
  array['#FFD84D'],
  'a rider can read the Dot of a group mate'
);
select is_empty(
  $$update public.profiles set dot_body_color = '#FF8FC7'
    where id = '00000000-0000-0000-0000-00000000000b' returning id$$,
  'a rider cannot update the Dot of a group mate'
);
select is_empty(
  $$select dot_body_color from public.profiles where id = '00000000-0000-0000-0000-00000000000c'$$,
  'a rider cannot read the Dot of a rider outside their groups'
);
select is_empty(
  $$update public.profiles set dot_body_color = '#FF8FC7'
    where id = '00000000-0000-0000-0000-00000000000c' returning id$$,
  'a rider cannot update the Dot of a rider outside their groups'
);

-- Column grants stay narrow
select throws_ok(
  $$update public.profiles set created_at = now()
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '42501', null,
  'adding the Dot columns did not open the other columns'
);

-- Acting as Dan, who has no profile yet
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';

select throws_ok(
  $$insert into public.profiles (id, display_name, dot_body_color)
    values ('00000000-0000-0000-0000-00000000000d', 'Dan', '#000000')$$,
  '23514', null,
  'a new profile cannot start with a color outside the palette'
);
select throws_ok(
  $$insert into public.profiles (id, display_name, dot_extra)
    values ('00000000-0000-0000-0000-00000000000d', 'Dan', 'wings')$$,
  '23514', null,
  'a new profile cannot start with an unknown extra'
);
select throws_ok(
  $$insert into public.profiles (id, display_name, dot_body_color, dot_helmet_color, dot_extra)
    values ('00000000-0000-0000-0000-00000000000c', 'Not Cara', '#FFB23E', '#FF5C72', 'ears')$$,
  '42501', null,
  'a rider cannot create a Dot for someone else'
);
select results_eq(
  $$insert into public.profiles (id, display_name, dot_body_color, dot_helmet_color, dot_extra)
    values ('00000000-0000-0000-0000-00000000000d', 'Dan', '#FFB23E', '#FF5C72', 'ears')
    returning dot_body_color, dot_helmet_color, dot_extra$$,
  $$values ('#FFB23E'::text, '#FF5C72'::text, 'ears'::text)$$,
  'a rider can create their profile with a Dot'
);

-- The denied updates above really changed nothing
reset role;
select results_eq(
  $$select dot_body_color from public.profiles where id = '00000000-0000-0000-0000-00000000000b'$$,
  array['#FFD84D'],
  'the Dot of a group mate is unchanged'
);
select results_eq(
  $$select dot_body_color from public.profiles where id = '00000000-0000-0000-0000-00000000000c'$$,
  array['#FFD84D'],
  'the Dot of a rider outside the group is unchanged'
);

-- Unauthenticated
set local request.jwt.claims to '';
set local role anon;
select throws_ok(
  $$select dot_body_color from public.profiles$$,
  '42501', null,
  'an anonymous caller cannot read a Dot'
);
select throws_ok(
  $$update public.profiles set dot_body_color = '#FF8FC7'
    where id = '00000000-0000-0000-0000-00000000000a'$$,
  '42501', null,
  'an anonymous caller cannot update a Dot'
);
select throws_ok(
  $$insert into public.profiles (id, display_name, dot_body_color)
    values ('00000000-0000-0000-0000-00000000000b', 'Anon', '#FFB23E')$$,
  '42501', null,
  'an anonymous caller cannot create a Dot'
);

select * from finish();
rollback;

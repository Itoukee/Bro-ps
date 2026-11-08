begin;
select plan(4);

select has_function('public', 'keepalive', 'the keepalive endpoint exists');
select is(
  (select prosecdef from pg_proc where oid = 'public.keepalive()'::regprocedure),
  false, 'the keepalive endpoint runs with the privileges of its caller');

set local role anon;
select is(public.keepalive(), true, 'the anonymous key can call the keepalive endpoint');

reset role;
select is_empty(
  $$select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname <> 'keepalive'
      and has_function_privilege('anon', p.oid, 'execute')$$,
  'keepalive is the only function the anonymous key can call');

select * from finish();
rollback;

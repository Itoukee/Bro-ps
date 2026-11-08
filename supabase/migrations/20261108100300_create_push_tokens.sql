-- alerts context: one Expo push token per device. Tokens are private to their
-- owner, even within a group. Fan-out happens in Edge Functions as service_role.
create table public.push_tokens (
  token text primary key check (char_length(token) between 1 and 512),
  rider_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index push_tokens_rider_id_idx on public.push_tokens (rider_id);

alter table public.push_tokens enable row level security;

revoke all on public.push_tokens from anon, authenticated;
grant select on public.push_tokens to authenticated;
grant insert (token, rider_id) on public.push_tokens to authenticated;
grant delete on public.push_tokens to authenticated;
grant select, insert, update, delete on public.push_tokens to service_role;

create policy "riders read their own tokens"
  on public.push_tokens for select to authenticated
  using (rider_id = (select auth.uid()));

create policy "riders register their own tokens"
  on public.push_tokens for insert to authenticated
  with check (rider_id = (select auth.uid()));

create policy "riders delete their own tokens"
  on public.push_tokens for delete to authenticated
  using (rider_id = (select auth.uid()));

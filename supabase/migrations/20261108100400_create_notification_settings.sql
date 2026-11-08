-- alerts context: per rider alert preferences, private to the rider.
create table public.notification_settings (
  rider_id uuid primary key references public.profiles (id) on delete cascade,
  friend_ride_alerts_enabled boolean not null default true,
  friend_speed_alerts_enabled boolean not null default false,
  own_voice_alert_enabled boolean not null default true
);

-- Every profile gets its settings row, so the server never has to guess a
-- default for a rider who has not opened the settings screen yet. Security
-- definer because clients have no insert right on this table.
create function private.create_notification_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_settings (rider_id) values (new.id);
  return null;
end;
$$;

revoke all on function private.create_notification_settings() from public;

create trigger profiles_create_notification_settings
  after insert on public.profiles
  for each row execute function private.create_notification_settings();

alter table public.notification_settings enable row level security;

revoke all on public.notification_settings from anon, authenticated;
grant select on public.notification_settings to authenticated;
grant update (friend_ride_alerts_enabled, friend_speed_alerts_enabled, own_voice_alert_enabled)
  on public.notification_settings to authenticated;
grant select, insert, update, delete on public.notification_settings to service_role;

create policy "riders read their own settings"
  on public.notification_settings for select to authenticated
  using (rider_id = (select auth.uid()));

create policy "riders update their own settings"
  on public.notification_settings for update to authenticated
  using (rider_id = (select auth.uid()))
  with check (rider_id = (select auth.uid()));

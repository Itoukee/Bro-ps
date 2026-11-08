-- identity context: the look of a rider's Dot character.
-- The defaults keep every existing profile valid. The palette is the same as in
-- src/contexts/identity/domain/DotAppearance.ts.
alter table public.profiles
  add column dot_body_color text not null default '#FFD84D'
    constraint profiles_dot_body_color_in_palette
    check (dot_body_color in ('#FFD84D', '#FFB23E', '#7ED957', '#FF8FC7')),
  add column dot_helmet_color text not null default '#6A45F5'
    constraint profiles_dot_helmet_color_in_palette
    check (dot_helmet_color in ('#6A45F5', '#FF5C72', '#2F9BFF', '#7B5CFF', '#7ED957')),
  add column dot_extra text not null default 'none'
    constraint profiles_dot_extra_is_known
    check (dot_extra in ('none', 'mohawk', 'ears', 'horns', 'stache'));

-- Writes stay column by column. Which row a rider may write is decided by the
-- existing policies: only their own.
grant insert (dot_body_color, dot_helmet_color, dot_extra) on public.profiles to authenticated;
grant update (dot_body_color, dot_helmet_color, dot_extra) on public.profiles to authenticated;

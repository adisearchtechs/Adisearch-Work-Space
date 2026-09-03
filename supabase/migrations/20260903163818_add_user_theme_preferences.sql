create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme_mode text not null default 'system' check (theme_mode in ('system', 'light', 'dark', 'custom')),
  light_variant text not null default 'pure-light' check (light_variant in ('light', 'pure-light')),
  dark_variant text not null default 'dark' check (dark_variant in ('dark', 'magic-blue', 'classic-dark')),
  custom_accent text not null default '#605e92' check (custom_accent ~ '^#[0-9A-Fa-f]{6}$'),
  custom_background text not null default '#1c1a2b' check (custom_background ~ '^#[0-9A-Fa-f]{6}$'),
  custom_contrast smallint not null default 45 check (custom_contrast between 0 and 100),
  custom_sidebar boolean not null default false,
  custom_sidebar_accent text not null default '#575ac6' check (custom_sidebar_accent ~ '^#[0-9A-Fa-f]{6}$'),
  custom_sidebar_background text not null default '#2a2a2a' check (custom_sidebar_background ~ '^#[0-9A-Fa-f]{6}$'),
  custom_sidebar_contrast smallint not null default 19 check (custom_sidebar_contrast between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

revoke all on table public.user_preferences from anon;
revoke all on table public.user_preferences from authenticated;
grant select, insert, update on table public.user_preferences to authenticated;

create policy user_preferences_select_self
on public.user_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy user_preferences_insert_self
on public.user_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy user_preferences_update_self
on public.user_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

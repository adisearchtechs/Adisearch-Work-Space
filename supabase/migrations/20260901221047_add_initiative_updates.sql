begin;

create table public.initiative_updates (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null,
   initiative_id uuid not null,
   author_id uuid references public.profiles (id) on delete set null,
   kind text not null default 'update' check (kind in ('update', 'comment')),
   health text check (health is null or health in ('on-track', 'at-risk', 'off-track')),
   body text not null check (char_length(body) between 1 and 10000),
   created_at timestamptz not null default now(),
   foreign key (initiative_id, organization_id)
      references public.initiatives (id, organization_id) on delete cascade,
   check (
      (kind = 'update' and health is not null)
      or (kind = 'comment' and health is null)
   )
);

create index initiative_updates_initiative_created_idx
   on public.initiative_updates (organization_id, initiative_id, created_at desc);
create index initiative_updates_initiative_organization_idx
   on public.initiative_updates (initiative_id, organization_id);
create index initiative_updates_author_idx
   on public.initiative_updates (author_id) where author_id is not null;

alter table public.initiative_updates enable row level security;

create policy initiative_updates_select_members on public.initiative_updates
for select to authenticated
using (private.is_org_member(organization_id));

create policy initiative_updates_insert_writers on public.initiative_updates
for insert to authenticated
with check (
   private.can_write_org(organization_id)
   and author_id = (select auth.uid())
);

revoke all on table public.initiative_updates from anon, authenticated;
grant select, insert on table public.initiative_updates to authenticated;

commit;

begin;

create table public.initiative_resources (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null,
   initiative_id uuid not null,
   created_by uuid references public.profiles (id) on delete set null,
   label text not null check (char_length(label) between 1 and 120),
   url text not null check (char_length(url) between 1 and 2048 and url ~ '^https?://'),
   position integer not null default 0 check (position >= 0),
   created_at timestamptz not null default now(),
   foreign key (initiative_id, organization_id)
      references public.initiatives (id, organization_id) on delete cascade
);

create index initiative_resources_initiative_order_idx
   on public.initiative_resources (organization_id, initiative_id, position, created_at);
create index initiative_resources_initiative_organization_idx
   on public.initiative_resources (initiative_id, organization_id);
create index initiative_resources_created_by_idx
   on public.initiative_resources (created_by) where created_by is not null;

alter table public.initiative_resources enable row level security;

create policy initiative_resources_select_members on public.initiative_resources
for select to authenticated
using (private.is_org_member(organization_id));

create policy initiative_resources_insert_writers on public.initiative_resources
for insert to authenticated
with check (
   private.can_write_org(organization_id)
   and created_by = (select auth.uid())
);

create policy initiative_resources_update_writers on public.initiative_resources
for update to authenticated
using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy initiative_resources_delete_writers on public.initiative_resources
for delete to authenticated
using (private.can_write_org(organization_id));

revoke all on table public.initiative_resources from anon, authenticated;
grant select, insert, update, delete on table public.initiative_resources to authenticated;

commit;

begin;

create table public.project_resources (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null,
   project_id uuid not null,
   created_by uuid references public.profiles (id) on delete set null,
   label text not null check (char_length(label) between 1 and 120),
   url text not null check (char_length(url) between 1 and 2048 and url ~ '^https?://'),
   position integer not null default 0 check (position >= 0),
   created_at timestamptz not null default now(),
   foreign key (project_id, organization_id)
      references public.projects (id, organization_id) on delete cascade
);

create index project_resources_project_order_idx
   on public.project_resources (organization_id, project_id, position, created_at);
create index project_resources_project_organization_idx
   on public.project_resources (project_id, organization_id);
create index project_resources_created_by_idx
   on public.project_resources (created_by) where created_by is not null;

alter table public.project_resources enable row level security;

create policy project_resources_select_members on public.project_resources
for select to authenticated
using (private.is_org_member(organization_id));

create policy project_resources_insert_writers on public.project_resources
for insert to authenticated
with check (
   private.can_write_org(organization_id)
   and created_by = (select auth.uid())
);

create policy project_resources_update_writers on public.project_resources
for update to authenticated
using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy project_resources_delete_writers on public.project_resources
for delete to authenticated
using (private.can_write_org(organization_id));

revoke all on table public.project_resources from anon, authenticated;
grant select, insert, update, delete on table public.project_resources to authenticated;

commit;

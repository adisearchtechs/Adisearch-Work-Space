begin;

create table public.project_milestones (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null,
   project_id uuid not null,
   created_by uuid references public.profiles (id) on delete set null,
   name text not null check (char_length(name) between 1 and 160),
   target_date date,
   completed boolean not null default false,
   position integer not null default 0 check (position >= 0),
   created_at timestamptz not null default now(),
   foreign key (project_id, organization_id)
      references public.projects (id, organization_id) on delete cascade
);

create index project_milestones_project_order_idx
   on public.project_milestones (organization_id, project_id, position, created_at);
create index project_milestones_project_organization_idx
   on public.project_milestones (project_id, organization_id);
create index project_milestones_created_by_idx
   on public.project_milestones (created_by) where created_by is not null;

alter table public.project_milestones enable row level security;

create policy project_milestones_select_members on public.project_milestones
for select to authenticated
using (private.is_org_member(organization_id));

create policy project_milestones_insert_writers on public.project_milestones
for insert to authenticated
with check (
   private.can_write_org(organization_id)
   and created_by = (select auth.uid())
);

create policy project_milestones_update_writers on public.project_milestones
for update to authenticated
using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy project_milestones_delete_writers on public.project_milestones
for delete to authenticated
using (private.can_write_org(organization_id));

revoke all on table public.project_milestones from anon, authenticated;
grant select, insert, update, delete on table public.project_milestones to authenticated;

commit;

begin;

create table public.initiatives (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations (id) on delete cascade,
   name text not null check (char_length(name) between 1 and 160),
   description text not null default '' check (char_length(description) <= 20000),
   icon text not null default '🎯' check (char_length(icon) between 1 and 16),
   status text not null default 'planned' check (status in ('active', 'planned', 'completed')),
   priority public.issue_priority not null default 'no-priority',
   owner_id uuid references public.profiles (id) on delete set null,
   target text check (target is null or char_length(target) <= 80),
   health text not null default 'no-update' check (health in ('no-update', 'on-track', 'at-risk', 'off-track')),
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (id, organization_id)
);

create index initiatives_organization_status_idx
   on public.initiatives (organization_id, status, created_at desc);
create index initiatives_owner_idx
   on public.initiatives (owner_id) where owner_id is not null;

create trigger initiatives_set_updated_at
before update on public.initiatives
for each row execute function private.set_updated_at();

alter table public.initiatives enable row level security;

create policy initiatives_select_members on public.initiatives
for select to authenticated
using (private.is_org_member(organization_id));

create policy initiatives_insert_writers on public.initiatives
for insert to authenticated
with check (private.can_write_org(organization_id));

create policy initiatives_update_writers on public.initiatives
for update to authenticated
using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));

create policy initiatives_delete_writers on public.initiatives
for delete to authenticated
using (private.can_write_org(organization_id));

revoke all on table public.initiatives from anon, authenticated;
grant select, insert, update, delete on table public.initiatives to authenticated;

create table public.initiative_projects (
   initiative_id uuid not null,
   project_id uuid not null,
   organization_id uuid not null,
   created_at timestamptz not null default now(),
   primary key (initiative_id, project_id),
   foreign key (initiative_id, organization_id)
      references public.initiatives (id, organization_id) on delete cascade,
   foreign key (project_id, organization_id)
      references public.projects (id, organization_id) on delete cascade
);

create index initiative_projects_organization_project_idx
   on public.initiative_projects (organization_id, project_id);
create index initiative_projects_project_organization_idx
   on public.initiative_projects (project_id, organization_id);

alter table public.initiative_projects enable row level security;

create policy initiative_projects_select_members on public.initiative_projects
for select to authenticated
using (private.is_org_member(organization_id));

create policy initiative_projects_insert_writers on public.initiative_projects
for insert to authenticated
with check (private.can_write_org(organization_id));

create policy initiative_projects_delete_writers on public.initiative_projects
for delete to authenticated
using (private.can_write_org(organization_id));

revoke all on table public.initiative_projects from anon, authenticated;
grant select, insert, delete on table public.initiative_projects to authenticated;

commit;

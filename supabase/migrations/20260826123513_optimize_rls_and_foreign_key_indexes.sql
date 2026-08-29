begin;

create index organizations_created_by_idx on public.organizations (created_by);
create index team_members_team_organization_idx on public.team_members (team_id, organization_id);
create index projects_team_organization_idx on public.projects (team_id, organization_id);
create index projects_lead_organization_idx on public.projects (lead_id, organization_id);
create index cycles_team_organization_idx on public.cycles (team_id, organization_id);
create index issues_team_organization_idx on public.issues (team_id, organization_id);
create index issues_status_organization_idx on public.issues (status_id, organization_id);
create index issues_assignee_organization_idx on public.issues (assignee_id, organization_id);
create index issues_project_organization_idx on public.issues (project_id, organization_id);
create index issues_cycle_organization_idx on public.issues (cycle_id, organization_id);
create index issues_creator_organization_idx on public.issues (creator_id, organization_id);
create index issue_labels_issue_organization_idx on public.issue_labels (issue_id, organization_id);
create index issue_labels_label_organization_idx on public.issue_labels (label_id, organization_id);

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
   select (select auth.uid()) is not null and exists (
      select 1
      from public.organization_members
      where organization_id = target_organization_id
        and user_id = (select auth.uid())
   );
$$;

create or replace function private.can_write_org(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
   select (select auth.uid()) is not null and exists (
      select 1
      from public.organization_members
      where organization_id = target_organization_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin', 'member')
   );
$$;

create or replace function private.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
   select (select auth.uid()) is not null and exists (
      select 1
      from public.organization_members
      where organization_id = target_organization_id
        and user_id = (select auth.uid())
        and role in ('owner', 'admin')
   );
$$;

create or replace function private.shares_org(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
   select (select auth.uid()) is not null and exists (
      select 1
      from public.organization_members viewer
      join public.organization_members target
        on target.organization_id = viewer.organization_id
      where viewer.user_id = (select auth.uid())
        and target.user_id = target_user_id
   );
$$;

alter policy profiles_select_shared_org on public.profiles
using (id = (select auth.uid()) or private.shares_org(id));

alter policy profiles_update_self on public.profiles
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter policy organizations_insert_authenticated on public.organizations
with check (created_by = (select auth.uid()));

alter policy organizations_delete_owners on public.organizations
using (exists (
   select 1
   from public.organization_members
   where organization_id = organizations.id
     and user_id = (select auth.uid())
     and role = 'owner'
));

alter policy issues_insert_writers on public.issues
with check (
   private.can_write_org(organization_id)
   and creator_id = (select auth.uid())
);

alter policy issues_delete_creator_or_admin on public.issues
using (
   creator_id = (select auth.uid())
   or private.is_org_admin(organization_id)
);

commit;

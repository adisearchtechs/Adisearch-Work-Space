-- Adisearch Workspace initial schema.
-- Apply to a new Supabase project with the SQL editor or Supabase CLI.
-- Every public table has RLS enabled and explicit authenticated-role grants.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.organization_role as enum ('owner', 'admin', 'member', 'guest');
create type public.status_category as enum (
   'triage',
   'backlog',
   'unstarted',
   'started',
   'completed',
   'canceled'
);
create type public.issue_priority as enum ('no-priority', 'urgent', 'high', 'medium', 'low');

create table public.profiles (
   id uuid primary key references auth.users (id) on delete cascade,
   display_name text check (char_length(display_name) <= 120),
   avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
   timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
);

create table public.organizations (
   id uuid primary key default extensions.gen_random_uuid(),
   name text not null check (char_length(name) between 2 and 80),
   slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$'),
   created_by uuid not null references public.profiles (id) on delete restrict,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now()
);

create table public.organization_members (
   organization_id uuid not null references public.organizations (id) on delete cascade,
   user_id uuid not null references public.profiles (id) on delete cascade,
   role public.organization_role not null default 'member',
   created_at timestamptz not null default now(),
   primary key (organization_id, user_id),
   unique (user_id, organization_id)
);

create table public.teams (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations (id) on delete cascade,
   name text not null check (char_length(name) between 2 and 80),
   key text not null check (key ~ '^[A-Z][A-Z0-9]{1,9}$'),
   issue_prefix text not null check (issue_prefix ~ '^[A-Z][A-Z0-9]{1,9}$'),
   color text not null default '#5E6AD2' check (color ~ '^#[0-9A-Fa-f]{6}$'),
   next_issue_number bigint not null default 1 check (next_issue_number > 0),
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (organization_id, key),
   unique (organization_id, issue_prefix),
   unique (id, organization_id)
);

create table public.team_members (
   team_id uuid not null,
   organization_id uuid not null,
   user_id uuid not null,
   created_at timestamptz not null default now(),
   primary key (team_id, user_id),
   foreign key (team_id, organization_id)
      references public.teams (id, organization_id) on delete cascade,
   foreign key (user_id, organization_id)
      references public.organization_members (user_id, organization_id) on delete cascade
);

create table public.statuses (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations (id) on delete cascade,
   name text not null check (char_length(name) between 1 and 60),
   slug text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$'),
   category public.status_category not null,
   color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
   position smallint not null default 0 check (position >= 0),
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (organization_id, slug),
   unique (id, organization_id)
);

create table public.projects (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null,
   team_id uuid not null,
   name text not null check (char_length(name) between 1 and 160),
   status text not null default 'planned' check (status in ('planned', 'active', 'paused', 'completed', 'canceled')),
   lead_id uuid,
   target_date date,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (id, organization_id),
   foreign key (team_id, organization_id)
      references public.teams (id, organization_id) on delete cascade,
   foreign key (lead_id, organization_id)
      references public.organization_members (user_id, organization_id)
      on delete set null (lead_id)
);

create table public.cycles (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null,
   team_id uuid not null,
   name text not null check (char_length(name) between 1 and 120),
   starts_at date not null,
   ends_at date not null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (id, organization_id),
   check (ends_at >= starts_at),
   foreign key (team_id, organization_id)
      references public.teams (id, organization_id) on delete cascade
);

create table public.labels (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations (id) on delete cascade,
   name text not null check (char_length(name) between 1 and 60),
   color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (organization_id, name),
   unique (id, organization_id)
);

create table public.issues (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null,
   team_id uuid not null,
   issue_number bigint not null default 0 check (issue_number > 0),
   title text not null check (char_length(title) between 1 and 240),
   description text not null default '' check (char_length(description) <= 20000),
   status_id uuid not null,
   priority public.issue_priority not null default 'no-priority',
   assignee_id uuid,
   project_id uuid,
   cycle_id uuid,
   creator_id uuid not null,
   rank text not null default '',
   due_date date,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (team_id, issue_number),
   unique (id, organization_id),
   foreign key (team_id, organization_id)
      references public.teams (id, organization_id) on delete restrict,
   foreign key (status_id, organization_id)
      references public.statuses (id, organization_id) on delete restrict,
   foreign key (assignee_id, organization_id)
      references public.organization_members (user_id, organization_id)
      on delete set null (assignee_id),
   foreign key (project_id, organization_id)
      references public.projects (id, organization_id)
      on delete set null (project_id),
   foreign key (cycle_id, organization_id)
      references public.cycles (id, organization_id)
      on delete set null (cycle_id),
   foreign key (creator_id, organization_id)
      references public.organization_members (user_id, organization_id) on delete restrict
);

create table public.issue_labels (
   issue_id uuid not null,
   label_id uuid not null,
   organization_id uuid not null,
   created_at timestamptz not null default now(),
   primary key (issue_id, label_id),
   foreign key (issue_id, organization_id)
      references public.issues (id, organization_id) on delete cascade,
   foreign key (label_id, organization_id)
      references public.labels (id, organization_id) on delete cascade
);

create index organization_members_user_id_idx on public.organization_members (user_id, organization_id);
create index teams_organization_id_idx on public.teams (organization_id, key);
create index team_members_user_id_idx on public.team_members (user_id, organization_id);
create index statuses_organization_position_idx on public.statuses (organization_id, position);
create index projects_organization_team_idx on public.projects (organization_id, team_id);
create index projects_lead_id_idx on public.projects (lead_id) where lead_id is not null;
create index cycles_organization_team_dates_idx on public.cycles (organization_id, team_id, starts_at, ends_at);
create index labels_organization_id_idx on public.labels (organization_id);
create index issues_organization_team_rank_idx on public.issues (organization_id, team_id, rank desc);
create index issues_organization_status_rank_idx on public.issues (organization_id, status_id, rank desc);
create index issues_assignee_id_idx on public.issues (assignee_id) where assignee_id is not null;
create index issues_project_id_idx on public.issues (project_id) where project_id is not null;
create index issues_cycle_id_idx on public.issues (cycle_id) where cycle_id is not null;
create index issues_creator_id_idx on public.issues (creator_id);
create index issue_labels_organization_label_idx on public.issue_labels (organization_id, label_id);

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
   select auth.uid() is not null and exists (
      select 1
      from public.organization_members
      where organization_id = target_organization_id
        and user_id = auth.uid()
   );
$$;

create or replace function private.can_write_org(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
   select auth.uid() is not null and exists (
      select 1
      from public.organization_members
      where organization_id = target_organization_id
        and user_id = auth.uid()
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
   select auth.uid() is not null and exists (
      select 1
      from public.organization_members
      where organization_id = target_organization_id
        and user_id = auth.uid()
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
   select auth.uid() is not null and exists (
      select 1
      from public.organization_members viewer
      join public.organization_members target
        on target.organization_id = viewer.organization_id
      where viewer.user_id = auth.uid()
        and target.user_id = target_user_id
   );
$$;

revoke all on function private.is_org_member(uuid) from public;
revoke all on function private.can_write_org(uuid) from public;
revoke all on function private.is_org_admin(uuid) from public;
revoke all on function private.shares_org(uuid) from public;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.can_write_org(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;
grant execute on function private.shares_org(uuid) to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
   new.updated_at = now();
   return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
   insert into public.profiles (id, display_name, avatar_url)
   values (
      new.id,
      nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), ''),
      nullif(left(coalesce(new.raw_user_meta_data ->> 'avatar_url', ''), 2048), '')
   )
   on conflict (id) do nothing;
   return new;
end;
$$;

create or replace function private.bootstrap_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
   core_team_id uuid;
begin
   insert into public.organization_members (organization_id, user_id, role)
   values (new.id, new.created_by, 'owner');

   insert into public.teams (organization_id, name, key, issue_prefix, color)
   values (new.id, 'Core', 'CORE', 'ADI', '#5E6AD2')
   returning id into core_team_id;

   insert into public.team_members (team_id, organization_id, user_id)
   values (core_team_id, new.id, new.created_by);

   insert into public.statuses (organization_id, name, slug, category, color, position)
   values
      (new.id, 'Triage', 'triage', 'triage', '#F2790F', 10),
      (new.id, 'Backlog', 'backlog', 'backlog', '#95A2B3', 20),
      (new.id, 'Todo', 'to-do', 'unstarted', '#99A2B2', 30),
      (new.id, 'In Progress', 'in-progress', 'started', '#FACC15', 40),
      (new.id, 'Technical Review', 'technical-review', 'started', '#22C55E', 41),
      (new.id, 'Paused', 'paused', 'started', '#26B5CE', 42),
      (new.id, 'Product Feedback', 'product-feedback', 'started', '#F2994A', 43),
      (new.id, 'Blocked', 'blocked', 'started', '#EB5757', 44),
      (new.id, 'Done', 'done', 'completed', '#5E6AD2', 50),
      (new.id, 'Shipped', 'shipped', 'completed', '#4CB782', 51),
      (new.id, 'Canceled', 'canceled', 'canceled', '#95A2B3', 60),
      (new.id, 'Duplicate', 'duplicate', 'canceled', '#95A2B3', 61),
      (new.id, 'Idea', 'idea', 'backlog', '#5E6AD2', 21);

   insert into public.labels (organization_id, name, color)
   values
      (new.id, 'Bug', '#EB5757'),
      (new.id, 'Feature', '#4CB782'),
      (new.id, 'Security', '#5E6AD2');

   return new;
end;
$$;

create or replace function private.assign_issue_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
   assigned_number bigint;
begin
   select next_issue_number
     into assigned_number
     from public.teams
    where id = new.team_id
      and organization_id = new.organization_id
    for update;

   if assigned_number is null then
      raise exception 'Invalid team for organization';
   end if;

   new.issue_number = assigned_number;
   new.rank = lpad(assigned_number::text, 20, '0');

   update public.teams
      set next_issue_number = assigned_number + 1,
          updated_at = now()
    where id = new.team_id
      and organization_id = new.organization_id;

   return new;
end;
$$;

create or replace function private.protect_issue_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
   if new.organization_id <> old.organization_id
      or new.team_id <> old.team_id
      or new.issue_number <> old.issue_number
      or new.creator_id <> old.creator_id then
      raise exception 'Issue tenant and identity fields are immutable';
   end if;
   return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create trigger on_organization_created
after insert on public.organizations
for each row execute function private.bootstrap_workspace();

create trigger assign_issue_number_before_insert
before insert on public.issues
for each row execute function private.assign_issue_number();

create trigger protect_issue_identity_before_update
before update on public.issues
for each row execute function private.protect_issue_identity();

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations
for each row execute function private.set_updated_at();
create trigger teams_set_updated_at before update on public.teams
for each row execute function private.set_updated_at();
create trigger statuses_set_updated_at before update on public.statuses
for each row execute function private.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
for each row execute function private.set_updated_at();
create trigger cycles_set_updated_at before update on public.cycles
for each row execute function private.set_updated_at();
create trigger labels_set_updated_at before update on public.labels
for each row execute function private.set_updated_at();
create trigger issues_set_updated_at before update on public.issues
for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.statuses enable row level security;
alter table public.projects enable row level security;
alter table public.cycles enable row level security;
alter table public.labels enable row level security;
alter table public.issues enable row level security;
alter table public.issue_labels enable row level security;

create policy profiles_select_shared_org on public.profiles
for select to authenticated
using (id = auth.uid() or private.shares_org(id));
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy organizations_select_members on public.organizations
for select to authenticated
using (private.is_org_member(id));
create policy organizations_insert_authenticated on public.organizations
for insert to authenticated
with check (created_by = auth.uid());
create policy organizations_update_admins on public.organizations
for update to authenticated
using (private.is_org_admin(id))
with check (private.is_org_admin(id));
create policy organizations_delete_owners on public.organizations
for delete to authenticated
using (exists (
   select 1 from public.organization_members
   where organization_id = id and user_id = auth.uid() and role = 'owner'
));

create policy organization_members_select_members on public.organization_members
for select to authenticated
using (private.is_org_member(organization_id));
create policy organization_members_insert_admins on public.organization_members
for insert to authenticated
with check (private.is_org_admin(organization_id));
create policy organization_members_update_admins on public.organization_members
for update to authenticated
using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));
create policy organization_members_delete_admins on public.organization_members
for delete to authenticated
using (private.is_org_admin(organization_id) and role <> 'owner');

create policy teams_select_members on public.teams
for select to authenticated using (private.is_org_member(organization_id));
create policy teams_insert_admins on public.teams
for insert to authenticated with check (private.is_org_admin(organization_id));
create policy teams_update_admins on public.teams
for update to authenticated
using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));
create policy teams_delete_admins on public.teams
for delete to authenticated using (private.is_org_admin(organization_id));

create policy team_members_select_members on public.team_members
for select to authenticated using (private.is_org_member(organization_id));
create policy team_members_insert_admins on public.team_members
for insert to authenticated with check (private.is_org_admin(organization_id));
create policy team_members_delete_admins on public.team_members
for delete to authenticated using (private.is_org_admin(organization_id));

create policy statuses_select_members on public.statuses
for select to authenticated using (private.is_org_member(organization_id));
create policy statuses_insert_admins on public.statuses
for insert to authenticated with check (private.is_org_admin(organization_id));
create policy statuses_update_admins on public.statuses
for update to authenticated
using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));
create policy statuses_delete_admins on public.statuses
for delete to authenticated using (private.is_org_admin(organization_id));

create policy projects_select_members on public.projects
for select to authenticated using (private.is_org_member(organization_id));
create policy projects_insert_writers on public.projects
for insert to authenticated with check (private.can_write_org(organization_id));
create policy projects_update_writers on public.projects
for update to authenticated
using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));
create policy projects_delete_writers on public.projects
for delete to authenticated using (private.can_write_org(organization_id));

create policy cycles_select_members on public.cycles
for select to authenticated using (private.is_org_member(organization_id));
create policy cycles_insert_writers on public.cycles
for insert to authenticated with check (private.can_write_org(organization_id));
create policy cycles_update_writers on public.cycles
for update to authenticated
using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));
create policy cycles_delete_writers on public.cycles
for delete to authenticated using (private.can_write_org(organization_id));

create policy labels_select_members on public.labels
for select to authenticated using (private.is_org_member(organization_id));
create policy labels_insert_writers on public.labels
for insert to authenticated with check (private.can_write_org(organization_id));
create policy labels_update_writers on public.labels
for update to authenticated
using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));
create policy labels_delete_writers on public.labels
for delete to authenticated using (private.can_write_org(organization_id));

create policy issues_select_members on public.issues
for select to authenticated using (private.is_org_member(organization_id));
create policy issues_insert_writers on public.issues
for insert to authenticated
with check (private.can_write_org(organization_id) and creator_id = auth.uid());
create policy issues_update_writers on public.issues
for update to authenticated
using (private.can_write_org(organization_id))
with check (private.can_write_org(organization_id));
create policy issues_delete_creator_or_admin on public.issues
for delete to authenticated
using (creator_id = auth.uid() or private.is_org_admin(organization_id));

create policy issue_labels_select_members on public.issue_labels
for select to authenticated using (private.is_org_member(organization_id));
create policy issue_labels_insert_writers on public.issue_labels
for insert to authenticated with check (private.can_write_org(organization_id));
create policy issue_labels_delete_writers on public.issue_labels
for delete to authenticated using (private.can_write_org(organization_id));

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.organizations from anon, authenticated;
revoke all on table public.organization_members from anon, authenticated;
revoke all on table public.teams from anon, authenticated;
revoke all on table public.team_members from anon, authenticated;
revoke all on table public.statuses from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.cycles from anon, authenticated;
revoke all on table public.labels from anon, authenticated;
revoke all on table public.issues from anon, authenticated;
revoke all on table public.issue_labels from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.organizations to authenticated;
grant select, insert, update, delete on table public.organization_members to authenticated;
grant select, insert, update, delete on table public.teams to authenticated;
grant select, insert, delete on table public.team_members to authenticated;
grant select, insert, update, delete on table public.statuses to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.cycles to authenticated;
grant select, insert, update, delete on table public.labels to authenticated;
grant select, insert, update, delete on table public.issues to authenticated;
grant select, insert, delete on table public.issue_labels to authenticated;

commit;

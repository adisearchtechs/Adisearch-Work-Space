create table public.status_report_snapshots (
   id uuid primary key default gen_random_uuid(),
   organization_id uuid not null references public.organizations(id) on delete cascade,
   scope text not null check (scope in ('workspace', 'team')),
   team_id uuid,
   created_by uuid not null references public.profiles(id) on delete restrict,
   schema_version smallint not null default 1 check (schema_version = 1),
   generated_at timestamptz not null,
   payload jsonb not null check (jsonb_typeof(payload) = 'object'),
   created_at timestamptz not null default now(),
   constraint status_report_snapshots_scope_team_check check (
      (scope = 'workspace' and team_id is null)
      or (scope = 'team' and team_id is not null)
   ),
   constraint status_report_snapshots_team_org_fkey
      foreign key (team_id, organization_id)
      references public.teams(id, organization_id)
      on delete cascade
);

create index status_report_snapshots_org_created_idx
   on public.status_report_snapshots (organization_id, created_at desc);
create index status_report_snapshots_team_created_idx
   on public.status_report_snapshots (team_id, created_at desc)
   where team_id is not null;
create index status_report_snapshots_created_by_idx
   on public.status_report_snapshots (created_by);

alter table public.status_report_snapshots enable row level security;

create policy status_report_snapshots_select_members
   on public.status_report_snapshots
   for select
   to authenticated
   using (private.is_org_member(organization_id));

create policy status_report_snapshots_insert_writers
   on public.status_report_snapshots
   for insert
   to authenticated
   with check (
      private.can_write_org(organization_id)
      and created_by = (select auth.uid())
   );

revoke all on table public.status_report_snapshots from anon;
revoke all on table public.status_report_snapshots from authenticated;
grant select, insert on table public.status_report_snapshots to authenticated;

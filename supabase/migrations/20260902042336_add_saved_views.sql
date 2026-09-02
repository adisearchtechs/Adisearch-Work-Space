create table public.saved_views (
   id uuid primary key default gen_random_uuid(),
   organization_id uuid not null,
   team_id uuid,
   owner_id uuid not null references public.profiles(id) on delete cascade,
   name text not null check (char_length(name) between 1 and 160),
   description text not null default '' check (char_length(description) <= 1000),
   icon text not null default '👁️' check (char_length(icon) between 1 and 16),
   view_type text not null check (view_type in ('issue', 'project')),
   filter jsonb not null default '{}'::jsonb check (jsonb_typeof(filter) = 'object'),
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   constraint saved_views_team_id_organization_id_fkey
      foreign key (team_id, organization_id)
      references public.teams(id, organization_id)
      on delete cascade
);

create index saved_views_org_team_type_updated_idx
   on public.saved_views (organization_id, team_id, view_type, updated_at desc);
create index saved_views_owner_idx on public.saved_views (owner_id);
create index saved_views_team_org_idx
   on public.saved_views (team_id, organization_id)
   where team_id is not null;

create trigger set_saved_views_updated_at
   before update on public.saved_views
   for each row execute function private.set_updated_at();

alter table public.saved_views enable row level security;

create policy saved_views_select_members
   on public.saved_views
   for select
   to authenticated
   using (private.is_org_member(organization_id));

create policy saved_views_insert_writers
   on public.saved_views
   for insert
   to authenticated
   with check (
      private.can_write_org(organization_id)
      and owner_id = (select auth.uid())
   );

create policy saved_views_update_owner_admin
   on public.saved_views
   for update
   to authenticated
   using (
      private.can_write_org(organization_id)
      and (
         owner_id = (select auth.uid())
         or exists (
            select 1
            from public.organization_members om
            where om.organization_id = saved_views.organization_id
              and om.user_id = (select auth.uid())
              and om.role in ('owner'::public.organization_role, 'admin'::public.organization_role)
         )
      )
   )
   with check (
      private.can_write_org(organization_id)
      and (
         owner_id = (select auth.uid())
         or exists (
            select 1
            from public.organization_members om
            where om.organization_id = saved_views.organization_id
              and om.user_id = (select auth.uid())
              and om.role in ('owner'::public.organization_role, 'admin'::public.organization_role)
         )
      )
   );

create policy saved_views_delete_owner_admin
   on public.saved_views
   for delete
   to authenticated
   using (
      private.can_write_org(organization_id)
      and (
         owner_id = (select auth.uid())
         or exists (
            select 1
            from public.organization_members om
            where om.organization_id = saved_views.organization_id
              and om.user_id = (select auth.uid())
              and om.role in ('owner'::public.organization_role, 'admin'::public.organization_role)
         )
      )
   );

revoke all on table public.saved_views from anon;
grant all on table public.saved_views to authenticated;

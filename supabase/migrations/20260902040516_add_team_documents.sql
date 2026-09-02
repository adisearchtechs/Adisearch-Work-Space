create table public.team_documents (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null,
   team_id uuid not null,
   created_by uuid references public.profiles(id) on delete set null,
   title text not null check (char_length(title) >= 1 and char_length(title) <= 160),
   body text not null default '' check (char_length(body) <= 50000),
   pinned boolean not null default false,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   constraint team_documents_team_id_organization_id_fkey
      foreign key (team_id, organization_id)
      references public.teams(id, organization_id)
      on delete cascade
);

create index team_documents_team_org_idx
   on public.team_documents (team_id, organization_id);
create index team_documents_org_team_pinned_updated_idx
   on public.team_documents (organization_id, team_id, pinned desc, updated_at desc);
create index team_documents_created_by_idx
   on public.team_documents (created_by)
   where created_by is not null;

alter table public.team_documents enable row level security;

create policy team_documents_select_members
   on public.team_documents
   for select
   to authenticated
   using (private.is_org_member(organization_id));

create policy team_documents_insert_writers
   on public.team_documents
   for insert
   to authenticated
   with check (
      private.can_write_org(organization_id)
      and created_by = (select auth.uid())
   );

create policy team_documents_update_writers
   on public.team_documents
   for update
   to authenticated
   using (private.can_write_org(organization_id))
   with check (private.can_write_org(organization_id));

create policy team_documents_delete_writers
   on public.team_documents
   for delete
   to authenticated
   using (private.can_write_org(organization_id));

grant select, insert, update, delete on public.team_documents to authenticated;
revoke all on public.team_documents from anon;

create trigger set_team_documents_updated_at
before update on public.team_documents
for each row execute function private.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-attachments',
  'workspace-attachments',
  false,
  26214400,
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf','text/plain','text/csv','application/json',
    'application/zip',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.attachments (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  issue_id uuid null,
  project_id uuid null,
  initiative_id uuid null,
  uploaded_by uuid null references public.profiles(id) on delete set null,
  file_name text not null check (char_length(btrim(file_name)) between 1 and 255),
  storage_path text not null unique check (char_length(storage_path) between 1 and 1024),
  mime_type text not null check (char_length(mime_type) between 1 and 160),
  byte_size bigint not null check (byte_size between 1 and 26214400),
  created_at timestamptz not null default now(),
  constraint attachments_exactly_one_parent check (
    ((issue_id is not null)::int + (project_id is not null)::int + (initiative_id is not null)::int) = 1
  ),
  constraint attachments_issue_organization_fkey foreign key (issue_id, organization_id)
    references public.issues(id, organization_id) on delete cascade,
  constraint attachments_project_organization_fkey foreign key (project_id, organization_id)
    references public.projects(id, organization_id) on delete cascade,
  constraint attachments_initiative_organization_fkey foreign key (initiative_id, organization_id)
    references public.initiatives(id, organization_id) on delete cascade
);

create index attachments_org_created_idx on public.attachments (organization_id, created_at desc);
create index attachments_issue_org_idx on public.attachments (issue_id, organization_id) where issue_id is not null;
create index attachments_project_org_idx on public.attachments (project_id, organization_id) where project_id is not null;
create index attachments_initiative_org_idx on public.attachments (initiative_id, organization_id) where initiative_id is not null;
create index attachments_uploaded_by_idx on public.attachments (uploaded_by) where uploaded_by is not null;

alter table public.attachments enable row level security;

create policy attachments_select_members on public.attachments
for select to authenticated
using (private.is_org_member(organization_id));

create policy attachments_insert_writers on public.attachments
for insert to authenticated
with check (private.can_write_org(organization_id) and uploaded_by = (select auth.uid()));

create policy attachments_delete_writers on public.attachments
for delete to authenticated
using (private.can_write_org(organization_id));

revoke all on table public.attachments from anon, authenticated;
grant select, insert, delete on table public.attachments to authenticated;

create policy workspace_attachments_select_members on storage.objects
for select to authenticated
using (
  bucket_id = 'workspace-attachments'
  and exists (
    select 1 from public.organization_members om
    where om.user_id = (select auth.uid())
      and om.organization_id::text = (storage.foldername(name))[1]
  )
);

create policy workspace_attachments_insert_writers on storage.objects
for insert to authenticated
with check (
  bucket_id = 'workspace-attachments'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.organization_members om
    where om.user_id = (select auth.uid())
      and om.organization_id::text = (storage.foldername(name))[1]
      and om.role <> 'guest'::public.organization_role
  )
);

create policy workspace_attachments_delete_writers on storage.objects
for delete to authenticated
using (
  bucket_id = 'workspace-attachments'
  and exists (
    select 1 from public.organization_members om
    where om.user_id = (select auth.uid())
      and om.organization_id::text = (storage.foldername(name))[1]
      and om.role <> 'guest'::public.organization_role
  )
);

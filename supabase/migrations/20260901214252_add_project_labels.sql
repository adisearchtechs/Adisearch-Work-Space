begin;

create table public.project_labels (
   project_id uuid not null,
   label_id uuid not null,
   organization_id uuid not null,
   created_at timestamptz not null default now(),
   primary key (project_id, label_id),
   foreign key (project_id, organization_id)
      references public.projects (id, organization_id) on delete cascade,
   foreign key (label_id, organization_id)
      references public.labels (id, organization_id) on delete cascade
);

create index project_labels_organization_label_idx
   on public.project_labels (organization_id, label_id);
create index project_labels_label_organization_idx
   on public.project_labels (label_id, organization_id);

alter table public.project_labels enable row level security;

create policy project_labels_select_members on public.project_labels
for select to authenticated
using (private.is_org_member(organization_id));

create policy project_labels_insert_writers on public.project_labels
for insert to authenticated
with check (private.can_write_org(organization_id));

create policy project_labels_delete_writers on public.project_labels
for delete to authenticated
using (private.can_write_org(organization_id));

revoke all on table public.project_labels from anon, authenticated;
grant select, insert, delete on table public.project_labels to authenticated;

commit;

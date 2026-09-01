begin;

create table public.initiative_labels (
   initiative_id uuid not null,
   label_id uuid not null,
   organization_id uuid not null,
   created_at timestamptz not null default now(),
   primary key (initiative_id, label_id),
   foreign key (initiative_id, organization_id)
      references public.initiatives (id, organization_id) on delete cascade,
   foreign key (label_id, organization_id)
      references public.labels (id, organization_id) on delete cascade
);

create index initiative_labels_organization_label_idx
   on public.initiative_labels (organization_id, label_id);
create index initiative_labels_initiative_organization_idx
   on public.initiative_labels (initiative_id, organization_id);
create index initiative_labels_label_organization_idx
   on public.initiative_labels (label_id, organization_id);

alter table public.initiative_labels enable row level security;

create policy initiative_labels_select_members on public.initiative_labels
for select to authenticated
using (private.is_org_member(organization_id));

create policy initiative_labels_insert_writers on public.initiative_labels
for insert to authenticated
with check (private.can_write_org(organization_id));

create policy initiative_labels_delete_writers on public.initiative_labels
for delete to authenticated
using (private.can_write_org(organization_id));

revoke all on table public.initiative_labels from anon, authenticated;
grant select, insert, delete on table public.initiative_labels to authenticated;

commit;

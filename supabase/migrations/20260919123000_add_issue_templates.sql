create table public.issue_templates (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations (id) on delete cascade,
   name text not null check (char_length(name) between 1 and 80),
   description text not null default '' check (char_length(description) <= 500),
   title text not null default '' check (char_length(title) <= 200),
   body text not null default '' check (char_length(body) <= 10000),
   active boolean not null default true,
   position smallint not null default 0 check (position >= 0),
   created_by uuid references public.profiles (id) on delete set null,
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (organization_id, name),
   unique (id, organization_id)
);

create index issue_templates_org_position_idx
   on public.issue_templates (organization_id, position, name);

create trigger issue_templates_set_updated_at before update on public.issue_templates
for each row execute function private.set_updated_at();

alter table public.issue_templates enable row level security;

create policy issue_templates_select_members on public.issue_templates
for select to authenticated using (private.is_org_member(organization_id));
create policy issue_templates_insert_admins on public.issue_templates
for insert to authenticated with check (private.is_org_admin(organization_id));
create policy issue_templates_update_admins on public.issue_templates
for update to authenticated
using (private.is_org_admin(organization_id))
with check (private.is_org_admin(organization_id));
create policy issue_templates_delete_admins on public.issue_templates
for delete to authenticated using (private.is_org_admin(organization_id));

revoke all on table public.issue_templates from anon, authenticated;
grant select, insert, update, delete on table public.issue_templates to authenticated;

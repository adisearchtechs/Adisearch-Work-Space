begin;

create table public.issue_relations (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations (id) on delete cascade,
   source_issue_id uuid not null,
   target_issue_id uuid not null,
   relation_type text not null check (relation_type in ('parent', 'blocks', 'related')),
   created_by uuid,
   created_at timestamptz not null default now(),
   constraint issue_relations_distinct_issues check (source_issue_id <> target_issue_id),
   constraint issue_relations_related_canonical check (
      relation_type <> 'related' or source_issue_id::text < target_issue_id::text
   ),
   constraint issue_relations_source_organization_fkey
      foreign key (source_issue_id, organization_id)
      references public.issues (id, organization_id) on delete cascade,
   constraint issue_relations_target_organization_fkey
      foreign key (target_issue_id, organization_id)
      references public.issues (id, organization_id) on delete cascade,
   constraint issue_relations_creator_organization_fkey
      foreign key (created_by, organization_id)
      references public.organization_members (user_id, organization_id)
      on delete set null (created_by),
   unique (organization_id, source_issue_id, target_issue_id, relation_type)
);

create unique index issue_relations_one_parent_per_child_idx
   on public.issue_relations (organization_id, target_issue_id)
   where relation_type = 'parent';
create index issue_relations_source_idx
   on public.issue_relations (organization_id, source_issue_id, relation_type);
create index issue_relations_target_idx
   on public.issue_relations (organization_id, target_issue_id, relation_type);
create index issue_relations_created_by_idx
   on public.issue_relations (created_by, organization_id)
   where created_by is not null;

create or replace function private.prevent_issue_parent_cycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
   if new.relation_type <> 'parent' then
      return new;
   end if;

   if exists (
      with recursive descendants(issue_id) as (
         select new.target_issue_id
         union
         select relation.target_issue_id
         from public.issue_relations relation
         join descendants current_level
           on relation.source_issue_id = current_level.issue_id
         where relation.organization_id = new.organization_id
           and relation.relation_type = 'parent'
      )
      select 1 from descendants where issue_id = new.source_issue_id
   ) then
      raise exception 'Issue parent relationship would create a cycle.' using errcode = '23514';
   end if;

   return new;
end;
$$;

revoke all on function private.prevent_issue_parent_cycle() from public, anon, authenticated;

create trigger issue_relations_prevent_parent_cycle
before insert or update of source_issue_id, target_issue_id, relation_type
on public.issue_relations
for each row execute function private.prevent_issue_parent_cycle();

alter table public.issue_relations enable row level security;

create policy issue_relations_select_members
on public.issue_relations
for select
to authenticated
using (private.is_org_member(organization_id));

create policy issue_relations_insert_writers
on public.issue_relations
for insert
to authenticated
with check (
   private.can_write_org(organization_id)
   and created_by = (select auth.uid())
);

create policy issue_relations_delete_writers
on public.issue_relations
for delete
to authenticated
using (private.can_write_org(organization_id));

revoke all on table public.issue_relations from anon, authenticated;
grant select, insert, delete on table public.issue_relations to authenticated;

commit;

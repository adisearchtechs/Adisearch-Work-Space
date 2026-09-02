begin;

create table public.issue_audit_events (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations (id) on delete cascade,
   issue_id uuid not null,
   actor_id uuid,
   actor_display_name text not null check (char_length(actor_display_name) between 1 and 120),
   event_type text not null check (
      event_type in (
         'created',
         'title_changed',
         'description_changed',
         'status_changed',
         'priority_changed',
         'assignee_changed',
         'project_changed',
         'cycle_changed',
         'due_date_changed',
         'relation_added',
         'relation_removed'
      )
   ),
   details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
   created_at timestamptz not null default now(),
   constraint issue_audit_events_issue_organization_fkey
      foreign key (issue_id, organization_id)
      references public.issues (id, organization_id) on delete cascade,
   constraint issue_audit_events_actor_organization_fkey
      foreign key (actor_id, organization_id)
      references public.organization_members (user_id, organization_id)
      on delete set null (actor_id)
);

create index issue_audit_events_issue_created_idx
   on public.issue_audit_events (issue_id, organization_id, created_at asc);
create index issue_audit_events_organization_created_idx
   on public.issue_audit_events (organization_id, created_at desc);
create index issue_audit_events_actor_idx
   on public.issue_audit_events (actor_id, organization_id)
   where actor_id is not null;

alter table public.issue_audit_events enable row level security;

create policy issue_audit_events_select_members
on public.issue_audit_events
for select
to authenticated
using (private.is_org_member(organization_id));

revoke all on table public.issue_audit_events from anon, authenticated;
grant select on table public.issue_audit_events to authenticated;

insert into public.issue_audit_events (
   organization_id,
   issue_id,
   actor_id,
   actor_display_name,
   event_type,
   details,
   created_at
)
select
   issue.organization_id,
   issue.id,
   issue.creator_id,
   coalesce(nullif(btrim(profile.display_name), ''), 'Workspace member'),
   'created',
   jsonb_build_object('title', issue.title),
   issue.created_at
from public.issues issue
left join public.profiles profile on profile.id = issue.creator_id;

create or replace function private.capture_issue_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
   audit_actor uuid;
   audit_actor_name text;
begin
   audit_actor := auth.uid();
   if tg_op = 'INSERT' and audit_actor is null then
      audit_actor := new.creator_id;
   end if;

   if audit_actor is not null then
      select coalesce(nullif(btrim(profile.display_name), ''), 'Workspace member')
      into audit_actor_name
      from public.profiles profile
      where profile.id = audit_actor;
   end if;
   audit_actor_name := coalesce(
      audit_actor_name,
      case when audit_actor is null then 'System' else 'Workspace member' end
   );

   if tg_op = 'INSERT' then
      insert into public.issue_audit_events (
         organization_id, issue_id, actor_id, actor_display_name, event_type, details
      ) values (
         new.organization_id,
         new.id,
         audit_actor,
         audit_actor_name,
         'created',
         jsonb_build_object('title', new.title)
      );
      return new;
   end if;

   if old.title is distinct from new.title then
      insert into public.issue_audit_events (
         organization_id, issue_id, actor_id, actor_display_name, event_type, details
      ) values (
         new.organization_id,
         new.id,
         audit_actor,
         audit_actor_name,
         'title_changed',
         jsonb_build_object('from', old.title, 'to', new.title)
      );
   end if;

   if old.description is distinct from new.description then
      insert into public.issue_audit_events (
         organization_id, issue_id, actor_id, actor_display_name, event_type, details
      ) values (
         new.organization_id,
         new.id,
         audit_actor,
         audit_actor_name,
         'description_changed',
         jsonb_build_object(
            'fromLength', char_length(old.description),
            'toLength', char_length(new.description)
         )
      );
   end if;

   if old.status_id is distinct from new.status_id then
      insert into public.issue_audit_events (
         organization_id, issue_id, actor_id, actor_display_name, event_type, details
      ) values (
         new.organization_id,
         new.id,
         audit_actor,
         audit_actor_name,
         'status_changed',
         jsonb_build_object(
            'from', jsonb_build_object(
               'id', old.status_id,
               'label', coalesce((
                  select status.name from public.statuses status
                  where status.id = old.status_id and status.organization_id = old.organization_id
               ), 'Unknown status')
            ),
            'to', jsonb_build_object(
               'id', new.status_id,
               'label', coalesce((
                  select status.name from public.statuses status
                  where status.id = new.status_id and status.organization_id = new.organization_id
               ), 'Unknown status')
            )
         )
      );
   end if;

   if old.priority is distinct from new.priority then
      insert into public.issue_audit_events (
         organization_id, issue_id, actor_id, actor_display_name, event_type, details
      ) values (
         new.organization_id,
         new.id,
         audit_actor,
         audit_actor_name,
         'priority_changed',
         jsonb_build_object('from', old.priority, 'to', new.priority)
      );
   end if;

   if old.assignee_id is distinct from new.assignee_id then
      insert into public.issue_audit_events (
         organization_id, issue_id, actor_id, actor_display_name, event_type, details
      ) values (
         new.organization_id,
         new.id,
         audit_actor,
         audit_actor_name,
         'assignee_changed',
         jsonb_build_object(
            'from', case when old.assignee_id is null then null else jsonb_build_object(
               'id', old.assignee_id,
               'label', coalesce((
                  select nullif(btrim(profile.display_name), '')
                  from public.profiles profile where profile.id = old.assignee_id
               ), 'Workspace member')
            ) end,
            'to', case when new.assignee_id is null then null else jsonb_build_object(
               'id', new.assignee_id,
               'label', coalesce((
                  select nullif(btrim(profile.display_name), '')
                  from public.profiles profile where profile.id = new.assignee_id
               ), 'Workspace member')
            ) end
         )
      );
   end if;

   if old.project_id is distinct from new.project_id then
      insert into public.issue_audit_events (
         organization_id, issue_id, actor_id, actor_display_name, event_type, details
      ) values (
         new.organization_id,
         new.id,
         audit_actor,
         audit_actor_name,
         'project_changed',
         jsonb_build_object(
            'from', case when old.project_id is null then null else jsonb_build_object(
               'id', old.project_id,
               'label', coalesce((
                  select project.name from public.projects project
                  where project.id = old.project_id and project.organization_id = old.organization_id
               ), 'Unknown project')
            ) end,
            'to', case when new.project_id is null then null else jsonb_build_object(
               'id', new.project_id,
               'label', coalesce((
                  select project.name from public.projects project
                  where project.id = new.project_id and project.organization_id = new.organization_id
               ), 'Unknown project')
            ) end
         )
      );
   end if;

   if old.cycle_id is distinct from new.cycle_id then
      insert into public.issue_audit_events (
         organization_id, issue_id, actor_id, actor_display_name, event_type, details
      ) values (
         new.organization_id,
         new.id,
         audit_actor,
         audit_actor_name,
         'cycle_changed',
         jsonb_build_object(
            'from', case when old.cycle_id is null then null else jsonb_build_object(
               'id', old.cycle_id,
               'label', coalesce((
                  select cycle.name from public.cycles cycle
                  where cycle.id = old.cycle_id and cycle.organization_id = old.organization_id
               ), 'Unknown cycle')
            ) end,
            'to', case when new.cycle_id is null then null else jsonb_build_object(
               'id', new.cycle_id,
               'label', coalesce((
                  select cycle.name from public.cycles cycle
                  where cycle.id = new.cycle_id and cycle.organization_id = new.organization_id
               ), 'Unknown cycle')
            ) end
         )
      );
   end if;

   if old.due_date is distinct from new.due_date then
      insert into public.issue_audit_events (
         organization_id, issue_id, actor_id, actor_display_name, event_type, details
      ) values (
         new.organization_id,
         new.id,
         audit_actor,
         audit_actor_name,
         'due_date_changed',
         jsonb_build_object('from', old.due_date, 'to', new.due_date)
      );
   end if;

   return new;
end;
$$;

revoke all on function private.capture_issue_audit_event() from public, anon, authenticated;

create trigger issues_capture_created_audit_event
after insert on public.issues
for each row execute function private.capture_issue_audit_event();

create trigger issues_capture_changed_audit_event
after update of title, description, status_id, priority, assignee_id, project_id, cycle_id, due_date
on public.issues
for each row execute function private.capture_issue_audit_event();

create or replace function private.capture_issue_relation_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
   relation_row public.issue_relations%rowtype;
   audit_event_type text;
   audit_actor uuid;
   audit_actor_name text;
   source_snapshot jsonb;
   target_snapshot jsonb;
begin
   if tg_op = 'INSERT' then
      relation_row := new;
      audit_event_type := 'relation_added';
      audit_actor := coalesce(auth.uid(), relation_row.created_by);
   else
      relation_row := old;
      audit_event_type := 'relation_removed';
      audit_actor := auth.uid();
   end if;

   if audit_actor is not null then
      select coalesce(nullif(btrim(profile.display_name), ''), 'Workspace member')
      into audit_actor_name
      from public.profiles profile
      where profile.id = audit_actor;
   end if;
   audit_actor_name := coalesce(
      audit_actor_name,
      case when audit_actor is null then 'System' else 'Workspace member' end
   );

   select jsonb_build_object(
      'id', issue.id,
      'identifier', team.issue_prefix || '-' || issue.issue_number,
      'title', issue.title
   )
   into source_snapshot
   from public.issues issue
   join public.teams team on team.id = issue.team_id and team.organization_id = issue.organization_id
   where issue.id = relation_row.source_issue_id
     and issue.organization_id = relation_row.organization_id;

   select jsonb_build_object(
      'id', issue.id,
      'identifier', team.issue_prefix || '-' || issue.issue_number,
      'title', issue.title
   )
   into target_snapshot
   from public.issues issue
   join public.teams team on team.id = issue.team_id and team.organization_id = issue.organization_id
   where issue.id = relation_row.target_issue_id
     and issue.organization_id = relation_row.organization_id;

   if source_snapshot is not null then
      insert into public.issue_audit_events (
         organization_id, issue_id, actor_id, actor_display_name, event_type, details
      ) values (
         relation_row.organization_id,
         relation_row.source_issue_id,
         audit_actor,
         audit_actor_name,
         audit_event_type,
         jsonb_build_object(
            'relationType', relation_row.relation_type,
            'direction', 'source',
            'relationId', relation_row.id,
            'counterparty', coalesce(
               target_snapshot,
               jsonb_build_object('id', relation_row.target_issue_id)
            )
         )
      );
   end if;

   if target_snapshot is not null then
      insert into public.issue_audit_events (
         organization_id, issue_id, actor_id, actor_display_name, event_type, details
      ) values (
         relation_row.organization_id,
         relation_row.target_issue_id,
         audit_actor,
         audit_actor_name,
         audit_event_type,
         jsonb_build_object(
            'relationType', relation_row.relation_type,
            'direction', 'target',
            'relationId', relation_row.id,
            'counterparty', coalesce(
               source_snapshot,
               jsonb_build_object('id', relation_row.source_issue_id)
            )
         )
      );
   end if;

   if tg_op = 'DELETE' then
      return old;
   end if;
   return new;
end;
$$;

revoke all on function private.capture_issue_relation_audit_event() from public, anon, authenticated;

create trigger issue_relations_capture_added_audit_event
after insert on public.issue_relations
for each row execute function private.capture_issue_relation_audit_event();

create trigger issue_relations_capture_removed_audit_event
before delete on public.issue_relations
for each row execute function private.capture_issue_relation_audit_event();

commit;

begin;

alter table public.project_milestones
add constraint project_milestones_issue_assignment_identity_key
unique (id, project_id, organization_id);

alter table public.issues
add column milestone_id uuid;

alter table public.issues
add constraint issues_milestone_requires_project_check
check (milestone_id is null or project_id is not null);

alter table public.issues
add constraint issues_milestone_project_organization_fkey
foreign key (milestone_id, project_id, organization_id)
references public.project_milestones (id, project_id, organization_id)
on delete set null (milestone_id);

create index issues_milestone_project_organization_idx
on public.issues (milestone_id, project_id, organization_id)
where milestone_id is not null;

alter table public.issue_audit_events
   drop constraint issue_audit_events_event_type_check;

alter table public.issue_audit_events
   add constraint issue_audit_events_event_type_check check (
      event_type in (
         'created',
         'title_changed',
         'description_changed',
         'status_changed',
         'priority_changed',
         'assignee_changed',
         'project_changed',
         'milestone_changed',
         'cycle_changed',
         'due_date_changed',
         'relation_added',
         'relation_removed'
      )
   );

create or replace function private.capture_issue_milestone_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
   audit_actor uuid;
   audit_actor_name text;
begin
   if old.milestone_id is not distinct from new.milestone_id then
      return new;
   end if;

   audit_actor := auth.uid();
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

   insert into public.issue_audit_events (
      organization_id,
      issue_id,
      actor_id,
      actor_display_name,
      event_type,
      details
   ) values (
      new.organization_id,
      new.id,
      audit_actor,
      audit_actor_name,
      'milestone_changed',
      jsonb_build_object(
         'from', case
            when old.milestone_id is null then null
            else jsonb_build_object(
               'id', old.milestone_id,
               'label', coalesce((
                  select milestone.name
                  from public.project_milestones milestone
                  where milestone.id = old.milestone_id
                    and milestone.organization_id = old.organization_id
               ), 'Removed milestone')
            )
         end,
         'to', case
            when new.milestone_id is null then null
            else jsonb_build_object(
               'id', new.milestone_id,
               'label', coalesce((
                  select milestone.name
                  from public.project_milestones milestone
                  where milestone.id = new.milestone_id
                    and milestone.organization_id = new.organization_id
               ), 'Unknown milestone')
            )
         end
      )
   );

   return new;
end;
$$;

revoke all on function private.capture_issue_milestone_audit_event()
from public, anon, authenticated;

create trigger issues_capture_milestone_audit_event
after update of milestone_id on public.issues
for each row execute function private.capture_issue_milestone_audit_event();

commit;

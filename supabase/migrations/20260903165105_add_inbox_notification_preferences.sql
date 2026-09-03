alter table public.user_preferences
  add column notify_issue_assignment boolean not null default true,
  add column notify_issue_status boolean not null default true;

create or replace function private.enqueue_issue_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  assignment_enabled boolean;
  status_enabled boolean;
  next_status_name text;
begin
  if new.assignee_id is distinct from old.assignee_id
     and new.assignee_id is not null
     and new.assignee_id is distinct from actor then
    assignment_enabled := coalesce(
      (select preferences.notify_issue_assignment
         from public.user_preferences preferences
        where preferences.user_id = new.assignee_id),
      true
    );

    if assignment_enabled then
      insert into public.notifications (
        organization_id, recipient_id, actor_id, issue_id, kind, content
      ) values (
        new.organization_id,
        new.assignee_id,
        actor,
        new.id,
        'assignment',
        'assigned this issue to you'
      );
    end if;
  end if;

  if new.status_id is distinct from old.status_id
     and new.assignee_id is not null
     and new.assignee_id is distinct from actor then
    status_enabled := coalesce(
      (select preferences.notify_issue_status
         from public.user_preferences preferences
        where preferences.user_id = new.assignee_id),
      true
    );

    if status_enabled then
      select status.name
        into next_status_name
        from public.statuses status
       where status.id = new.status_id
         and status.organization_id = new.organization_id;

      insert into public.notifications (
        organization_id, recipient_id, actor_id, issue_id, kind, content
      ) values (
        new.organization_id,
        new.assignee_id,
        actor,
        new.id,
        'status',
        'moved this issue to ' || coalesce(next_status_name, 'a new status')
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enqueue_issue_notifications() from public;

create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_id uuid not null,
  actor_id uuid references public.profiles(id) on delete set null,
  issue_id uuid,
  kind text not null check (kind in ('assignment', 'status')),
  content text not null default '' check (char_length(content) <= 1000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_recipient_organization_fkey
    foreign key (recipient_id, organization_id)
    references public.organization_members(user_id, organization_id)
    on delete cascade,
  constraint notifications_issue_organization_fkey
    foreign key (issue_id, organization_id)
    references public.issues(id, organization_id)
    on delete cascade
);

create index notifications_recipient_org_read_created_idx
  on public.notifications (recipient_id, organization_id, read_at, created_at desc);
create index notifications_issue_org_idx
  on public.notifications (issue_id, organization_id)
  where issue_id is not null;
create index notifications_actor_idx
  on public.notifications (actor_id)
  where actor_id is not null;

alter table public.notifications enable row level security;

create policy notifications_select_recipient
  on public.notifications
  for select
  to authenticated
  using (recipient_id = (select auth.uid()) and private.is_org_member(organization_id));

create policy notifications_update_recipient
  on public.notifications
  for update
  to authenticated
  using (recipient_id = (select auth.uid()) and private.is_org_member(organization_id))
  with check (recipient_id = (select auth.uid()) and private.is_org_member(organization_id));

create policy notifications_delete_recipient
  on public.notifications
  for delete
  to authenticated
  using (recipient_id = (select auth.uid()) and private.is_org_member(organization_id));

revoke all on public.notifications from anon, authenticated;
grant select, update, delete on public.notifications to authenticated;

create or replace function private.enqueue_issue_notifications()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  actor uuid := auth.uid();
  next_status_name text;
begin
  if new.assignee_id is distinct from old.assignee_id
     and new.assignee_id is not null
     and new.assignee_id is distinct from actor then
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

  if new.status_id is distinct from old.status_id
     and new.assignee_id is not null
     and new.assignee_id is distinct from actor then
    select s.name
      into next_status_name
      from public.statuses s
     where s.id = new.status_id
       and s.organization_id = new.organization_id;

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

  return new;
end;
$$;

revoke all on function private.enqueue_issue_notifications() from public;

create trigger issues_enqueue_notifications
  after update of assignee_id, status_id on public.issues
  for each row execute function private.enqueue_issue_notifications();

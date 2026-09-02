create table public.issue_subscriptions (
  issue_id uuid not null,
  user_id uuid not null,
  organization_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (issue_id, user_id),
  constraint issue_subscriptions_issue_organization_fkey
    foreign key (issue_id, organization_id)
    references public.issues(id, organization_id)
    on delete cascade,
  constraint issue_subscriptions_user_organization_fkey
    foreign key (user_id, organization_id)
    references public.organization_members(user_id, organization_id)
    on delete cascade
);

create index issue_subscriptions_user_org_created_idx
  on public.issue_subscriptions (user_id, organization_id, created_at desc);
create index issue_subscriptions_issue_org_idx
  on public.issue_subscriptions (issue_id, organization_id);

alter table public.issue_subscriptions enable row level security;

create policy issue_subscriptions_select_own
  on public.issue_subscriptions
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and private.is_org_member(organization_id)
  );

create policy issue_subscriptions_insert_own
  on public.issue_subscriptions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_org_member(organization_id)
  );

create policy issue_subscriptions_delete_own
  on public.issue_subscriptions
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and private.is_org_member(organization_id)
  );

revoke all on table public.issue_subscriptions from anon, authenticated;
grant select, insert, delete on table public.issue_subscriptions to authenticated;

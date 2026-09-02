create table public.issue_comments (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations(id) on delete cascade,
   issue_id uuid not null,
   author_id uuid null references public.profiles(id) on delete set null,
   body text not null check (char_length(btrim(body)) between 1 and 10000),
   created_at timestamptz not null default now(),
   constraint issue_comments_issue_organization_fkey foreign key (issue_id, organization_id)
      references public.issues(id, organization_id) on delete cascade,
   constraint issue_comments_author_organization_fkey foreign key (author_id, organization_id)
      references public.organization_members(user_id, organization_id)
      on delete set null (author_id)
);

create index issue_comments_issue_created_idx
   on public.issue_comments (issue_id, organization_id, created_at asc);
create index issue_comments_organization_created_idx
   on public.issue_comments (organization_id, created_at desc);
create index issue_comments_author_idx
   on public.issue_comments (author_id) where author_id is not null;

alter table public.issue_comments enable row level security;

create policy issue_comments_select_members on public.issue_comments
for select to authenticated
using (private.is_org_member(organization_id));

create policy issue_comments_insert_writers on public.issue_comments
for insert to authenticated
with check (
   private.can_write_org(organization_id)
   and author_id = (select auth.uid())
);

revoke all on table public.issue_comments from anon, authenticated;
grant select, insert on table public.issue_comments to authenticated;

create table public.reviews (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null references public.organizations(id) on delete cascade,
   created_by uuid not null,
   issue_id uuid,
   title text not null check (char_length(title) between 1 and 240),
   body text not null default '' check (char_length(body) <= 20000),
   status text not null default 'open' check (status in ('open','approved','closed')),
   external_provider text check (external_provider is null or external_provider in ('github')),
   external_url text check (external_url is null or (char_length(external_url) <= 2048 and external_url ~ '^https?://')),
   repository text check (repository is null or char_length(repository) <= 200),
   external_number integer check (external_number is null or external_number > 0),
   target_ref text not null default '' check (char_length(target_ref) <= 200),
   source_ref text not null default '' check (char_length(source_ref) <= 200),
   test_plan text not null default '' check (char_length(test_plan) <= 10000),
   checks_passed integer not null default 0 check (checks_passed >= 0),
   checks_total integer not null default 0 check (checks_total >= 0 and checks_passed <= checks_total),
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   unique (id, organization_id),
   constraint reviews_created_by_organization_fkey
      foreign key (created_by, organization_id)
      references public.organization_members(user_id, organization_id)
      on delete restrict,
   constraint reviews_issue_organization_fkey
      foreign key (issue_id, organization_id)
      references public.issues(id, organization_id)
      on delete set null (issue_id)
);

create index reviews_org_created_idx on public.reviews (organization_id, created_at desc);
create index reviews_creator_org_updated_idx on public.reviews (created_by, organization_id, updated_at desc);
create index reviews_issue_org_idx on public.reviews (issue_id, organization_id) where issue_id is not null;

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function private.set_updated_at();

create table public.review_reviewers (
   review_id uuid not null,
   organization_id uuid not null,
   user_id uuid not null,
   assigned_by uuid references public.profiles(id) on delete set null,
   verdict text not null default 'pending' check (verdict in ('pending','approved','changes_requested')),
   assigned_at timestamptz not null default now(),
   responded_at timestamptz,
   primary key (review_id, user_id),
   constraint review_reviewers_review_organization_fkey
      foreign key (review_id, organization_id)
      references public.reviews(id, organization_id)
      on delete cascade,
   constraint review_reviewers_user_organization_fkey
      foreign key (user_id, organization_id)
      references public.organization_members(user_id, organization_id)
      on delete cascade
);

create index review_reviewers_user_org_assigned_idx on public.review_reviewers (user_id, organization_id, assigned_at desc);
create index review_reviewers_review_org_idx on public.review_reviewers (review_id, organization_id);
create index review_reviewers_assigned_by_idx on public.review_reviewers (assigned_by) where assigned_by is not null;

create table public.review_comments (
   id uuid primary key default extensions.gen_random_uuid(),
   organization_id uuid not null,
   review_id uuid not null,
   author_id uuid references public.profiles(id) on delete set null,
   body text not null check (char_length(body) between 1 and 10000),
   created_at timestamptz not null default now(),
   updated_at timestamptz not null default now(),
   constraint review_comments_review_organization_fkey
      foreign key (review_id, organization_id)
      references public.reviews(id, organization_id)
      on delete cascade
);

create index review_comments_review_org_created_idx on public.review_comments (review_id, organization_id, created_at);
create index review_comments_author_idx on public.review_comments (author_id) where author_id is not null;

create trigger review_comments_set_updated_at
before update on public.review_comments
for each row execute function private.set_updated_at();

alter table public.reviews enable row level security;
alter table public.review_reviewers enable row level security;
alter table public.review_comments enable row level security;

create policy reviews_select_members on public.reviews for select to authenticated
using (private.is_org_member(organization_id));
create policy reviews_insert_creator on public.reviews for insert to authenticated
with check (created_by = (select auth.uid()) and private.can_write_org(organization_id));
create policy reviews_update_creator on public.reviews for update to authenticated
using (created_by = (select auth.uid()) and private.can_write_org(organization_id))
with check (created_by = (select auth.uid()) and private.can_write_org(organization_id));
create policy reviews_delete_creator on public.reviews for delete to authenticated
using (created_by = (select auth.uid()) and private.can_write_org(organization_id));

create policy review_reviewers_select_members on public.review_reviewers for select to authenticated
using (private.is_org_member(organization_id));
create policy review_reviewers_insert_creator on public.review_reviewers for insert to authenticated
with check (
   private.can_write_org(organization_id)
   and exists (
      select 1 from public.reviews r
      where r.id = review_id and r.organization_id = organization_id and r.created_by = (select auth.uid())
   )
);
create policy review_reviewers_update_self on public.review_reviewers for update to authenticated
using (user_id = (select auth.uid()) and private.is_org_member(organization_id))
with check (user_id = (select auth.uid()) and private.is_org_member(organization_id));
create policy review_reviewers_delete_creator on public.review_reviewers for delete to authenticated
using (
   private.can_write_org(organization_id)
   and exists (
      select 1 from public.reviews r
      where r.id = review_id and r.organization_id = organization_id and r.created_by = (select auth.uid())
   )
);

create policy review_comments_select_members on public.review_comments for select to authenticated
using (private.is_org_member(organization_id));
create policy review_comments_insert_writers on public.review_comments for insert to authenticated
with check (author_id = (select auth.uid()) and private.can_write_org(organization_id));
create policy review_comments_update_author on public.review_comments for update to authenticated
using (author_id = (select auth.uid()) and private.can_write_org(organization_id))
with check (author_id = (select auth.uid()) and private.can_write_org(organization_id));
create policy review_comments_delete_author on public.review_comments for delete to authenticated
using (author_id = (select auth.uid()) and private.can_write_org(organization_id));

revoke all on table public.reviews from anon;
revoke all on table public.review_reviewers from anon;
revoke all on table public.review_comments from anon;

revoke all on table public.reviews from authenticated;
grant select, insert, delete on table public.reviews to authenticated;
grant update (title, body, status, issue_id, external_provider, external_url, repository, external_number, target_ref, source_ref, test_plan, checks_passed, checks_total)
   on table public.reviews to authenticated;

revoke all on table public.review_reviewers from authenticated;
grant select, insert, delete on table public.review_reviewers to authenticated;
grant update (verdict, responded_at) on table public.review_reviewers to authenticated;

revoke all on table public.review_comments from authenticated;
grant select, insert, delete on table public.review_comments to authenticated;
grant update (body) on table public.review_comments to authenticated;

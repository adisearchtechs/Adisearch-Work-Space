alter table public.saved_views
   add constraint saved_views_organization_id_fkey
   foreign key (organization_id)
   references public.organizations(id)
   on delete cascade;

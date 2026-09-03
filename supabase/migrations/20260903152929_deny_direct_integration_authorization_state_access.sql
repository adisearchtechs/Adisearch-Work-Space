create policy integration_authorization_states_no_direct_access
on public.integration_authorization_states
for all
to authenticated
using (false)
with check (false);

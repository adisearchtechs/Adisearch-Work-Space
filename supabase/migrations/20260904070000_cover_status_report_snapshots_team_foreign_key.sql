create index status_report_snapshots_team_org_idx
   on public.status_report_snapshots (team_id, organization_id)
   where team_id is not null;

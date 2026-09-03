# Phase 31 — Project Milestone Issue Assignment

## Goal

Turn existing persistent project milestones into actionable planning units by allowing issues to be assigned to a milestone that belongs to the same project and workspace.

## Included

- Persist one optional milestone assignment per issue.
- Enforce that assigned milestones belong to the issue's selected project and organization.
- Safely unassign issues when a milestone is deleted.
- Create issues directly inside a selected project milestone.
- Assign, change, or clear a milestone from configured issue details.
- Automatically clear the milestone when an issue moves to another project.
- Preserve demo-mode mock milestone copy without leaking it into configured workspaces.
- Record milestone assignment changes in immutable issue Activity.
- Keep guest users read-only in the milestone selector.

## Existing capability reused

Project milestone CRUD, ordering, target dates, completion state, RLS, and project-level milestone navigation already exist and remain the source of truth. Phase 31 extends that model instead of creating a parallel milestone system.

## Security and integrity

- Existing issue RLS remains authoritative for issue writes.
- A composite foreign key binds `issues.milestone_id` to the same `project_id` and `organization_id`.
- An issue cannot carry a milestone without a project.
- API validation fails closed for cross-project or cross-workspace assignments.
- Milestone deletion uses `ON DELETE SET NULL (milestone_id)` so issues survive and remain in their project.

## Deferred

- Milestone-specific board/timeline views.
- Bulk issue assignment from the project milestone page.
- Milestone capacity forecasting and burn-up analytics.
- Cross-project milestones.

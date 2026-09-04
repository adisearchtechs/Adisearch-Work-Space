import { z } from 'zod';
import type { TeamDashboardResponse } from '@/lib/team-dashboard/contracts';
import type { WorkspaceDashboardResponse } from '@/lib/workspace-dashboard/contracts';
import type { WorkspaceDependenciesResponse } from '@/lib/workspace-dependencies/contracts';

export type StatusReportSnapshotScope = 'workspace' | 'team';

export type WorkspaceStatusReportSnapshotPayload = {
   kind: 'workspace';
   schemaVersion: 1;
   dashboard: WorkspaceDashboardResponse;
   dependencies: WorkspaceDependenciesResponse;
};

export type TeamStatusReportSnapshotPayload = {
   kind: 'team';
   schemaVersion: 1;
   teamId: string;
   dashboard: TeamDashboardResponse;
   dependencies: WorkspaceDependenciesResponse;
};

export type StatusReportSnapshotPayload =
   | WorkspaceStatusReportSnapshotPayload
   | TeamStatusReportSnapshotPayload;

export type StatusReportSnapshotDto = {
   id: string;
   scope: StatusReportSnapshotScope;
   teamId: string | null;
   createdBy: string;
   schemaVersion: 1;
   generatedAt: string;
   createdAt: string;
   payload: StatusReportSnapshotPayload;
};

export type StatusReportSnapshotsResponse = {
   snapshots: StatusReportSnapshotDto[];
};

export const createStatusReportSnapshotSchema = z
   .object({
      scope: z.enum(['workspace', 'team']),
      teamId: z.string().uuid().optional(),
   })
   .superRefine((value, context) => {
      if (value.scope === 'team' && !value.teamId) {
         context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['teamId'],
            message: 'A team snapshot requires a teamId.',
         });
      }
      if (value.scope === 'workspace' && value.teamId) {
         context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['teamId'],
            message: 'A workspace snapshot cannot include a teamId.',
         });
      }
   });

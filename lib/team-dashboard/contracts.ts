export type TeamDashboardHealth = 'on-track' | 'at-risk' | 'off-track';
export type TeamDashboardAttentionReason = 'blocked' | 'overdue' | 'urgent' | 'due-soon';

export type TeamDashboardCycleDto = {
   id: string;
   name: string;
   startDate: string;
   endDate: string;
   scope: number;
   started: number;
   completed: number;
   canceled: number;
   successRate: number;
};

export type TeamDashboardIssueDto = {
   id: string;
   identifier: string;
   title: string;
   priority: 'no-priority' | 'low' | 'medium' | 'high' | 'urgent';
   dueDate: string | null;
   statusName: string;
   statusCategory: 'triage' | 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled';
   project: { id: string; name: string } | null;
   reason: TeamDashboardAttentionReason;
};

export type TeamDashboardProjectDto = {
   id: string;
   name: string;
   status: 'planned' | 'active' | 'paused' | 'completed' | 'canceled';
   targetDate: string | null;
   health: TeamDashboardHealth | null;
   healthUpdatedAt: string | null;
   issueCount: number;
   completedIssueCount: number;
   progress: number;
};

export type TeamDashboardResponse = {
   generatedAt: string;
   currentCycle: TeamDashboardCycleDto | null;
   work: {
      total: number;
      active: number;
      completed: number;
      blocked: number;
      urgent: number;
      overdue: number;
      dueSoon: number;
      attention: number;
   };
   attention: TeamDashboardIssueDto[];
   projects: TeamDashboardProjectDto[];
};

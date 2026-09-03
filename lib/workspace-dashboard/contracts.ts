export type WorkspaceDashboardHealth = 'on-track' | 'at-risk' | 'off-track';
export type WorkspaceDashboardAttentionReason = 'blocked' | 'overdue' | 'urgent' | 'due-soon';
export type WorkspaceDashboardStatusCategory =
   | 'triage'
   | 'backlog'
   | 'unstarted'
   | 'started'
   | 'completed'
   | 'canceled';

export type WorkspaceDashboardTeamDto = {
   id: string;
   key: string;
   name: string;
   color: string;
};

export type WorkspaceDashboardIssueDto = {
   id: string;
   identifier: string;
   title: string;
   priority: 'no-priority' | 'low' | 'medium' | 'high' | 'urgent';
   dueDate: string | null;
   statusName: string;
   statusCategory: WorkspaceDashboardStatusCategory;
   reason: WorkspaceDashboardAttentionReason;
   team: WorkspaceDashboardTeamDto;
   project: { id: string; name: string } | null;
};

export type WorkspaceDashboardMilestoneDto = {
   id: string;
   projectId: string;
   projectName: string;
   name: string;
   targetDate: string | null;
   completed: boolean;
   issueCount: number;
   completedIssueCount: number;
   progress: number;
   overdue: boolean;
   team: WorkspaceDashboardTeamDto;
};

export type WorkspaceDashboardProjectDto = {
   id: string;
   name: string;
   status: 'planned' | 'active' | 'paused' | 'completed' | 'canceled';
   targetDate: string | null;
   health: WorkspaceDashboardHealth | null;
   healthUpdatedAt: string | null;
   issueCount: number;
   completedIssueCount: number;
   progress: number;
   milestoneCount: number;
   completedMilestoneCount: number;
   nextMilestone: { id: string; name: string; targetDate: string | null } | null;
   team: WorkspaceDashboardTeamDto;
};

export type WorkspaceDashboardInitiativeDto = {
   id: string;
   name: string;
   icon: string;
   status: 'active' | 'planned' | 'completed';
   priority: 'no-priority' | 'urgent' | 'high' | 'medium' | 'low';
   target: string | null;
   health: WorkspaceDashboardHealth | null;
   healthUpdatedAt: string | null;
   projectCount: number;
   progress: number;
};

export type WorkspaceDashboardResponse = {
   generatedAt: string;
   summary: {
      teams: number;
      projects: number;
      initiatives: number;
      activeIssues: number;
      completedIssues: number;
      attention: number;
   };
   portfolio: {
      activeProjects: number;
      atRiskProjects: number;
      offTrackProjects: number;
      openMilestones: number;
      overdueMilestones: number;
   };
   attention: WorkspaceDashboardIssueDto[];
   projects: WorkspaceDashboardProjectDto[];
   milestones: WorkspaceDashboardMilestoneDto[];
   initiatives: WorkspaceDashboardInitiativeDto[];
};

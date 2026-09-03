export type WorkspaceDependencyStatusCategory =
   | 'triage'
   | 'backlog'
   | 'unstarted'
   | 'started'
   | 'completed'
   | 'canceled';

export type WorkspaceDependencyTeamDto = {
   id: string;
   name: string;
   color: string;
};

export type WorkspaceDependencyProjectRef = {
   id: string;
   name: string;
};

export type WorkspaceDependencyIssueDto = {
   id: string;
   identifier: string;
   title: string;
   statusName: string;
   statusCategory: WorkspaceDependencyStatusCategory;
   dueDate: string | null;
   team: WorkspaceDependencyTeamDto;
   project: WorkspaceDependencyProjectRef | null;
};

export type WorkspaceDependencyEdgeDto = {
   id: string;
   createdAt: string;
   blocking: WorkspaceDependencyIssueDto;
   blocked: WorkspaceDependencyIssueDto;
   crossProject: boolean;
   overdueBlocked: boolean;
};

export type WorkspaceDependencyProjectDto = {
   id: string;
   name: string;
   team: WorkspaceDependencyTeamDto;
   inboundDependencies: number;
   outboundDependencies: number;
   overdueBlockedIssues: number;
   blockedByProjects: WorkspaceDependencyProjectRef[];
   blocksProjects: WorkspaceDependencyProjectRef[];
};

export type WorkspaceDependenciesResponse = {
   generatedAt: string;
   summary: {
      unresolvedDependencies: number;
      crossProjectDependencies: number;
      projectlessDependencies: number;
      projectsBlocked: number;
      blockingProjects: number;
      overdueBlockedIssues: number;
   };
   projects: WorkspaceDependencyProjectDto[];
   dependencies: WorkspaceDependencyEdgeDto[];
};

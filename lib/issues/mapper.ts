'use client';

import type { IssueDto } from '@/lib/issues/contracts';
import type { Issue } from '@/mock-data/issues';
import type { Project } from '@/mock-data/projects';
import { priorities } from '@/mock-data/priorities';
import { status } from '@/mock-data/status';

export function issueDtoToIssue(dto: IssueDto, projectById: ReadonlyMap<string, Project>): Issue {
   return {
      id: dto.id,
      identifier: dto.identifier,
      title: dto.title,
      description: dto.description,
      status:
         status.find((item) => item.id === dto.statusId) ??
         status.find((item) => item.id === 'to-do')!,
      priority:
         priorities.find((item) => item.id === dto.priorityId) ??
         priorities.find((item) => item.id === 'no-priority')!,
      assignee: dto.assignee
         ? {
              id: dto.assignee.id,
              name: dto.assignee.displayName,
              avatarUrl:
                 dto.assignee.avatarUrl ??
                 `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(dto.assignee.id)}`,
              email: '',
              status: 'offline',
              role: 'Member',
              joinedDate: dto.createdAt,
              teamIds: [],
              timezone: 'UTC',
           }
         : null,
      labels: [],
      creatorId: dto.creatorId,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
      cycleId: dto.cycleId,
      rank: dto.rank,
      dueDate: dto.dueDate,
      project: dto.projectId ? projectById.get(dto.projectId) : undefined,
      milestoneId: dto.milestoneId,
      subissues: [],
   };
}

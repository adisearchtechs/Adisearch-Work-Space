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
      assignee: null,
      labels: [],
      createdAt: dto.createdAt,
      cycleId: dto.cycleId,
      rank: dto.rank,
      dueDate: dto.dueDate,
      project: dto.projectId ? projectById.get(dto.projectId) : undefined,
      subissues: [],
   };
}

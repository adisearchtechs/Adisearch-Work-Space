'use client';

import type { IssueDto } from '@/lib/issues/contracts';
import type { Issue } from '@/mock-data/issues';
import { priorities } from '@/mock-data/priorities';
import { status } from '@/mock-data/status';

export function issueDtoToIssue(dto: IssueDto): Issue {
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
      subissues: [],
   };
}

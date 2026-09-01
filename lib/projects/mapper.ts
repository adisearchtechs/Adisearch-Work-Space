'use client';

import { Cuboid } from 'lucide-react';
import type { ProjectDto, ProjectStatus } from '@/lib/projects/contracts';
import { health, type Project } from '@/mock-data/projects';
import { priorities } from '@/mock-data/priorities';
import { status } from '@/mock-data/status';
import type { User } from '@/mock-data/users';

const statusIdByProjectStatus: Record<ProjectStatus, string> = {
   planned: 'to-do',
   active: 'in-progress',
   paused: 'paused',
   completed: 'done',
   canceled: 'canceled',
};

const healthIdByProjectStatus: Record<ProjectStatus, Project['health']['id']> = {
   planned: 'no-update',
   active: 'on-track',
   paused: 'at-risk',
   completed: 'on-track',
   canceled: 'off-track',
};

function projectLead(dto: ProjectDto): User {
   if (!dto.lead) {
      return {
         id: 'unassigned',
         name: 'Unassigned',
         avatarUrl: '',
         email: '',
         status: 'offline',
         role: 'Member',
         joinedDate: dto.createdAt,
         teamIds: [dto.teamKey],
         timezone: 'UTC',
      };
   }

   return {
      id: dto.lead.id,
      name: dto.lead.displayName,
      avatarUrl:
         dto.lead.avatarUrl ??
         `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(dto.lead.id)}`,
      email: '',
      status: 'offline',
      role: 'Member',
      joinedDate: dto.lead.joinedAt,
      teamIds: [dto.teamKey],
      timezone: dto.lead.timezone,
   };
}

export function projectDtoToProject(dto: ProjectDto): Project {
   const mappedStatus = status.find((item) => item.id === statusIdByProjectStatus[dto.status]);
   const mappedHealth = health.find((item) => item.id === healthIdByProjectStatus[dto.status]);

   return {
      id: dto.id,
      name: dto.name,
      status: mappedStatus ?? status.find((item) => item.id === 'to-do')!,
      icon: Cuboid,
      percentComplete: dto.status === 'completed' ? 100 : 0,
      startDate: dto.createdAt.slice(0, 10),
      targetDate: dto.targetDate ?? undefined,
      lead: projectLead(dto),
      priority: priorities.find((item) => item.id === 'no-priority')!,
      health: mappedHealth ?? health.find((item) => item.id === 'no-update')!,
      teamId: dto.teamKey,
      labels: [],
   };
}

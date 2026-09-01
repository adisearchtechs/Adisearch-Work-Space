'use client';

import { Cuboid } from 'lucide-react';
import type { ProjectDto, ProjectStatus, ProjectUpdate } from '@/lib/projects/contracts';
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

const projectStatusByStatusId: Record<string, ProjectStatus> = Object.fromEntries(
   Object.entries(statusIdByProjectStatus).map(([projectStatus, statusId]) => [
      statusId,
      projectStatus,
   ])
) as Record<string, ProjectStatus>;

function statusFields(projectStatus: ProjectStatus) {
   return {
      status:
         status.find((item) => item.id === statusIdByProjectStatus[projectStatus]) ??
         status.find((item) => item.id === 'to-do')!,
      health:
         health.find((item) => item.id === healthIdByProjectStatus[projectStatus]) ??
         health.find((item) => item.id === 'no-update')!,
      percentComplete: projectStatus === 'completed' ? 100 : 0,
   };
}

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
   return {
      id: dto.id,
      name: dto.name,
      ...statusFields(dto.status),
      icon: Cuboid,
      startDate: dto.createdAt.slice(0, 10),
      targetDate: dto.targetDate ?? undefined,
      lead: projectLead(dto),
      priority: priorities.find((item) => item.id === 'no-priority')!,
      teamId: dto.teamKey,
      labels: [],
   };
}

export function projectToProjectStatus(project: Project): ProjectStatus {
   return projectStatusByStatusId[project.status.id] ?? 'planned';
}

export function applyProjectUpdate(project: Project, changes: ProjectUpdate): Project {
   return {
      ...project,
      ...(changes.name !== undefined && { name: changes.name }),
      ...(changes.targetDate !== undefined && {
         targetDate: changes.targetDate ?? undefined,
      }),
      ...(changes.status !== undefined && statusFields(changes.status)),
   };
}

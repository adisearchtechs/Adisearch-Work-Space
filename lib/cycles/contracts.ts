import { z } from 'zod';

const cycleDateSchema = z.string().date();

export const createCycleSchema = z
   .object({
      name: z.string().trim().min(1).max(120),
      startDate: cycleDateSchema,
      endDate: cycleDateSchema,
   })
   .strict()
   .refine((value) => value.endDate >= value.startDate, {
      message: 'Cycle end date must be on or after the start date.',
      path: ['endDate'],
   });

export const updateCycleSchema = z
   .object({
      name: z.string().trim().min(1).max(120).optional(),
      startDate: cycleDateSchema.optional(),
      endDate: cycleDateSchema.optional(),
   })
   .strict()
   .refine((value) => Object.keys(value).length > 0, 'At least one cycle field is required.');

export const cycleAssignmentSchema = z
   .object({
      issueId: z.string().uuid(),
      cycleId: z.string().uuid().nullable(),
   })
   .strict();

export type CycleStatus = 'upcoming' | 'current' | 'completed';
export type CycleIssueStatusCategory =
   | 'triage'
   | 'backlog'
   | 'unstarted'
   | 'started'
   | 'completed'
   | 'canceled';

export type CycleIssueDto = {
   id: string;
   identifier: string;
   title: string;
   statusCategory: CycleIssueStatusCategory;
};

export type CycleDto = {
   id: string;
   name: string;
   teamId: string;
   startDate: string;
   endDate: string;
   createdAt: string;
   updatedAt: string;
   status: CycleStatus;
   scope: number;
   started: number;
   completed: number;
   canceled: number;
   successRate: number;
   issues: CycleIssueDto[];
};

export type CyclesCollectionResponse = {
   team: {
      id: string;
      name: string;
      key: string;
      issuePrefix: string;
      color: string;
   };
   cycles: CycleDto[];
   backlogIssues: CycleIssueDto[];
   canWrite: boolean;
};

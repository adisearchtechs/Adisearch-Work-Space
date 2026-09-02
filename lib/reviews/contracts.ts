import { z } from 'zod';

export const reviewStatusSchema = z.enum(['open', 'approved', 'closed']);
export const reviewVerdictSchema = z.enum(['pending', 'approved', 'changes_requested']);

const optionalText = (max: number) => z.string().trim().max(max).optional().default('');

const externalUrlSchema = z
   .string()
   .trim()
   .max(2048)
   .optional()
   .default('')
   .refine((value) => {
      if (!value) return true;
      try {
         const url = new URL(value);
         return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
         return false;
      }
   }, 'External URL must use HTTP or HTTPS.');

export const createReviewSchema = z
   .object({
      title: z.string().trim().min(1).max(240),
      body: z.string().max(20000).optional().default(''),
      issueId: z.string().uuid().nullable().optional(),
      externalUrl: externalUrlSchema,
      repository: z.string().trim().max(200).optional().default(''),
      externalNumber: z.number().int().positive().nullable().optional(),
      targetRef: optionalText(200),
      sourceRef: optionalText(200),
      testPlan: z.string().max(10000).optional().default(''),
      checksPassed: z.number().int().min(0).optional().default(0),
      checksTotal: z.number().int().min(0).optional().default(0),
   })
   .strict()
   .refine((value) => value.checksPassed <= value.checksTotal, {
      message: 'Passed checks cannot exceed total checks.',
      path: ['checksPassed'],
   });

export const updateReviewSchema = z
   .object({
      title: z.string().trim().min(1).max(240).optional(),
      body: z.string().max(20000).optional(),
      status: reviewStatusSchema.optional(),
      issueId: z.string().uuid().nullable().optional(),
      externalUrl: externalUrlSchema.optional(),
      repository: z.string().trim().max(200).optional(),
      externalNumber: z.number().int().positive().nullable().optional(),
      targetRef: z.string().trim().max(200).optional(),
      sourceRef: z.string().trim().max(200).optional(),
      testPlan: z.string().max(10000).optional(),
      checksPassed: z.number().int().min(0).optional(),
      checksTotal: z.number().int().min(0).optional(),
   })
   .strict()
   .refine((value) => Object.keys(value).length > 0, 'No supported changes supplied.');

export const assignReviewerSchema = z.object({ userId: z.string().uuid() }).strict();
export const updateReviewerVerdictSchema = z.object({ verdict: reviewVerdictSchema.exclude(['pending']) }).strict();
export const createReviewCommentSchema = z.object({ body: z.string().trim().min(1).max(10000) }).strict();

export type ReviewMemberDto = {
   id: string;
   displayName: string;
   avatarUrl: string | null;
};

export type ReviewReviewerDto = {
   user: ReviewMemberDto;
   verdict: z.infer<typeof reviewVerdictSchema>;
   assignedAt: string;
   respondedAt: string | null;
};

export type ReviewCommentDto = {
   id: string;
   body: string;
   createdAt: string;
   updatedAt: string;
   author: ReviewMemberDto | null;
};

export type ReviewDto = {
   id: string;
   title: string;
   body: string;
   status: z.infer<typeof reviewStatusSchema>;
   createdBy: ReviewMemberDto;
   createdAt: string;
   updatedAt: string;
   issue: { id: string; identifier: string; title: string } | null;
   externalProvider: 'github' | null;
   externalUrl: string | null;
   repository: string | null;
   externalNumber: number | null;
   targetRef: string;
   sourceRef: string;
   testPlan: string;
   checksPassed: number;
   checksTotal: number;
   reviewers: ReviewReviewerDto[];
   comments: ReviewCommentDto[];
   canEdit: boolean;
};

export type ReviewListScope = 'for-you' | 'created';

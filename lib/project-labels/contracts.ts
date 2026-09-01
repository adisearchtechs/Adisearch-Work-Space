import { z } from 'zod';

export const assignProjectLabelSchema = z
   .object({ labelId: z.string().uuid() })
   .strict();

export type ProjectLabelDto = {
   id: string;
   name: string;
   color: string;
};

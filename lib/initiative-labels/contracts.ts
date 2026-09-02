import { z } from 'zod';

export const assignInitiativeLabelSchema = z
   .object({ labelId: z.string().uuid() })
   .strict();

export type InitiativeLabelDto = {
   id: string;
   name: string;
   color: string;
};

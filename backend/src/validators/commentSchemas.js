import { z } from 'zod';

export const createCommentSchema = z.object({
  params: z.object({
    postId: z.string().min(1)
  }),
  body: z.object({
    body: z.string().trim().min(2).max(800)
  })
});

export const commentIdSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

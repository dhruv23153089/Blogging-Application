import { z } from 'zod';

const status = z.enum(['draft', 'published']).default('published');
const tags = z
  .array(z.string().trim().min(1).max(30))
  .max(8)
  .default([]);

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(160),
    excerpt: z.string().trim().min(10).max(260),
    content: z.string().trim().min(20),
    coverImage: z.string().trim().url().optional().or(z.literal('')),
    tags,
    status
  })
});

export const updatePostSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    title: z.string().trim().min(3).max(160).optional(),
    excerpt: z.string().trim().min(10).max(260).optional(),
    content: z.string().trim().min(20).optional(),
    coverImage: z.string().trim().url().optional().or(z.literal('')),
    tags: tags.optional(),
    status: status.optional()
  })
});

export const listPostsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(24).default(6),
    search: z.string().trim().default(''),
    tag: z.string().trim().default(''),
    mine: z.enum(['true', 'false']).optional()
  })
});

export const idParamSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

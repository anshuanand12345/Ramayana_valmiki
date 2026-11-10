import { z } from 'zod';

export const chatSchema = z.object({
  message: z.string().trim().min(3, 'Please describe your question in a few words.').max(2000),
  // Recent turns only; the client keeps the transcript, the API stays stateless.
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(8000) }))
    .max(6)
    .default([]),
});

export const searchSchema = z.object({
  query: z.string().trim().min(2).max(500),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

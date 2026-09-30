import { z } from "zod";

export const workspacesSchemas = z.object({
  name: z.string().trim().min(3).max(50),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/)
    .min(3)
    .max(50),
});

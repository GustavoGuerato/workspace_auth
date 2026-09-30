import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(16),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(50),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(50),
});

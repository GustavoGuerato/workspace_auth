import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce
    .number()
    .int()
    .min(1, { message: "PORT must be greater than 0" })
    .max(65535, { message: "PORT must be less than or equal to 65535" }),

  JWT_SECRET: z.string().trim().min(1, {
    message: "JWT_SECRET is required",
  }),

  DATABASE_URL: z
    .string()
    .trim()
    .min(1, { message: "DATABASE_URL is required" })
    .url({ message: "DATABASE_URL must be a valid URL" }),

  FRONTEND_ORIGIN: z
    .string()
    .trim()
    .min(1, { message: "FRONTEND_ORIGIN is required" })
    .url({ message: "FRONTEND_ORIGIN must be a valid URL" }),
});

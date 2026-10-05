import { envSchema } from "../schemas/env.schema.js";

export const env = envSchema.parse(process.env);

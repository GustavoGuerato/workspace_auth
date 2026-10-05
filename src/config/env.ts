import dotenv from "dotenv";
import { envSchema } from "../schemas/env.schema.js";

dotenv.config();

export const env = envSchema.parse(process.env);

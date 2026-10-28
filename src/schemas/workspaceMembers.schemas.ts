import { z } from "zod";

export const workspaceIdParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});
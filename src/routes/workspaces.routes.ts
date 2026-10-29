
import { Router } from "express";
import requireAuth from "../middlewares/requireAuth";
import {
  workspaceController,
  getUserWorkspacesController,
  getWorkspaceMembersController,
} from "../controllers/workspace.Controller";
import { requireRole } from "../middlewares/requireRole";
import { validate } from "../middlewares/validate";
import { createWorkspaceSchema } from "../schemas/workspaces.schemas";
import { validateParams } from "../middlewares/validateParams";
import { workspaceIdParamsSchema } from "../schemas/workspaceMembers.schemas";

const router = Router();

router.get(
  "/:workspaceId/members",
  requireAuth,
  validateParams(workspaceIdParamsSchema),
  requireRole("owner", "admin", "member", "viewer"),
  getWorkspaceMembersController,
);

router.get("/:id", (_req, res) => {
  res.status(501).json({ message: "not implemented" });
});

router.post(
  "/",
  requireAuth,
  validate(createWorkspaceSchema),
  workspaceController,
);

router.patch(
  "/:workspaceId",
  requireAuth,
  requireRole("owner", "admin"),
  (_req, res) => {
    res.status(200).json({
      message: "Access granted",
    });
  },
);

router.delete("/:id", (_req, res) => {
  res.status(501).json({ message: "not implemented" });
});

router.get("/", requireAuth, getUserWorkspacesController);

export default router;

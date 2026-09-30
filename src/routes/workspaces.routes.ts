import { Router } from "express";
import requireAuth from "../middlewares/requireAuth";
import { workspaceController } from "../controllers/workspace.Controller";
import { requireRole } from "../middlewares/requireRole";
import { validate } from "../middlewares/validate";
import { createWorkspaceSchema } from "../schemas/workspaces.schemas";

const router = Router();

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
  (req, res) => {
    res.status(200).json({
      message: "Access granted",
    });
  },
);
router.delete("/:id", (req, res) => {
  res.status(501).json({ message: "not implemented" });
});
export default router;

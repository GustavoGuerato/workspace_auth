import { Router } from "express";
import requireAuth from "../middlewares/requireAuth";
import { workspaceController } from "../controllers/workspace.Controller";

const router = Router();

router.get("/:id", (_req, res) => {
  res.status(501).json({ message: "not implemented" });
});
router.post("/", requireAuth, workspaceController);
router.patch("/:id", (req, res) => {
  res.status(501).json({ message: "not implemented" });
});
router.delete("/:id", (req, res) => {
  res.status(501).json({ message: "not implemented" });
});

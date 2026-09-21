import { Router } from "express";

const router = Router();

router.get("/:id", (_req, res) => {
  res.status(501).json({ message: "not implemented" });
});
router.post("/", (req, res) => {
  res.status(501).json({ message: "not implemented" });
});
router.patch("/:id", (req, res) => {
  res.status(501).json({ message: "not implemented" });
});
router.delete("/:id", (req, res) => {
  res.status(501).json({ message: "not implemented" });
});

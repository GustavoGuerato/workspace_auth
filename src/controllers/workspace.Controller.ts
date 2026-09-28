import { Request, Response, NextFunction } from "express";
import { createWorkspace } from "../services/workspace.services";

export const workspaceController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: "name and slug are required" });
    }
    if (!req.user) {
      return next(new Error("User not authenticated"));
    }
    const userId = req.user.id;
    const workspace = await createWorkspace(userId, name, slug);
    return res.status(201).json(workspace);
  } catch (error) {
    next(error);
  }
};

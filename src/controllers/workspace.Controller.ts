import { Request, Response, NextFunction } from "express";
import { createWorkspace } from "../services/workspace.services";

export const workspaceController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, slug } = req.body;
    if (!req.user) {
      return next(new Error("User not authenticated"));
    }
    const userId = req.user.id;
    await createWorkspace(userId, name, slug);
    res.status(201).json({
      message: "Workspace created successfully",
    });
  } catch (error) {
    next(error);
  }
};

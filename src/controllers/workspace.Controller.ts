
import { Request, Response, NextFunction } from "express";
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceMembers,
} from "../services/workspace.services";

export const workspaceController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        error: "name and slug are required",
      });
    }

    if (!req.user) {
      return next(new Error("User not authenticated"));
    }

    const userId = req.user.id;
    const workspace = await createWorkspace(userId, name, slug);

    return res.status(201).json(workspace);
  } catch (error) {
    return next(error);
  }
};

export const getUserWorkspacesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return next(new Error("User not authenticated"));
    }

    const userId = req.user.id;
    const workspaces = await getUserWorkspaces(userId);

    return res.status(200).json(workspaces);
  } catch (error) {
    return next(error);
  }
};

export const getWorkspaceMembersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return next(new Error("User not authenticated"));
    }

    const workspaceId = req.params.workspaceId;

    if (typeof workspaceId !== "string") {
      return res.status(400).json({
        error: "Validation error",
      });
    }

    const members = await getWorkspaceMembers(workspaceId);

    return res.status(200).json(members);
  } catch (error) {
    return next(error);
  }
};

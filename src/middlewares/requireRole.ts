import { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool";
export const requireRole =
  (...allowedRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return next(new Error("User not authenticated"));
      }
      const userId = req.user.id;
      const workspaceId = req.params.workspaceId;
      if (!workspaceId) {
        return next(new Error("Workspace ID is required"));
      }
      const result = await pool.query(
        `SELECT r.name
   FROM memberships m
   JOIN roles r ON r.id = m.role_id
   WHERE m.user_id = $1
     AND m.workspace_id = $2`,
        [userId, workspaceId],
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ error: "Access denied" });
      }
      const role = result.rows[0].name;

      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          error: "Insufficient permissions",
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };

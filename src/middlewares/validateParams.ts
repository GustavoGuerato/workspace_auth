import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validateParams = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        error: "Validation error",
      });
    }

    return next();
  };
};
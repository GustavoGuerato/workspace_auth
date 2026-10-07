import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation error",
      details: err.issues,
    });
  }

  if (typeof err === "object" && err !== null && "code" in err) {
    const dbError = err as { code: string };

    if (dbError.code === "23505") {
      return res.status(409).json({
        error: "Resource already exists",
      });
    }
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  return res.status(500).json({
    error: "Internal server error",
  });
}

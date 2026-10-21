
import { Request, Response, NextFunction } from "express";
import jwt, {
  JsonWebTokenError,
  TokenExpiredError,
} from "jsonwebtoken";
import { env } from "../config/env.js";

const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication token is required",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      error: "Authentication token is required",
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string"
    ) {
      return res.status(401).json({
        error: "Invalid authentication token",
      });
    }

    req.user = { id: decoded.sub };

    return next();
  } catch (error: unknown) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({
        error: "Authentication token expired",
      });
    }

    if (error instanceof JsonWebTokenError) {
      return res.status(401).json({
        error: "Invalid authentication token",
      });
    }

    return next(error);
  }
};

export default requireAuth;

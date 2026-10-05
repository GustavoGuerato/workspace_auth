import { Request, Response, NextFunction } from "express";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { env } from "../config/env.js";

interface AuthPayload {
  sub: string;
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res
        .status(401)
        .json({ error: "Authentication token is required" });
    }

    if (!authorization.startsWith("Bearer ")) {
      throw new Error("Invalid Format");
    }

    const token = authorization.split(" ")[1];

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;

    req.user = { id: decoded.sub };

    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return next(new Error("Authentication token expired"));
    }

    if (error instanceof JsonWebTokenError) {
      return next(new Error("Invalid authentication token"));
    }

    return next(error);
  }
};

export default requireAuth;

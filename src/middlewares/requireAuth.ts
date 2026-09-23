import { Request, Response, NextFunction } from "express";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import dotenv from "dotenv";
interface AuthPayload {
  sub: string;
}
dotenv.config();
const jwt_secret = process.env.JWT_SECRET;
if (!jwt_secret) {
  throw new Error("JWT_SECRET is not defined");
}
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      throw new Error("Authentication token is required");
    }
    if (!authorization.startsWith("Bearer ")) {
      throw new Error("Invalid Format");
    }
    const token = authorization.split(" ")[1];
    const decoded = jwt.verify(token, jwt_secret) as AuthPayload;
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

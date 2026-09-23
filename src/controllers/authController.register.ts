import { Request, Response, NextFunction } from "express";
import { register } from "../services/auth.services";
const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { username, email, password } = req.body;
    const user = await register(username, email, password);
    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};
export { registerController };

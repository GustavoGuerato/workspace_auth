import { Request, Response, NextFunction } from "express";
import { register, login } from "../services/auth.services";
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

const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
export { registerController, loginController };

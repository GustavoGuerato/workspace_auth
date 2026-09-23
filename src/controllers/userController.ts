import { Request, Response, NextFunction } from "express";
import { getUserById } from "../services/user.services";

const meController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await getUserById(req.user!.id);
    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};
export { meController };

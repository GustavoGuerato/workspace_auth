import { Request, Response, NextFunction } from "express";
import { register, login } from "../services/auth.services";
import { refreshAccessToken } from "../services/refresh-token.service";
import { AppError } from "../errors";
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
    const { user, token, refreshToken } = await login(email, password);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 604800000,
    });
    return res.status(200).json({ user, token });
  } catch (error) {
    next(error);
  }
};
const refreshController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw new AppError("Refresh token not provided", 401);
    }

    const accessToken = await refreshAccessToken(refreshToken);

    return res.status(200).json({ token: accessToken });
  } catch (error) {
    next(error);
  }
};
export { registerController, loginController, refreshController };

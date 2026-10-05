import { Request, Response, NextFunction } from "express";
import { register, login } from "../services/auth.services";
import {
  refreshAccessToken,
  revokeRefreshToken,
} from "../services/refresh-token.service";
import { AppError } from "../errors";
import { env } from "../config/env";
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
      secure: env.NODE_ENV === "production",
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

    const { accessToken, refreshToken: newRefreshToken } =
      await refreshAccessToken(refreshToken);
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 604800000,
    });
    return res.status(200).json({ token: accessToken });
  } catch (error) {
    next(error);
  }
};

const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: env.NODE_ENV==="production",
      sameSite: "lax",
    });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};
export {
  registerController,
  loginController,
  refreshController,
  logoutController,
};

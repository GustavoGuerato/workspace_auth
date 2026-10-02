import { Router } from "express";
import {
  loginController,
  refreshController,
  registerController,
  logoutController,
} from "../controllers/authController";
import { meController } from "../controllers/userController";
import requireAuth from "../middlewares/requireAuth";
import { validate } from "../middlewares/validate";
import { loginSchema, registerSchema } from "../schemas/auth.schemas";

const router = Router();
router.post("/register", validate(registerSchema), registerController);
router.post("/login", validate(loginSchema), loginController);
router.get("/me", requireAuth, meController);
router.post("/refresh", refreshController);
router.post("/logout", logoutController);
export default router;

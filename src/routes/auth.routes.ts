import { Router } from "express";
import validateRegister from "../middlewares/validateRegister";
import {
  loginController,
  registerController,
} from "../controllers/authController";
import validateLogin from "../middlewares/validateLogin";
import { meController } from "../controllers/userController";
import requireAuth from "../middlewares/requireAuth";

const router = Router();
router.post("/register", validateRegister, registerController);
router.post("/login", validateLogin, loginController);
router.get("/me", requireAuth, meController);

export default router;

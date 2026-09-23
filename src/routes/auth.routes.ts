import { Router } from "express";
import validateRegister from "../middlewares/validateRegister";
import {
  loginController,
  registerController,
} from "../controllers/authController";
import validateLogin from "../middlewares/validateLogin";

const router = Router();
router.post("/register", validateRegister, registerController);
router.post("/login", validateLogin, loginController);
export default router;

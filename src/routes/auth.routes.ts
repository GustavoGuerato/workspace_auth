import { Router } from "express";
import validateRegister from "../middlewares/validateRegister";
import { registerController } from "../controllers/authController.register";

const router = Router();
router.post("/register", validateRegister, registerController);

export default router;

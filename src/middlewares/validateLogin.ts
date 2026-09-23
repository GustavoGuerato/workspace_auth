import { Request, Response, NextFunction } from "express"

const validateLogin = (req: Request,
  res: Response,
  next: NextFunction) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required",
    });
  }
  if (!email.toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
    return res.status(400).json({
      error: "Incorrect email format",
    });
  }
  next()
}
export default validateLogin;
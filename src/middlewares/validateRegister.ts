import { Request, Response, NextFunction } from "express"


const validateRegister = (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!email.toLowerCase().match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  )) {
    return res.status(400).json({
      error: "Incorrect email format",
    });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Incorrect Password size" })
  }
  next()
}

export default validateRegister 
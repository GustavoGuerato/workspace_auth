import bcrypt from "bcrypt";
import { pool } from "../db/pool";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const saltRounds = 10;
const register = async (username: string, email: string, password: string) => {
  const result = await pool.query("SELECT id FROM users WHERE email = $1", [
    email,
  ]);

  if ((result.rowCount ?? 0) > 0) {
    throw new Error("Email already registered");
  }
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const insert = await pool.query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email`,
    [username, email, passwordHash],
  );
  return insert.rows[0];
};

const jwt_secret = process.env.JWT_SECRET;
const login = async (email: string, password: string) => {
  const result = await pool.query(
    `SELECT id, username, email, password_hash
     FROM users
     WHERE email = $1`,
    [email],
  );

  if (result.rowCount === 0) {
    throw new Error("Invalid credentials");
  }
  const user = result.rows[0];
  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    throw new Error("Invalid Credentials");
  }
  if (!jwt_secret) {
    throw new Error("JWT_SECRET is not defined");
  }
  const token = jwt.sign({ sub: user.id }, jwt_secret, { expiresIn: "1h" });
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    token,
  };
};
export { register, login };

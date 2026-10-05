import bcrypt from "bcrypt";
import { pool } from "../db/pool";
import jwt from "jsonwebtoken";
import { createRefreshToken } from "./refresh-token.service";
import { env } from "../config/env.js";

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
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const refreshToken = await createRefreshToken(user.id);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    token,
    refreshToken,
  };
};

export { register, login };

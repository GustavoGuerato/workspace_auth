import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";

const saltRounds = 10
const register = async (username: string, email: string, password: string) => {
  const result = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if ((result.rowCount ?? 0) > 0) {
    throw new Error("Email already registered");
  }
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const insert = await pool.query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email`,
    [username, email, passwordHash]
  );
  return insert.rows[0]
}
export { register };
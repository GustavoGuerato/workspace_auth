import { pool } from "../db/pool";

const getUserById = async (id: string) => {
  const result = await pool.query(
    `SELECT id, name AS username, email
     FROM users
     WHERE id = $1`,
    [id],
  );

  if (result.rowCount === 0) {
    throw new Error("User not found");
  }

  return result.rows[0];
};

export { getUserById };
import { pool } from "../pool";
import { logger } from "../../config/logger";

async function seedVolume() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let i = 0; i < 500; i++) {
      await client.query(`
      INSERT INTO users (
        username,
        email,
        password_hash
      )
      VALUES (
        'seed_user_${i + 1}',
        'seed_user_${i + 1}@example.com',
        'SEU_HASH_BCRYPT'
      )
      ON CONFLICT (email) DO NOTHING;
    `);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
  }
}

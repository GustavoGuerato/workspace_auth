import { randomBytes, createHash } from "node:crypto";
import { pool } from "../db/pool";
export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}
export async function createRefreshToken(userId: string): Promise<string> {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await pool.query(
    `
    INSERT INTO refresh_tokens (
      user_id,
      token_hash,
      expires_at
    )
    VALUES ($1, $2, $3)
  `,
    [userId, tokenHash, expiresAt],
  );
  return refreshToken;
}
export async function findValidRefreshToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const result = await pool.query(
    `
    SELECT
      id,
      user_id,
      token_hash,
      expires_at,
      revoked_at
    FROM refresh_tokens
    WHERE token_hash = $1
  `,
    [tokenHash],
  );
  if (result.rows.length === 0) {
    return null;
  }
  const token = result.rows[0];
  if (token.revoked_at !== null) {
    return null;
  }

  if (new Date(token.expires_at).getTime() <= Date.now()) {
    return null;
  }
  return token;
}
export async function revokeRefreshToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  await pool.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = NOW()
    WHERE token_hash = $1
  `,
    [tokenHash],
  );
}

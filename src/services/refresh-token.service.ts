
import { randomBytes, createHash } from "node:crypto";
import { pool } from "../db/pool";
import { AppError } from "../errors";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashRefreshToken(refreshToken: string): string {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export async function createRefreshToken(
  userId: string,
): Promise<string> {
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

export async function revokeRefreshToken(
  refreshToken: string,
): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);

  await pool.query(
    `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1
        AND revoked_at IS NULL
    `,
    [tokenHash],
  );
}

export async function refreshAccessToken(refreshToken: string) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenHash = hashRefreshToken(refreshToken);

    const result = await client.query(
      `
        SELECT
          id,
          user_id,
          expires_at,
          revoked_at
        FROM refresh_tokens
        WHERE token_hash = $1
        FOR UPDATE
      `,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      throw new AppError("Invalid refresh token", 401);
    }

    const token = result.rows[0];

    if (
      token.revoked_at !== null ||
      new Date(token.expires_at).getTime() <= Date.now()
    ) {
      throw new AppError("Invalid refresh token", 401);
    }

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await client.query(
      `
        UPDATE refresh_tokens
        SET revoked_at = NOW()
        WHERE id = $1
      `,
      [token.id],
    );

    await client.query(
      `
        INSERT INTO refresh_tokens (
          user_id,
          token_hash,
          expires_at
        )
        VALUES ($1, $2, $3)
      `,
      [token.user_id, newRefreshTokenHash, expiresAt],
    );

    const accessToken = jwt.sign(
      { sub: token.user_id },
      env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    await client.query("COMMIT");

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

import {
  createRefreshToken,
  hashRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
} from "../services/refresh-token.service";
import { pool } from "../db/pool";

describe("Refresh Token Service", () => {
  it("deve criar um refresh token", async () => {
    const userId = "2acfe4af-8be5-48db-97a2-6cf6f22d8590";

    const now = Date.now();

    const refreshToken = await createRefreshToken(userId);

    expect(typeof refreshToken).toBe("string");
    expect(refreshToken).toHaveLength(64);

    const tokenHash = hashRefreshToken(refreshToken);

    const result = await pool.query(
      `
        SELECT user_id, token_hash, expires_at, revoked_at
        FROM refresh_tokens
        WHERE token_hash = $1
      `,
      [tokenHash],
    );

    const savedToken = result.rows[0];

    expect(savedToken).toBeDefined();
    expect(savedToken.user_id).toBe(userId);
    expect(savedToken.token_hash).toBe(hashRefreshToken(refreshToken));
    expect(savedToken.revoked_at).toBeNull();

    const expiresAt = new Date(savedToken.expires_at).getTime();

    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const tolerance = 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(now + sevenDays - tolerance);

    expect(expiresAt).toBeLessThanOrEqual(now + sevenDays + tolerance);
  });

  it("deve encontrar um refresh token existente", async () => {
    const userId = "2acfe4af-8be5-48db-97a2-6cf6f22d8590";

    const refreshToken = await createRefreshToken(userId);

    const result = await findValidRefreshToken(refreshToken);

    expect(result).not.toBeNull();
    expect(result?.user_id).toBe(userId);
    expect(result?.token_hash).toBe(hashRefreshToken(refreshToken));
  });

  it("deve retornar null para um refresh token inexistente", async () => {
    const refreshToken = "token-que-nao-existe";

    const result = await findValidRefreshToken(refreshToken);

    expect(result).toBeNull();
  });
  it("deve retornar null para um refresh token revogado", async () => {
    const userId = "2acfe4af-8be5-48db-97a2-6cf6f22d8590";

    const refreshToken = await createRefreshToken(userId);
    const tokenHash = hashRefreshToken(refreshToken);

    await pool.query(
      `
      UPDATE refresh_tokens
      SET revoked_at = NOW()
      WHERE token_hash = $1
    `,
      [tokenHash],
    );

    const result = await findValidRefreshToken(refreshToken);

    expect(result).toBeNull();
  });
  it("deve retornar null para um refresh token expirado", async () => {
    const userId = "2acfe4af-8be5-48db-97a2-6cf6f22d8590";

    const refreshToken = await createRefreshToken(userId);
    const tokenHash = hashRefreshToken(refreshToken);

    await pool.query(
      `
      UPDATE refresh_tokens
      SET expires_at = NOW() - INTERVAL '1 minute'
      WHERE token_hash = $1
    `,
      [tokenHash],
    );

    const result = await findValidRefreshToken(refreshToken);

    expect(result).toBeNull();
  });
  it("deve revogar um refresh token", async () => {
    const userId = "2acfe4af-8be5-48db-97a2-6cf6f22d8590";
    const refreshToken = await createRefreshToken(userId);
    await revokeRefreshToken(refreshToken);
    const result = await findValidRefreshToken(refreshToken);
    expect(result).toBeNull();
  });
  afterAll(async () => {
    await pool.end();
  });
  it("deve permitir revogar um refresh token inexistente", async () => {
    await revokeRefreshToken("497c5e13d0646ab3496266c74d6b4305aece92f8");
  });
});

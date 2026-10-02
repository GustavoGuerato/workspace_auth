import { describe, it, expect, jest } from "@jest/globals";
import bcrypt from "bcrypt";
import { pool } from "../db/pool";
import { login } from "../services/auth.services";

describe("login", () => {
  it("deve retornar access token e refresh token com credenciais corretas", async () => {
    const queryMock = jest.spyOn(pool, "query");

    const passwordHash = await bcrypt.hash("senha123", 10);

    const user = {
      id: "2acfe4af-8be5-48db-97a2-6cf6f22d8590",
      username: "Gustavo",
      email: "gustavo@email.com",
      password_hash: passwordHash,
    };

    queryMock.mockImplementationOnce(async () => ({
      rows: [user],
      rowCount: 1,
    }));

    const result = await login("gustavo@email.com", "senha123");

    expect(result.user).toEqual({
      id: "2acfe4af-8be5-48db-97a2-6cf6f22d8590",
      username: "Gustavo",
      email: "gustavo@email.com",
    });

    expect(result.token).toEqual(expect.any(String));
    expect(result.token).toBeTruthy();
    expect(result.refreshToken).toEqual(expect.any(String));

    queryMock.mockRestore();
  });
});

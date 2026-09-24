import { describe, it, expect, jest } from "@jest/globals";
import bcrypt from "bcrypt";
import { pool } from "../db/pool";
import { login } from "../services/auth.services";

describe("login", () => {
  it("deve retornar token com credenciais corretas", async () => {
    const queryMock = jest.spyOn(pool, "query");

    const passwordHash = await bcrypt.hash("senha123", 10);

    const user = {
      id: "user-id",
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
      id: "user-id",
      username: "Gustavo",
      email: "gustavo@email.com",
    });

    expect(result.token).toEqual(expect.any(String));
    expect(result.token).toBeTruthy();

    queryMock.mockRestore();
  });
});

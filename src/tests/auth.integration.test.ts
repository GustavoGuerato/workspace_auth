import request from "supertest";
import { describe, it, expect, afterAll } from "@jest/globals";
import app from "../index";
import { pool } from "../db/pool";

describe("POST /auth/login", () => {
  it("deve retornar access token e definir refresh token no cookie", async () => {
    const response = await request(app).post("/auth/login").send({
      email: "gustavo@example.com",
      password: "12345678",
    });

    expect(response.status).toBe(200);

    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe("gustavo@example.com");
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.token).toBeTruthy();

    expect(response.body.refreshToken).toBeUndefined();

    expect(response.headers["set-cookie"]).toBeDefined();
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringContaining("refreshToken=")]),
    );

    expect(response.headers["set-cookie"][0]).toContain("HttpOnly");
  });
});

afterAll(async () => {
  await pool.end();
});

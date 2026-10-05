import request from "supertest";
import { describe, it, expect, afterAll } from "@jest/globals";
import app from "../index";
import { env } from "../config/env";
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

    const cookie = response.headers["set-cookie"][0];

    expect(cookie).toContain("refreshToken=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=604800");

    if (env.NODE_ENV === "production") {
      expect(cookie).toContain("Secure");
    } else {
      expect(cookie).not.toContain("Secure");
    }
  });
});

describe("POST /auth/refresh", () => {
  it("deve rotacionar o refresh token e invalidar o token antigo", async () => {
    const loginResponse = await request(app).post("/auth/login").send({
      email: "gustavo@example.com",
      password: "12345678",
    });

    expect(loginResponse.status).toBe(200);

    const oldCookie = loginResponse.headers["set-cookie"][0];

    const refreshResponse = await request(app)
      .post("/auth/refresh")
      .set("Cookie", oldCookie);

    expect(refreshResponse.status).toBe(200);

    expect(refreshResponse.body.token).toEqual(expect.any(String));
    expect(refreshResponse.body.token).toBeTruthy();

    expect(refreshResponse.headers["set-cookie"]).toBeDefined();

    const newCookie = refreshResponse.headers["set-cookie"][0];

    expect(newCookie).toContain("refreshToken=");
    expect(newCookie).not.toBe(oldCookie);

    const reuseResponse = await request(app)
      .post("/auth/refresh")
      .set("Cookie", oldCookie);

    expect(reuseResponse.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("deve revogar o refresh token e limpar o cookie", async () => {
    const loginResponse = await request(app).post("/auth/login").send({
      email: "gustavo@example.com",
      password: "12345678",
    });

    expect(loginResponse.status).toBe(200);

    const cookie = loginResponse.headers["set-cookie"][0];

    const logoutResponse = await request(app)
      .post("/auth/logout")
      .set("Cookie", cookie);

    expect(logoutResponse.status).toBe(204);

    expect(logoutResponse.headers["set-cookie"]).toBeDefined();

    const clearCookie = logoutResponse.headers["set-cookie"][0];

    expect(clearCookie).toContain("refreshToken=");
    expect(clearCookie).toContain("Expires=Thu, 01 Jan 1970");

    const refreshResponse = await request(app)
      .post("/auth/refresh")
      .set("Cookie", cookie);

    expect(refreshResponse.status).toBe(401);
  });

  it("deve retornar 204 mesmo sem refresh token", async () => {
    const response = await request(app).post("/auth/logout");

    expect(response.status).toBe(204);
  });
});

afterAll(async () => {
  await pool.end();
});

import request from "supertest";
import app from "../index.js";

describe("Security headers", () => {
  it("deve adicionar X-Content-Type-Options", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("deve adicionar Referrer-Policy", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["referrer-policy"]).toBe("no-referrer");
  });

  it("deve adicionar Content-Security-Policy", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["content-security-policy"]).toBeDefined();
  });

  it("deve adicionar Strict-Transport-Security", async () => {
    const response = await request(app).get("/health");

    expect(response.headers["strict-transport-security"]).toBeDefined();
  });
});

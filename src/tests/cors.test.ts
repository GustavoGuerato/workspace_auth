import request from "supertest";
import app from "../index.js";
import { env } from "../config/env.js";

describe("CORS", () => {
  it("deve permitir a origem configurada", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", env.FRONTEND_ORIGIN);

    console.log("HEADERS ORIGEM PERMITIDA:", response.headers);

    expect(response.headers["access-control-allow-origin"]).toBe(
      env.FRONTEND_ORIGIN,
    );
  });

  it("deve rejeitar origem diferente", async () => {
    const response = await request(app)
      .options("/auth/login")
      .set("Origin", "http://malicious-site.com")
      .set("Access-Control-Request-Method", "POST");

    console.log("HEADERS ORIGEM MALICIOSA:", response.headers);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

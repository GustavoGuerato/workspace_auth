
import request from "supertest";
import bcrypt from "bcrypt";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from "@jest/globals";
import app from "../index";
import { pool } from "../db/pool";

const testPassword = "Teste123456";
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const userA = {
  name: "Workspace Test User A",
  email: `workspace-a-${suffix}@example.com`,
};

const userB = {
  name: "Workspace Test User B",
  email: `workspace-b-${suffix}@example.com`,
};

const workspaceName = `Workspace Isolation ${suffix}`;
const workspaceSlug = `workspace-isolation-${suffix}`;

let userAId: string;
let userBId: string;
let workspaceAId: string;
let tokenA: string;
let tokenB: string;

describe("Workspaces — testes de integração", () => {
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);

    const resultA = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userA.name, userA.email, passwordHash],
    );

    const resultB = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userB.name, userB.email, passwordHash],
    );

    userAId = resultA.rows[0].id;
    userBId = resultB.rows[0].id;

    const loginA = await request(app)
      .post("/auth/login")
      .send({
        email: userA.email,
        password: testPassword,
      });

    const loginB = await request(app)
      .post("/auth/login")
      .send({
        email: userB.email,
        password: testPassword,
      });

    expect(loginA.status).toBe(200);
    expect(loginB.status).toBe(200);

    tokenA = loginA.body.token;
    tokenB = loginB.body.token;

    expect(tokenA).toEqual(expect.any(String));
    expect(tokenB).toEqual(expect.any(String));

    const workspaceResponse = await request(app)
      .post("/workspaces")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        name: workspaceName,
        slug: workspaceSlug,
      });

    expect(workspaceResponse.status).toBe(201);

    workspaceAId = workspaceResponse.body.id;

    expect(workspaceAId).toBeDefined();
  });

  it("deve retornar 401 quando não há token de acesso", async () => {
    const response = await request(app).get("/workspaces");

    expect(response.status).toBe(401);
  });

  it("deve listar o workspace ao qual o usuário A pertence", async () => {
    const response = await request(app)
      .get("/workspaces")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);

    expect(response.body[0]).toEqual(
      expect.objectContaining({
        id: workspaceAId,
        name: workspaceName,
        slug: workspaceSlug,
        role: "owner",
      }),
    );
  });

  it("não deve listar o workspace do usuário A para o usuário B", async () => {
    const response = await request(app)
      .get("/workspaces")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("deve bloquear o usuário B ao tentar alterar o workspace do usuário A", async () => {
    const response = await request(app)
      .patch(`/workspaces/${workspaceAId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        name: "Tentativa de alteração indevida",
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: "Access denied",
    });
  });

  afterAll(async () => {
    try {
      if (workspaceAId) {
        await pool.query(
          `DELETE FROM memberships
           WHERE workspace_id = $1`,
          [workspaceAId],
        );

        await pool.query(
          `DELETE FROM workspaces
           WHERE id = $1`,
          [workspaceAId],
        );
      }

      const userIds = [userAId, userBId].filter(Boolean);

      if (userIds.length > 0) {
        await pool.query(
          `DELETE FROM refresh_tokens
           WHERE user_id = ANY($1::uuid[])`,
          [userIds],
        );

        await pool.query(
          `DELETE FROM users
           WHERE id = ANY($1::uuid[])`,
          [userIds],
        );
      }
    } finally {
      await pool.end();
    }
  });
});

import { Request, Response, NextFunction } from "express";
import { expect, jest } from "@jest/globals";
import { requireRole } from "../middlewares/requireRole";
import { pool } from "../db/pool";
jest.mock("../db/pool", () => ({
  pool: {
    query: jest.fn(),
  },
}));
const mockedQuery = jest.mocked(pool.query);
describe("requireRole", () => {
  const next = jest.fn() as NextFunction;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow access when user has an allowed role", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ name: "owner" }],
    } as any);

    const req = {
      user: { id: "user-1" },
      params: { workspaceId: "workspace-1" },
    } as unknown as Request;

    await requireRole("owner", "admin")(req, res, next);

    expect(mockedQuery).toHaveBeenCalledWith(
      expect.stringContaining("SELECT r.name"),
      ["user-1", "workspace-1"],
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should deny access when user has no membership in the workspace", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [],
    } as any);

    const req = {
      user: { id: "user-1" },
      params: { workspaceId: "workspace-2" },
    } as unknown as Request;

    await requireRole("owner", "admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Access denied",
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("should deny access when user role is not allowed", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [{ name: "viewer" }],
    } as any);

    const req = {
      user: { id: "user-1" },
      params: { workspaceId: "workspace-1" },
    } as unknown as Request;

    await requireRole("owner", "admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Insufficient permissions",
    });

    expect(next).not.toHaveBeenCalled();
  });

  it("should pass error to next when database query fails", async () => {
    const error = new Error("Database connection failed");

    mockedQuery.mockRejectedValueOnce(error);

    const req = {
      user: { id: "user-1" },
      params: { workspaceId: "workspace-1" },
    } as unknown as Request;

    await requireRole("owner")(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should pass error to next when user is not authenticated", async () => {
    const req = {
      user: undefined,
      params: { workspaceId: "workspace-1" },
    } as unknown as Request;

    await requireRole("owner")(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "User not authenticated",
      }),
    );

    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it("should pass error to next when workspaceId is missing", async () => {
    const req = {
      user: { id: "user-1" },
      params: {},
    } as unknown as Request;

    await requireRole("owner")(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Workspace ID is required",
      }),
    );

    expect(mockedQuery).not.toHaveBeenCalled();
  });
});

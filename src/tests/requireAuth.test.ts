import { describe, it, expect, jest } from "@jest/globals";
import requireAuth from "../middlewares/requireAuth";
import type { Request, Response, NextFunction } from "express";
describe("requireAuth", () => {
  it("deve retornar 401 quando o token estiver ausente", () => {
    const req = { headers: {} } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn() as NextFunction;
    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

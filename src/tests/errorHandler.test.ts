import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../middlewares/errorHandler";
describe("errorHandler", () => {
  it("deve retornar 500 para erro desconhecido", () => {
    const req = {} as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn() as NextFunction;

    errorHandler(new Error("Erro inesperado"), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Internal server error",
    });
  });
});

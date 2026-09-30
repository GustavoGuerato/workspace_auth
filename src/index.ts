import express, { NextFunction, Request, Response } from "express";
import { pool } from "./db/pool.js";
import healthRoute from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes";
import workspaceRoutes from "./routes/workspaces.routes.js";
import { ZodError } from "zod";
const app = express();
app.use(express.json());
app.use(healthRoute);
app.use("/auth", authRoutes);
pool
  .query("SELECT NOW();")
  .then((result) => {
    console.log("PostgreSQL conectado:", result.rows[0]);
  })
  .catch((error) => {
    console.error("Erro ao conectar ao PostgreSQL:", error);
  });
app.use("/workspace", workspaceRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.log("ERROR:", err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation error",
      details: err.issues,
    });
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "23505"
  ) {
    return res.status(409).json({
      error: "Workspace slug already exists",
    });
  }

  res.status(500).json({
    error: "Internal server error",
  });
});
app.listen(process.env.PORT, () => {
  console.log(`Servidor rodando em http://localhost:${process.env.PORT}`);
});

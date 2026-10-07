import express from "express";
import { pool } from "./db/pool";
import healthRoute from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes";
import workspaceRoutes from "./routes/workspaces.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./config/env";
import helmet from "helmet";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === env.FRONTEND_ORIGIN) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(helmet());

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
  res.status(404).json({
    error: "Route not found",
  });
});

app.use(errorHandler);

export default app;

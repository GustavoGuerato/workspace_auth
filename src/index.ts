import express from "express";
import { pool } from "./db/pool.js";
import healthRoute from "./routes/health.routes.js";

const app = express();

app.use(healthRoute);

pool
  .query("SELECT NOW();")
  .then((result) => {
    console.log("PostgreSQL conectado:", result.rows[0]);
  })
  .catch((error) => {
    console.error("Erro ao conectar ao PostgreSQL:", error);
  });
app.listen(process.env.PORT, () => {
  console.log(`Servidor rodando em http://localhost:${process.env.PORT}`);
});

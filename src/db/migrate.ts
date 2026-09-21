import fs from "node:fs";
import path from "node:path";

import { pool } from "./pool.js";

const migrationPath = path.join(process.cwd(), "migrations");

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

    const files = fs
      .readdirSync(migrationPath)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const appliedResult = await client.query<{ version: string }>(
      "SELECT version FROM schema_migrations",
    );

    const appliedMigrations = new Set(
      appliedResult.rows.map((row) => row.version),
    );

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        console.log(`Pulando migration já aplicada: ${file}`);
        continue;
      }

      console.log(`Executando migration: ${file}`);

      const sql = fs.readFileSync(path.join(migrationPath, file), "utf-8");

      await client.query("BEGIN");

      try {
        await client.query(sql);

        await client.query(
          "INSERT INTO schema_migrations (version) VALUES ($1)",
          [file],
        );

        await client.query("COMMIT");

        console.log(`Migration concluída: ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } catch (error) {
    console.error("Erro ao executar migrations:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

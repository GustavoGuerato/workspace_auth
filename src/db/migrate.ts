  import fs from "node:fs";
  import path from "node:path";

  import { pool } from "./pool.js";
  import { logger } from "../config/logger.js";

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
          logger.info(`Pulando migration já aplicada: ${file}`);
          continue;
        }

        logger.info(`Executando migration: ${file}`);

        const sql = fs.readFileSync(path.join(migrationPath, file), "utf-8");

        await client.query("BEGIN");

        try {
          await client.query(sql);

          await client.query(
            "INSERT INTO schema_migrations (version) VALUES ($1)",
            [file],
          );

          await client.query("COMMIT");

          logger.info(`Migration concluída: ${file}`);
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Erro ao executar migrations");
      process.exitCode = 1;
    } finally {
      client.release();
      await pool.end();
    }
  }

  migrate();

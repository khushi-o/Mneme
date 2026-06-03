import { config } from "../config.js";
import { pool } from "./pool.js";

export async function migrate(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows: applied } = await client.query<{ name: string }>(
      "SELECT name FROM schema_migrations ORDER BY name"
    );
    const appliedSet = new Set(applied.map((r) => r.name));

    const migrations = ["001_init.sql", "002_auth_tokens.sql"];

    for (const name of migrations) {
      if (appliedSet.has(name)) {
        console.log(`skip  ${name}`);
        continue;
      }

      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.join(process.cwd(), "migrations", name);
      const sql = await fs.readFile(filePath, "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
        console.log(`apply ${name}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log("migrations complete");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

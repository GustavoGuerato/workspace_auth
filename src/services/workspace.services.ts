import { pool } from "../db/pool";

const createWorkspace = async (userId: string, name: string, slug: string) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const workspaceResult = await client.query(
      `INSERT INTO workspaces(name, slug)
       VALUES($1, $2)
       RETURNING id, name, slug`,
      [name, slug],
    );

    const result = await client.query(
      "SELECT id FROM roles WHERE name = 'owner'",
    );

    if (result.rows.length === 0) {
      throw new Error("Owner role not found");
    }

    const ownerRoleId = result.rows[0].id;

    const workspaceId = workspaceResult.rows[0].id;

    await client.query(
      "INSERT INTO memberships(user_id, workspace_id, role_id) VALUES($1, $2, $3)",
      [userId, workspaceId, ownerRoleId],
    );

    await client.query("COMMIT");

    return workspaceResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const getUserWorkspaces = async (userId: string) => {
  const result = await pool.query(
    `SELECT
  w.id,
  w.name,
  w.slug,
  r.name AS role
FROM memberships m
JOIN workspaces w ON m.workspace_id = w.id
JOIN roles r ON m.role_id = r.id
WHERE m.user_id = $1;`,
    [userId],
  );
  return result.rows;
}

export { createWorkspace, getUserWorkspaces };
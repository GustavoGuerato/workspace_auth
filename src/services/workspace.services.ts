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
    const result = client.query("SELECT id FROM roles WHERE name = 'owner'");
    const ownerRoleId = (await result).rows[0].id;

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
export { createWorkspace };

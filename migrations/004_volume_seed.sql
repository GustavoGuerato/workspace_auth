-- Volume seed: users
INSERT INTO users (username, email, password_hash)
SELECT
    'seed_user_' || i,
    'seed_user_' || i || '@example.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrqqxFBdgSpwR4Z0M.N6.b7g9Pz3Nqy'
FROM generate_series(1, 500) AS i
ON CONFLICT (email) DO NOTHING;


-- Volume seed: workspaces
INSERT INTO workspaces (name, slug)
SELECT
    'seed_workspace_' || i,
    'seed-workspace-' || i
FROM generate_series(1, 25) AS i
ON CONFLICT (slug) DO NOTHING;


-- Volume seed: memberships
WITH seeded_users AS (
    SELECT
        id AS user_id,
        ROW_NUMBER() OVER (ORDER BY username) AS user_num
    FROM users
    WHERE username LIKE 'seed_user_%'
),
seeded_workspaces AS (
    SELECT
        id AS workspace_id,
        ROW_NUMBER() OVER (ORDER BY name) AS workspace_num
    FROM workspaces
    WHERE name LIKE 'seed_workspace_%'
),
pairs AS (
    SELECT
        u.user_id,
        w.workspace_id,
        u.user_num,
        w.workspace_num
    FROM seeded_users u
    CROSS JOIN seeded_workspaces w
    WHERE ((u.user_num + w.workspace_num) % 5) <> 0
),
role_ids AS (
    SELECT
        (SELECT id FROM roles WHERE name = 'owner') AS owner_id,
        (SELECT id FROM roles WHERE name = 'admin') AS admin_id,
        (SELECT id FROM roles WHERE name = 'member') AS member_id,
        (SELECT id FROM roles WHERE name = 'viewer') AS viewer_id
),
ranked_pairs AS (
    SELECT
        p.*,
        ROW_NUMBER() OVER (
            PARTITION BY p.workspace_id
            ORDER BY p.user_num
        ) AS member_num
    FROM pairs p
)
INSERT INTO memberships (user_id, workspace_id, role_id)
SELECT
    rp.user_id,
    rp.workspace_id,
    CASE
        WHEN rp.member_num = 1 THEN r.owner_id
        WHEN (rp.user_num + rp.workspace_num) % 3 = 0 THEN r.admin_id
        WHEN (rp.user_num + rp.workspace_num) % 3 = 1 THEN r.member_id
        ELSE r.viewer_id
    END AS role_id
FROM ranked_pairs rp
CROSS JOIN role_ids r
ON CONFLICT (user_id, workspace_id) DO NOTHING;
-- migrations/002_seed_rbac.sql
-- ============================================
-- ROLES
-- ============================================
INSERT INTO roles (name, description)
VALUES ('owner', 'Full control over the workspace'),
  (
    'admin',
    'Administrative access to the workspace'
  ),
  ('member', 'Standard workspace access'),
  ('viewer', 'Read-only workspace access');
-- ============================================
-- PERMISSIONS
-- ============================================
INSERT INTO permissions (name, description)
VALUES ('workspace:read', 'View workspace information'),
  (
    'workspace:update',
    'Update workspace information'
  ),
  ('workspace:delete', 'Delete a workspace'),
  ('member:read', 'View workspace members'),
  ('member:create', 'Add members to a workspace'),
  (
    'member:update',
    'Update workspace member information'
  ),
  (
    'member:delete',
    'Remove members from a workspace'
  ),
  ('role:read', 'View workspace roles'),
  ('role:create', 'Create workspace roles'),
  ('role:update', 'Update workspace roles'),
  ('role:delete', 'Delete workspace roles'),
  ('permission:read', 'View available permissions'),
  (
    'permission:assign',
    'Assign permissions to roles'
  ),
  ('invite:read', 'View workspace invitations'),
  ('invite:create', 'Create workspace invitations'),
  ('invite:delete', 'Cancel workspace invitations');
-- ============================================
-- OWNER
-- Receives all permissions
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
  p.id
FROM roles r
  CROSS JOIN permissions p
WHERE r.name = 'owner';
-- ============================================
-- ADMIN
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
  p.id
FROM roles r
  JOIN permissions p ON p.name IN (
    'workspace:read',
    'workspace:update',
    'member:read',
    'member:create',
    'member:update',
    'member:delete',
    'role:read',
    'role:create',
    'role:update',
    'role:delete',
    'permission:read',
    'permission:assign',
    'invite:read',
    'invite:create',
    'invite:delete'
  )
WHERE r.name = 'admin';
-- ============================================
-- MEMBER
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
  p.id
FROM roles r
  JOIN permissions p ON p.name IN (
    'workspace:read',
    'member:read',
    'role:read',
    'permission:read',
    'invite:read',
    'invite:create'
  )
WHERE r.name = 'member';
-- ============================================
-- VIEWER
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id,
  p.id
FROM roles r
  JOIN permissions p ON p.name IN (
    'workspace:read',
    'member:read',
    'role:read',
    'permission:read',
    'invite:read'
  )
WHERE r.name = 'viewer';

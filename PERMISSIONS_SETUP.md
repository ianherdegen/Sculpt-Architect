# Permissions System Setup

This document explains how to set up and use the scalable permissions system for the application.

## Overview

The permissions system uses a JSONB column in the `user_profiles` table to store feature-level permissions. This approach is:
- **Scalable**: Easy to add new permissions without schema changes
- **Flexible**: Supports boolean flags for any feature
- **Performant**: Uses GIN indexes for efficient queries

## Database Setup

1. Run the migration script in your Supabase SQL Editor:
   ```sql
   -- Run: supabase-add-permissions-migration.sql
   ```

2. This will:
   - Add a `permissions` JSONB column to `user_profiles`
   - Create a GIN index for efficient permission queries
   - Create a helper function `has_permission()` for checking permissions

## Granting Permissions

To grant a user access to the Pose Library, run this SQL:

```sql
UPDATE user_profiles 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb),
  '{pose_library}',
  'true'::jsonb
)
WHERE user_id = 'USER_UUID_HERE';
```

Or grant multiple permissions at once:

```sql
UPDATE user_profiles 
SET permissions = jsonb_build_object(
  'pose_library', true,
  'admin', false,
  'another_feature', true
)
WHERE user_id = 'USER_UUID_HERE';
```

## Using Permissions in Code

### React Hook (Recommended)

```typescript
import { usePermission } from '../lib/usePermissions'

function MyComponent() {
  const { hasPermission, loading } = usePermission('pose_library')
  
  if (loading) return <div>Loading...</div>
  if (!hasPermission) return <div>Access Denied</div>
  
  return <div>Content for authorized users</div>
}
```

### Service Method

```typescript
import { permissionsService } from '../lib/permissionsService'

// Check permission
const hasAccess = await permissionsService.hasPermission(userId, 'pose_library')

// Get all permissions
const permissions = await permissionsService.getUserPermissions(userId)

// Grant permission (admin only)
await permissionsService.grantPermission(userId, 'pose_library')

// Revoke permission (admin only)
await permissionsService.revokePermission(userId, 'pose_library')
```

## Current Permissions

- `pose_library`: Access to the Pose Library feature (boolean)

## Adding New Permissions

1. **Define the permission key** in `src/lib/permissionsService.ts`:
   ```typescript
   export type PermissionKey = 'pose_library' | 'admin' | 'new_feature' | string
   ```

2. **Use the permission** in your component:
   ```typescript
   const { hasPermission } = usePermission('new_feature')
   ```

3. **Grant the permission** via SQL or admin interface:
   ```sql
   UPDATE user_profiles 
   SET permissions = jsonb_set(
     COALESCE(permissions, '{}'::jsonb),
     '{new_feature}',
     'true'::jsonb
   )
   WHERE user_id = 'USER_UUID_HERE';
   ```

## Security Notes

- Permissions are checked server-side via RLS policies
- The `has_permission()` function uses `SECURITY DEFINER` for efficient checks
- Always verify permissions on the server side, not just client-side
- Grant/revoke operations should be restricted to admin users

## Example: Pose Library Protection

The Pose Library component now checks for `pose_library` permission:

```typescript
const { hasPermission, loading } = usePermission('pose_library')

if (!hasPermission) {
  return <AccessDeniedMessage />
}
```

Users without the permission will see an "Access Denied" message.


import { supabase } from './supabase'

export type PermissionKey = 'pose_library' | 'pose_management' | 'update_all' | 'delete_all' | 'admin' | string

export interface UserPermissions {
  pose_library?: boolean
  pose_management?: boolean
  update_all?: boolean
  delete_all?: boolean
  admin?: boolean
  [key: string]: boolean | undefined
}

export const permissionsService = {
  /**
   * Check if a user has a specific permission
   */
  async hasPermission(userId: string, permissionKey: PermissionKey): Promise<boolean> {
    try {
      // First try using the RPC function if available
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('has_permission', {
          p_user_id: userId,
          p_permission_key: permissionKey
        })

      if (!rpcError && rpcData !== null) {
        return rpcData
      }

      // Fallback: Check permissions directly from user_profiles
      const permissions = await this.getUserPermissions(userId)
      return permissions[permissionKey] === true
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  },

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('permissions')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return {} // Not found
        throw error
      }

      return (data?.permissions as UserPermissions) || {}
    } catch (error) {
      console.error('Error getting user permissions:', error)
      return {}
    }
  },

  /**
   * Grant a permission to a user
   * Note: This should typically be done by an admin or through a secure endpoint
   */
  async grantPermission(userId: string, permissionKey: PermissionKey): Promise<void> {
    // Get current permissions
    const currentPermissions = await this.getUserPermissions(userId)
    
    // Update permissions
    const updatedPermissions = {
      ...currentPermissions,
      [permissionKey]: true
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ permissions: updatedPermissions })
      .eq('user_id', userId)

    if (error) {
      throw error
    }
  },

  /**
   * Revoke a permission from a user
   */
  async revokePermission(userId: string, permissionKey: PermissionKey): Promise<void> {
    // Get current permissions
    const currentPermissions = await this.getUserPermissions(userId)
    
    // Remove the permission
    const { [permissionKey]: _, ...updatedPermissions } = currentPermissions

    const { error } = await supabase
      .from('user_profiles')
      .update({ permissions: updatedPermissions })
      .eq('user_id', userId)

    if (error) {
      throw error
    }
  }
}


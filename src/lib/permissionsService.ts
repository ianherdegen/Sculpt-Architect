import { api } from './apiClient'

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
  async hasPermission(userId: string, permissionKey: PermissionKey): Promise<boolean> {
    try {
      const result = await api.get<{ allowed: boolean }>(
        `/permissions/${userId}/check/${permissionKey}`,
        true
      )
      return result.allowed
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  },

  async getUserPermissions(userId: string): Promise<UserPermissions> {
    try {
      return await api.get<UserPermissions>(`/permissions/${userId}`, true)
    } catch (error) {
      console.error('Error getting user permissions:', error)
      return {}
    }
  },

  async grantPermission(userId: string, permissionKey: PermissionKey): Promise<void> {
    const currentPermissions = await this.getUserPermissions(userId)
    const updatedPermissions = {
      ...currentPermissions,
      [permissionKey]: true
    }

    await api.patch(`/admin/users/${userId}/permissions`, { permissions: updatedPermissions })
  },

  async revokePermission(userId: string, permissionKey: PermissionKey): Promise<void> {
    const currentPermissions = await this.getUserPermissions(userId)
    const { [permissionKey]: _, ...updatedPermissions } = currentPermissions

    await api.patch(`/admin/users/${userId}/permissions`, { permissions: updatedPermissions })
  }
}

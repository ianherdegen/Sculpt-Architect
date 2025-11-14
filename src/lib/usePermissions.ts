import { useState, useEffect } from 'react'
import { useAuth } from './auth'
import { permissionsService, PermissionKey } from './permissionsService'

export function usePermission(permissionKey: PermissionKey) {
  const { user } = useAuth()
  const [hasPermission, setHasPermission] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!user) {
      setHasPermission(false)
      setLoading(false)
      return
    }

    const checkPermission = async () => {
      setLoading(true)
      try {
        const hasAccess = await permissionsService.hasPermission(user.id, permissionKey)
        setHasPermission(hasAccess)
      } catch (error) {
        console.error('Error checking permission:', error)
        setHasPermission(false)
      } finally {
        setLoading(false)
      }
    }

    checkPermission()
  }, [user, permissionKey])

  return { hasPermission, loading }
}


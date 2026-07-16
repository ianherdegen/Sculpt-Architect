import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/apiClient'
import { Loader2 } from 'lucide-react'

export function MagicLinkVerify() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setError('Invalid magic link')
      return
    }

    api.verifyMagicLink(token)
      .then(() => {
        navigate('/', { replace: true })
        window.location.reload()
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to verify magic link')
      })
  }, [searchParams, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Sign in failed</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  )
}

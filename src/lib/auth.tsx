import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, getStoredToken, setStoredToken } from './apiClient'
import type { AuthUser } from './types'
import { userProfileService } from './userProfileService'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function checkBanStatus(userId: string): Promise<boolean> {
  try {
    const profile = await userProfileService.getByUserId(userId)
    return profile?.is_banned === true
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSession = useCallback(async () => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const { user: authUser } = await api.getMe()
      const banned = await checkBanStatus(authUser.id)
      if (banned) {
        setStoredToken(null)
        setUser(null)
      } else {
        setUser(authUser)
      }
    } catch {
      setStoredToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const signUp = async (email: string, password: string) => {
    try {
      const { user: authUser } = await api.signUp(email, password)
      setUser(authUser)
      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Sign up failed') }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { user: authUser } = await api.signIn(email, password)
      const banned = await checkBanStatus(authUser.id)
      if (banned) {
        api.signOut()
        setUser(null)
        return { error: new Error('Your account has been banned. Please contact support if you believe this is an error.') }
      }
      setUser(authUser)
      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Sign in failed') }
    }
  }

  const signInWithMagicLink = async (email: string) => {
    try {
      await api.signInWithMagicLink(email)
      return { error: null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Magic link failed') }
    }
  }

  const signOut = async () => {
    api.signOut()
    setUser(null)
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes('auth') || key.includes('sculpt')) {
          if (key !== 'sculpt_auth_token') localStorage.removeItem(key)
        }
      })
    } catch {
      // ignore storage errors
    }
    setStoredToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

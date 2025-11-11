import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      return { error: error ? new Error(error.message) : null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Sign up failed') }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error: error ? new Error(error.message) : null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Sign in failed') }
    }
  }

  const signInWithMagicLink = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}`,
        },
      })
      return { error: error ? new Error(error.message) : null }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error('Magic link failed') }
    }
  }

  const signOut = async () => {
    // Sign out from Supabase - this will trigger onAuthStateChange
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      throw error
    }
    
    // Clear user state immediately
    setUser(null)
    
    // Clear any Supabase-related localStorage items to ensure complete logout
    // This is important for deployed environments where session persistence can cause issues
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key)
        }
      })
    } catch (e) {
      console.warn('Error clearing localStorage:', e)
    }
    
    // Wait a moment to ensure the session is fully cleared
    // This helps with race conditions, especially on deployed environments
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify session is cleared
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      console.warn('Session still exists after signOut, forcing clear')
      // Force clear by setting user to null again
      setUser(null)
    }
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


import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, User, UserProfile } from './supabase'
import type { Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching user profile:', error)
        // If user doesn't exist, clear auth data
        if (error.code === 'PGRST116') {
          console.log('User profile not found, clearing auth data')
          await supabase.auth.signOut()
        }
        return null
      }
      
      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Initial session:', session)
      setSession(session)
      setUser(session?.user as User ?? null)
      
      if (session?.user) {
        console.log('Fetching user profile for:', session.user.id)
        const profile = await fetchUserProfile(session.user.id)
        console.log('User profile:', profile)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    }).catch((error) => {
      console.error('Error getting initial session:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session)
      setSession(session)
      setUser(session?.user as User ?? null)
      
      if (session?.user) {
        console.log('Fetching user profile for:', session.user.id)
        const profile = await fetchUserProfile(session.user.id)
        console.log('User profile:', profile)
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    console.log('Attempting signup with:', { email, password: '***' })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    console.log('Signup result:', { data, error })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const value = {
    user,
    userProfile,
    session,
    loading,
    isAdmin: userProfile?.role === 'admin',
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './auth'
import { userProfileService } from './userProfileService'

export type ViewMode = 'instructor' | 'student'

interface ViewModeContextType {
  mode: ViewMode
  canInstruct: boolean
  loading: boolean
  setMode: (mode: ViewMode) => Promise<void>
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined)

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [mode, setModeState] = useState<ViewMode>('student')
  const [canInstruct, setCanInstruct] = useState(false)
  const [loading, setLoading] = useState(true)
  const modeRevision = useRef(0)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setCanInstruct(false)
      setModeState('student')
      setLoading(false)
      return
    }

    let cancelled = false
    const revision = modeRevision.current
    setLoading(true)
    userProfileService.getMyProfile()
      .then((profile) => {
        if (cancelled || revision !== modeRevision.current) return
        const allowed = profile?.permissions?.instructor === true
        setCanInstruct(allowed)
        setModeState(allowed && profile?.view_mode === 'instructor' ? 'instructor' : 'student')
      })
      .catch(() => {
        if (!cancelled) {
          setCanInstruct(false)
          setModeState('student')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  const setMode = useCallback(async (next: ViewMode) => {
    if (!user || next === mode) return
    if (next === 'instructor' && !canInstruct) return
    modeRevision.current += 1
    const previous = mode
    setModeState(next)
    try {
      await userProfileService.update(user.id, { view_mode: next })
    } catch (error) {
      setModeState(previous)
      throw error
    }
  }, [user, mode, canInstruct])

  return (
    <ViewModeContext.Provider value={{ mode, canInstruct, loading: authLoading || loading, setMode }}>
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  const context = useContext(ViewModeContext)
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider')
  }
  return context
}

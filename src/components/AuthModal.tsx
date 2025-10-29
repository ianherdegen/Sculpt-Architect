import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { useAuth } from '../lib/auth'
import { Loader2, LogIn, UserPlus, X } from 'lucide-react'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  canClose?: boolean // If false, modal cannot be closed (for gated experience)
}

export function AuthModal({ open, onClose, canClose = true }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { signUp, signIn } = useAuth()

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError(null)
    setSuccess(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email.trim(), password)
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Account created! You are now signed in.')
          setTimeout(() => {
            handleClose()
          }, 1500)
        }
      } else {
        const { error } = await signIn(email.trim(), password)
        if (error) {
          setError(error.message)
        } else {
          handleClose()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={canClose ? handleClose : undefined}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={canClose ? undefined : (e) => e.preventDefault()} onEscapeKeyDown={canClose ? undefined : (e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'signup'
              ? 'Create an account to save your preferences'
              : 'Sign in to your account'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'signup' ? 'Creating...' : 'Signing in...'}
              </>
            ) : mode === 'signup' ? (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          {mode === 'signup' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  resetForm()
                }}
                className="text-primary hover:underline"
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup')
                  resetForm()
                }}
                className="text-primary hover:underline"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


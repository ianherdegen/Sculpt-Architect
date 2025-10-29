import React, { useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { useAuth } from '../lib/auth';
import { Loader2, UserPlus, LogIn } from 'lucide-react'

export function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const { signUp, signIn } = useAuth()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Signup form submitted with:', { email, password: '***' })
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error } = await signUp(email, password)
    
    if (error) {
      console.error('Signup error:', error)
      setError(error.message)
    } else {
      console.log('Signup successful')
      setMessage('Account created successfully! You are now signed in.')
    }
    
    setLoading(false)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error } = await signIn(email, password)
    
    if (error) {
      console.error('Signin error:', error)
      setError(error.message)
    }
    
    setLoading(false)
  }

  const switchMode = () => {
    setIsSignUp(!isSignUp)
    setError(null)
    setMessage(null)
    setEmail('')
    setPassword('')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Yoga Sequence Builder</CardTitle>
          <CardDescription>
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder={isSignUp ? "Create a password" : "Enter your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isSignUp ? 6 : undefined}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? (
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
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </p>
            <Button
              variant="link"
              onClick={switchMode}
              className="text-sm p-0 h-auto"
            >
              {isSignUp ? 'Sign in instead' : 'Create an account'}
            </Button>
          </div>
          
          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {message && (
            <Alert className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserProfile } from '@/types'

/**
 * Get the current authenticated user from Supabase.
 * Returns null if not authenticated.
 */
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Get the current user's profile from the users table.
 * Returns null if not found.
 */
export async function getUserProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile as UserProfile | null
}

/**
 * Require authentication. Redirects to /login if not authenticated.
 * Returns the authenticated Supabase user.
 */
export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

/**
 * Require a specific role. Redirects to the appropriate portal if role doesn't match.
 * Returns the user profile.
 */
export async function requireRole(role: 'OWNER' | 'STUDENT') {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== role) {
    if (profile.role === 'OWNER') {
      redirect('/owner')
    } else {
      redirect('/student')
    }
  }

  return profile as UserProfile
}

/**
 * Require guest (not authenticated). Redirects to home if authenticated.
 */
export async function requireGuest() {
  const user = await getUser()
  if (user) {
    redirect('/')
  }
}

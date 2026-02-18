import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gokul Mess - Owner Portal',
  description: 'Owner dashboard for Gokul Mess Management System',
}

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // STRICT: Check if role is OWNER
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'OWNER') {
    redirect('/student') // Redirect unauthorized users to student app
  }

  return (
    <>
      {children}
    </>
  )
}

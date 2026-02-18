import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gokul Mess - Student Portal',
  description: 'Student portal for Gokul Mess Management System',
}

export default async function StudentLayout({
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

  // Optional: Check if role is STUDENT
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile && profile.role !== 'STUDENT') {
    // If owner tries to access student area, maybe redirect or just allow
    // For now, let's just allow or redirect to owner dashboard
    if (profile.role === 'OWNER') {
      redirect('/owner')
    }
  }

  return (
    <>
      {children}
    </>
  )
}

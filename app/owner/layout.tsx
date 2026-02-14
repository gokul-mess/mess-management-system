import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-950">
      {/* Desktop Sidebar / Header */}
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}

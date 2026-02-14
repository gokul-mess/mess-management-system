import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    <div className="min-h-screen bg-gray-50 dark:bg-black">
       {/* Mobile Header could go here */}
      <main className="container mx-auto px-4 py-6 pb-24">
        {children}
      </main>
      {/* Bottom Nav for Mobile could go here */}
    </div>
  )
}

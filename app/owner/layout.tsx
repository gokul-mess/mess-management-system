import { requireRole } from '@/lib/auth'
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
  // Redirects to /login if not authenticated, or to /student if not OWNER
  await requireRole('OWNER')

  return <>{children}</>
}

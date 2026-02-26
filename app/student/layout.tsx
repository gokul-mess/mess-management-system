import { requireRole } from '@/lib/auth'
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
  // Redirects to /login if not authenticated, or to /owner if not STUDENT
  await requireRole('STUDENT')

  return <>{children}</>
}

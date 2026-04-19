'use client'

import type { ReactNode } from 'react'
import { User } from 'lucide-react'
import { getStudentPhotoUrl } from '@/lib/student-photo'

interface StudentAvatarProps {
  photoPath?: string | null
  fullName?: string | null
  alt?: string
  imgClassName?: string
  fallback?: ReactNode
}

export function StudentAvatar({
  photoPath,
  fullName,
  alt,
  imgClassName = 'w-full h-full object-cover',
  fallback,
}: StudentAvatarProps) {
  const url = getStudentPhotoUrl(photoPath)

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt ?? fullName ?? 'Student photo'}
        className={imgClassName}
      />
    )
  }

  if (fallback !== undefined) return <>{fallback}</>

  const initial = fullName?.trim().charAt(0).toUpperCase()
  if (initial) {
    return <span className="text-lg font-bold text-primary">{initial}</span>
  }
  return <User className="w-1/2 h-1/2 text-muted-foreground" />
}

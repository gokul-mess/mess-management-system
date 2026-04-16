import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export default async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (Next.js static files)
     * - _next/image   (Next.js image optimization)
     * - favicon.ico
     * - manifest.json (PWA manifest — must be public)
     * - service-worker.js (PWA service worker — must be public)
     * - icons/ folder (PWA icons — must be public)
     * - All static file extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest\.json|service-worker\.js|icons/.*|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)',
  ],
}

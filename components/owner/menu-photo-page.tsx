'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MenuPhotoUpload } from './menu-photo-upload'
import { UtensilsCrossed, Calendar, Clock } from 'lucide-react'

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export function MenuPhotoPage() {
  const [menuPhotoUrl, setMenuPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    loadMenuPhoto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMenuPhoto = async () => {
    try {
      const { data } = await supabase
        .from('mess_settings')
        .select('menu_photo_url')
        .eq('id', SETTINGS_ID)
        .single()
      if (data?.menu_photo_url) setMenuPhotoUrl(data.menu_photo_url)
    } catch (error) {
      console.error('Error loading menu photo:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex flex-col gap-3 h-full">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold">Daily Menu Photo</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload today&apos;s menu photo for students to view
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Main card — flex-1 on desktop, auto on mobile */}
      <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 h-full">

            {/* Left — image preview */}
            <div className="flex items-center justify-center bg-muted/40 border-b sm:border-b-0 sm:border-r border-border p-6 min-h-[260px]">
              {menuPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={menuPhotoUrl}
                  alt="Menu Preview"
                  className="max-h-full w-auto object-contain rounded-xl shadow-md"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <UtensilsCrossed className="w-12 h-12 opacity-20" />
                  <p className="text-sm">No photo uploaded yet</p>
                </div>
              )}
            </div>

            {/* Right — upload + tips */}
            <div className="flex flex-col gap-4 p-6 overflow-y-auto">
              <div>
                <p className="text-sm font-semibold mb-1">Upload Menu Photo</p>
                <div className="mb-3 pt-2 border-b border-border pb-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">💡 Tips</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Upload separate photos for lunch and dinner</li>
                    <li>• Replace or remove to change the menu</li>
                    <li>• Use a clear, well-lit photo</li>
                    <li>• Maximum file size: 5MB</li>
                  </ul>
                </div>
                <MenuPhotoUpload
                  currentPhotoUrl={menuPhotoUrl}
                  onUploadSuccess={(url) => setMenuPhotoUrl(url)}
                />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

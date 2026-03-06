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
      
      if (data?.menu_photo_url) {
        setMenuPhotoUrl(data.menu_photo_url)
      }
    } catch (error) {
      console.error('Error loading menu photo:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <UtensilsCrossed className="w-6 h-6 text-primary animate-pulse" />
            <h3 className="text-2xl font-bold">Daily Menu Photo</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload today&apos;s menu photo for students to view
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {new Date().toLocaleTimeString('en-IN', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-6 shadow-lg">
        <div className="mb-4">
          <h4 className="text-lg font-semibold mb-2">Upload Menu Photo</h4>
          <p className="text-sm text-muted-foreground">
            Students will see this photo in their dashboard. Update it daily with today&apos;s menu.
          </p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <MenuPhotoUpload 
            currentPhotoUrl={menuPhotoUrl}
            onUploadSuccess={(url) => setMenuPhotoUrl(url)}
          />
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Tips for Menu Photos
        </h5>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Take clear, well-lit photos of the menu board</li>
          <li>• Include all meal items and prices</li>
          <li>• Update daily before lunch time</li>
          <li>• Maximum file size: 5MB</li>
        </ul>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UtensilsCrossed, X } from 'lucide-react'

export function MenuCard() {
  const [menuUrl, setMenuUrl] = useState<string | null>(null)
  const [showFullScreen, setShowFullScreen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchMenu = async () => {
      const { data } = await supabase
        .from('mess_settings')
        .select('menu_photo_url')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single()
      
      if (data?.menu_photo_url) {
        setMenuUrl(data.menu_photo_url)
      }
    }

    fetchMenu()

    const channel = supabase
      .channel('menu-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'mess_settings' 
      }, (payload: any) => {
        setMenuUrl(payload.new?.menu_photo_url || null)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  if (!menuUrl) return null

  return (
    <>
      <div 
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-border shadow-lg overflow-hidden cursor-pointer hover:shadow-2xl transition-all hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2 duration-500"
        onClick={() => setShowFullScreen(true)}
        style={{ animationDelay: '400ms' }}
      >
        <div className="p-4 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-900/20 border-b border-border">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold">Today's Menu</h3>
          </div>
        </div>
        <div className="p-4">
          <img 
            src={menuUrl} 
            alt="Today's Menu" 
            className="w-full h-48 object-cover rounded-lg"
          />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Click to view full size
          </p>
        </div>
      </div>

      {showFullScreen && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowFullScreen(false)}
        >
          <button
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            onClick={() => setShowFullScreen(false)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img 
            src={menuUrl} 
            alt="Today's Menu" 
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

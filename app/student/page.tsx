'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export default function StudentDashboard() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    fetchProfile()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold">Welcome, {profile?.full_name || 'Student'}</h1>
           <p className="text-gray-500">Mess ID: {profile?.unique_short_id || 'Pending...'}</p>
        </div>
        <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden">
           {/* <img src={profile?.photo_url} alt="Profile" /> */}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
         <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border text-center">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Generate Token</h3>
            <Button className="w-full">Get Meal QR</Button>
         </div>
         <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border text-center">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Mark Leave</h3>
            <Button variant="outline" className="w-full">I'm Not Eating</Button>
         </div>
      </div>
    </div>
  )
}

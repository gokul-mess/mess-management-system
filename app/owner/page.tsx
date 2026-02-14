'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function OwnerDashboard() {
  const supabase = createClient()
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    // 1. Fetch initial state
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('daily_logs')
        .select('*, users(full_name, unique_short_id, photo_url)')
        .eq('date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
      
      if (data) setLogs(data)
    }
    fetchLogs()

    // 2. Subscribe to Realtime
    const channel = supabase
      .channel('owner-dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'daily_logs' },
        (payload) => {
          console.log('Change received!', payload)
          // Ideally fetch the full relation, but for speed we can just prepend
          // or re-fetch the latest
          fetchLogs() 
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Live Mess Feed</h1>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.log_id} className="p-4 bg-white dark:bg-zinc-900 rounded shadow flex items-center gap-4">
             <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden">
                {/* <img src={log.users?.photo_url} /> */}
             </div>
             <div>
                <p className="font-bold">{log.users?.full_name} ({log.users?.unique_short_id})</p>
                <span className="text-green-500 text-sm font-mono">{log.status}</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}

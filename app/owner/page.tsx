'use client'

import { useDailyLogs } from '@/hooks/use-daily-logs'

export default function OwnerDashboard() {
  const { logs, isLoading } = useDailyLogs()

  if (isLoading) return <div className="p-8">Loading live feed...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Live Mess Feed</h1>
      <div className="space-y-2">
        {logs?.map((log) => (
          <div key={log.log_id} className="p-4 bg-white dark:bg-zinc-900 rounded shadow flex items-center gap-4 animate-in slide-in-from-top-2 fade-in duration-300">
             <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
                {/* Placeholder or Image */}
                {log.users?.photo_url ? (
                  <img src={log.users.photo_url} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-500">No Img</span>
                )}
             </div>
             <div>
                <p className="font-bold">{log.users?.full_name} ({log.users?.unique_short_id})</p>
                <div className="flex gap-2 text-sm">
                   <span className="text-green-500 font-mono font-bold uppercase">{log.status}</span>
                   <span className="text-gray-400">Via {log.access_method}</span>
                   <span className="text-gray-400 text-xs mt-1">
                     {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
             </div>
          </div>
        ))}
        {logs?.length === 0 && (
          <p className="text-gray-500 italic">No meals logged today yet.</p>
        )}
      </div>
    </div>
  )
}

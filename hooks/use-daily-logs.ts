import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'
import type { DailyLog } from '@/types'

export function useDailyLogs() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const queryKey = ['daily_logs', today]

  // 1. Initial Fetch
  const { data: logs, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*, users(full_name, unique_short_id, photo_url)')
        .eq('date', today)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (DailyLog & { users: any })[]
    },
  })

  // 2. Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('daily_logs_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'daily_logs',
          filter: `date=eq.${today}`, // Only listen for today's logs
        },
        async (payload) => {
          console.log('Realtime INSERT:', payload)
          
          // Optimistic update or simple refetch. 
          // For speed, we just invalidate to fetch the fresh relation data (user name/photo)
          // Ideally, we'd manually construct the new item, but we need the joined user data.
          // Since the fetch is fast, invalidation is acceptable for now.
          await queryClient.invalidateQueries({ queryKey })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient, today, queryKey])

  return { logs, isLoading, error }
}

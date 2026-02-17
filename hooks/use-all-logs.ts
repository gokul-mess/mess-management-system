import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { DailyLog } from '@/types'

export function useAllLogs(userId?: string) {
  const supabase = createClient()

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['all_logs', userId],
    queryFn: async () => {
      if (!userId) return []
      
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as DailyLog[]
    },
    enabled: !!userId, // Only run query if userId is provided
  })

  return { logs, isLoading, error }
}

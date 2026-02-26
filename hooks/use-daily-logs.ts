import { useQuery, queryOptions } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import type { DailyLog } from '@/types'

type DailyLogWithUser = DailyLog & {
  users: { full_name: string; unique_short_id: number; photo_url: string | null }
}

export function dailyLogsQueryOptions(date: string) {
  return queryOptions({
    queryKey: queryKeys.dailyLogs.byDate(date),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*, users(full_name, unique_short_id, photo_url)')
        .eq('date', date)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as DailyLogWithUser[]
    },
  })
}

export function useDailyLogs() {
  const today = new Date().toISOString().split('T')[0]
  const { data: logs, isPending, error } = useQuery(dailyLogsQueryOptions(today))

  return { logs, isPending, error }
}

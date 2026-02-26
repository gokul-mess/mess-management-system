import { useQuery, queryOptions } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import type { DailyLog } from '@/types'

export function allLogsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.allLogs.byUser(userId),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as DailyLog[]
    },
  })
}

export function useAllLogs(userId?: string) {
  const { data: logs, isPending, error } = useQuery({
    ...allLogsQueryOptions(userId ?? ''),
    enabled: !!userId,
  })

  return { logs, isPending, error }
}

import { useQuery, queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { fetchBalanceDaysData } from '@/lib/balanceService'
import { calculateBalanceDays } from '@/lib/balance'
import type { BalanceDaysResult } from '@/lib/balance'

export function balanceDaysQueryOptions(userId: string) {
  return queryOptions({
    queryKey: queryKeys.balanceDays.byUser(userId),
    queryFn: async (): Promise<BalanceDaysResult> => {
      const raw = await fetchBalanceDaysData(userId)
      return calculateBalanceDays(raw)
    },
    // Refetch every 60 seconds for a near-realtime feel without websocket overhead
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useBalanceDays(userId?: string) {
  const { data, isPending, error } = useQuery({
    ...balanceDaysQueryOptions(userId ?? ''),
    enabled: !!userId,
  })

  return { data, isPending, error }
}

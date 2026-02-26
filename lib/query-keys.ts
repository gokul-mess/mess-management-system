/**
 * Centralized query key factory.
 *
 * Organizes keys hierarchically (entity → action → params) so that
 * invalidation can target a whole entity or a specific subset.
 *
 * @example
 *   queryClient.invalidateQueries({ queryKey: queryKeys.dailyLogs.all })
 *   // Invalidates every daily-logs query regardless of date
 */
export const queryKeys = {
  profile: {
    all: ['profile'] as const,
  },
  dailyLogs: {
    all: ['daily_logs'] as const,
    byDate: (date: string) => ['daily_logs', date] as const,
  },
  allLogs: {
    all: ['all_logs'] as const,
    byUser: (userId: string) => ['all_logs', userId] as const,
  },
} as const

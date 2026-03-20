import { useQuery, queryOptions } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import type { UserProfile } from '@/types'

export const profileQueryOptions = queryOptions({
  queryKey: queryKeys.profile.all,
  queryFn: async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) throw error

    // Fetch current meal plan from mess_periods
    const today = new Date().toISOString().split('T')[0]
    const { data: messPeriod } = await supabase
      .from('mess_periods')
      .select('meal_plan')
      .eq('user_id', user.id)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    // Add meal_plan to the profile data
    return {
      ...data,
      meal_plan: messPeriod?.meal_plan || 'DL'
    } as UserProfile
  },
})

export function useProfile() {
  return useQuery(profileQueryOptions)
}

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
    return data as UserProfile
  },
})

export function useProfile() {
  return useQuery(profileQueryOptions)
}

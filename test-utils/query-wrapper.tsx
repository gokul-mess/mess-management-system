/**
 * TanStack Query Wrapper for Testing
 * 
 * Provides a QueryClient wrapper for testing components that use TanStack Query.
 */

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Create a new QueryClient for testing
 * 
 * @returns QueryClient instance configured for testing
 * 
 * @example
 * const queryClient = createTestQueryClient()
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in tests
        retry: false,
        // Disable caching in tests
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        // Disable retries in tests
        retry: false,
      },
    },
  })
}

/**
 * Query wrapper component for testing
 * 
 * @param children - Child components to wrap
 * @returns Wrapped component with QueryClientProvider
 * 
 * @example
 * // In a test
 * render(<MyComponent />, { wrapper: QueryWrapper })
 */
export function QueryWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

/**
 * Create a custom query wrapper with a specific QueryClient
 * 
 * @param queryClient - QueryClient instance to use
 * @returns Wrapper component
 * 
 * @example
 * const queryClient = createTestQueryClient()
 * const wrapper = createQueryWrapper(queryClient)
 * render(<MyComponent />, { wrapper })
 */
export function createQueryWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

/**
 * Wait for all queries to settle (useful for async tests)
 * 
 * @param queryClient - QueryClient instance
 * @returns Promise that resolves when all queries are settled
 * 
 * @example
 * await waitForQueriesToSettle(queryClient)
 */
export async function waitForQueriesToSettle(queryClient: QueryClient): Promise<void> {
  await queryClient.getQueryCache().findAll().forEach(query => {
    return query.fetch()
  })
}

/**
 * Clear all queries from the cache
 * 
 * @param queryClient - QueryClient instance
 * 
 * @example
 * clearAllQueries(queryClient)
 */
export function clearAllQueries(queryClient: QueryClient): void {
  queryClient.clear()
}

/**
 * Invalidate all queries (triggers refetch)
 * 
 * @param queryClient - QueryClient instance
 * @returns Promise that resolves when invalidation is complete
 * 
 * @example
 * await invalidateAllQueries(queryClient)
 */
export async function invalidateAllQueries(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries()
}

/**
 * Set query data manually (useful for mocking)
 * 
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key
 * @param data - Data to set
 * 
 * @example
 * setQueryData(queryClient, ['profile', 'user-123'], mockUserProfile)
 */
export function setQueryData(
  queryClient: QueryClient,
  queryKey: unknown[],
  data: unknown
): void {
  queryClient.setQueryData(queryKey, data)
}

/**
 * Get query data from cache
 * 
 * @param queryClient - QueryClient instance
 * @param queryKey - Query key
 * @returns Cached data or undefined
 * 
 * @example
 * const data = getQueryData(queryClient, ['profile', 'user-123'])
 */
export function getQueryData<T = unknown>(
  queryClient: QueryClient,
  queryKey: unknown[]
): T | undefined {
  return queryClient.getQueryData<T>(queryKey)
}

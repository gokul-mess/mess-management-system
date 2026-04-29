/**
 * Mock Supabase Client
 * 
 * Provides a mock implementation of the Supabase client for unit tests.
 * Supports common query patterns and can be easily configured per test.
 */

type MockData = any
type MockError = { message: string; code?: string } | null

interface MockQueryBuilder {
  select: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  delete: jest.Mock
  eq: jest.Mock
  neq: jest.Mock
  gt: jest.Mock
  gte: jest.Mock
  lt: jest.Mock
  lte: jest.Mock
  like: jest.Mock
  ilike: jest.Mock
  is: jest.Mock
  in: jest.Mock
  contains: jest.Mock
  or: jest.Mock
  order: jest.Mock
  limit: jest.Mock
  single: jest.Mock
  maybeSingle: jest.Mock
  range: jest.Mock
}

interface MockSupabaseClient {
  from: jest.Mock
  auth: {
    getUser: jest.Mock
    getSession: jest.Mock
    signOut: jest.Mock
    signInWithOAuth: jest.Mock
  }
  storage: {
    from: jest.Mock
  }
}

/**
 * Create a mock query builder with chainable methods
 * 
 * @param data - Mock data to return
 * @param error - Mock error to return
 * @returns Mock query builder
 */
function createMockQueryBuilder(
  data: MockData = null,
  error: MockError = null
): MockQueryBuilder {
  const mockResponse = { data, error }
  
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(mockResponse),
    maybeSingle: jest.fn().mockResolvedValue(mockResponse),
    range: jest.fn().mockReturnThis(),
  }
  
  // Make the builder itself a promise that resolves to mockResponse
  builder.then = (resolve: any) => Promise.resolve(mockResponse).then(resolve)
  
  return builder
}

/**
 * Create a mock Supabase client
 * 
 * @param defaultData - Default data to return for queries
 * @param defaultError - Default error to return for queries
 * @returns Mock Supabase client
 * 
 * @example
 * // Create a mock client with default data
 * const mockClient = createMockSupabaseClient([{ id: '1', name: 'Test' }])
 * 
 * @example
 * // Create a mock client with an error
 * const mockClient = createMockSupabaseClient(null, { message: 'Not found' })
 */
export function createMockSupabaseClient(
  defaultData: MockData = null,
  defaultError: MockError = null
): MockSupabaseClient {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    from: jest.fn((_table: string) => createMockQueryBuilder(defaultData, defaultError)),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: defaultData },
        error: defaultError,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: defaultData },
        error: defaultError,
      }),
      signOut: jest.fn().mockResolvedValue({
        error: defaultError,
      }),
      signInWithOAuth: jest.fn().mockResolvedValue({
        data: { url: 'https://example.com/auth' },
        error: defaultError,
      }),
    },
    storage: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      from: jest.fn((_bucket: string) => ({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: defaultError,
        }),
        download: jest.fn().mockResolvedValue({
          data: new Blob(),
          error: defaultError,
        }),
        remove: jest.fn().mockResolvedValue({
          data: null,
          error: defaultError,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/storage/test-path' },
        }),
      })),
    },
  }
}

/**
 * Create a mock Supabase client with custom table responses
 * 
 * @param tableResponses - Map of table names to mock responses
 * @returns Mock Supabase client
 * 
 * @example
 * // Create a mock client with different responses per table
 * const mockClient = createMockSupabaseClientWithTables({
 *   users: { data: [{ id: '1', name: 'Test User' }], error: null },
 *   daily_logs: { data: [{ id: '1', date: '2024-01-01' }], error: null },
 * })
 */
export function createMockSupabaseClientWithTables(
  tableResponses: Record<string, { data: MockData; error: MockError }>
): MockSupabaseClient {
  return {
    from: jest.fn((table: string) => {
      const response = tableResponses[table] || { data: null, error: null }
      return createMockQueryBuilder(response.data, response.error)
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({
        error: null,
      }),
      signInWithOAuth: jest.fn().mockResolvedValue({
        data: { url: 'https://example.com/auth' },
        error: null,
      }),
    },
    storage: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      from: jest.fn((_bucket: string) => ({
        upload: jest.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null,
        }),
        download: jest.fn().mockResolvedValue({
          data: new Blob(),
          error: null,
        }),
        remove: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/storage/test-path' },
        }),
      })),
    },
  }
}

/**
 * Create a mock Supabase client with authentication
 * 
 * @param user - Mock user object
 * @param session - Mock session object
 * @returns Mock Supabase client
 * 
 * @example
 * // Create a mock client with authenticated user
 * const mockClient = createMockSupabaseClientWithAuth(
 *   { id: 'user-123', email: 'test@example.com' },
 *   { access_token: 'token-123', user: { id: 'user-123' } }
 * )
 */
export function createMockSupabaseClientWithAuth(
  user: MockData = null,
  session: MockData = null
): MockSupabaseClient {
  const client = createMockSupabaseClient()
  
  client.auth.getUser = jest.fn().mockResolvedValue({
    data: { user },
    error: null,
  })
  
  client.auth.getSession = jest.fn().mockResolvedValue({
    data: { session },
    error: null,
  })
  
  return client
}

/**
 * Create a mock Supabase error
 * 
 * @param message - Error message
 * @param code - Error code
 * @returns Mock error object
 * 
 * @example
 * // Create a mock RLS policy error
 * const error = createMockSupabaseError('Permission denied', '42501')
 */
export function createMockSupabaseError(
  message: string,
  code?: string
): MockError {
  return { message, code }
}

/**
 * Reset all mocks in a Supabase client
 * 
 * @param client - Mock Supabase client to reset
 * 
 * @example
 * // Reset all mocks between tests
 * beforeEach(() => {
 *   resetMockSupabaseClient(mockClient)
 * })
 */
export function resetMockSupabaseClient(client: MockSupabaseClient): void {
  client.from.mockClear()
  client.auth.getUser.mockClear()
  client.auth.getSession.mockClear()
  client.auth.signOut.mockClear()
  client.auth.signInWithOAuth.mockClear()
  client.storage.from.mockClear()
}

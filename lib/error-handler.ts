// Centralized error handling utility

export interface ErrorResult {
  message: string
  code?: string
  details?: string
}

/**
 * Parse and format error messages from various sources
 */
export function parseError(error: any): ErrorResult {
  // Handle null/undefined
  if (!error) {
    return {
      message: 'An unknown error occurred. Please try again.',
      code: 'UNKNOWN_ERROR'
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'STRING_ERROR'
    }
  }

  // Handle Supabase errors
  if (error.code && error.message) {
    return {
      message: formatSupabaseError(error),
      code: error.code,
      details: error.details || error.hint
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    return {
      message: error.message || 'An error occurred. Please try again.',
      code: 'ERROR_OBJECT'
    }
  }

  // Handle objects with message property
  if (error.message) {
    return {
      message: error.message,
      code: error.code || 'OBJECT_ERROR'
    }
  }

  // Fallback
  return {
    message: 'An unexpected error occurred. Please try again.',
    code: 'UNEXPECTED_ERROR'
  }
}

/**
 * Format Supabase-specific errors into user-friendly messages
 */
function formatSupabaseError(error: any): string {
  const code = error.code
  const message = error.message

  // Common Supabase error codes
  switch (code) {
    case '23505':
      return 'This record already exists. Please use a different value.'
    
    case '23503':
      return 'Cannot complete this action due to related records. Please check dependencies.'
    
    case '23502':
      return 'Required information is missing. Please fill in all required fields.'
    
    case '42501':
      return 'You do not have permission to perform this action.'
    
    case 'PGRST116':
      return 'No data found. The requested record may have been deleted.'
    
    case '22P02':
      return 'Invalid data format. Please check your input.'
    
    case '23514':
      return 'The provided value does not meet the required constraints.'
    
    case '08006':
    case '08003':
    case '08000':
      return 'Connection error. Please check your internet connection and try again.'
    
    case '57014':
      return 'The operation took too long. Please try again.'
    
    default:
      // Return the original message if no specific handling
      return message || 'A database error occurred. Please try again.'
  }
}

/**
 * Log errors to console in development
 */
export function logError(context: string, error: any) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error)
  }
}

/**
 * Handle async operations with error handling
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  context: string
): Promise<{ data: T | null; error: ErrorResult | null }> {
  try {
    const data = await operation()
    return { data, error: null }
  } catch (err) {
    logError(context, err)
    return { data: null, error: parseError(err) }
  }
}

/**
 * Validate required fields
 */
export function validateRequired(
  fields: Record<string, any>,
  fieldNames: string[]
): ErrorResult | null {
  for (const fieldName of fieldNames) {
    const value = fields[fieldName]
    if (value === undefined || value === null || value === '') {
      return {
        message: `${fieldName.replace(/_/g, ' ')} is required.`,
        code: 'VALIDATION_ERROR'
      }
    }
  }
  return null
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ErrorResult | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return {
      message: 'Please enter a valid email address.',
      code: 'INVALID_EMAIL'
    }
  }
  return null
}

/**
 * Validate phone number format (Indian)
 */
export function validatePhone(phone: string): ErrorResult | null {
  const phoneRegex = /^[6-9]\d{9}$/
  if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
    return {
      message: 'Please enter a valid 10-digit phone number.',
      code: 'INVALID_PHONE'
    }
  }
  return null
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: string,
  endDate: string
): ErrorResult | null {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      message: 'Please enter valid dates.',
      code: 'INVALID_DATE'
    }
  }
  
  if (start > end) {
    return {
      message: 'End date must be after start date.',
      code: 'INVALID_DATE_RANGE'
    }
  }
  
  return null
}

/**
 * Validate number range
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ErrorResult | null {
  if (isNaN(value)) {
    return {
      message: `${fieldName} must be a valid number.`,
      code: 'INVALID_NUMBER'
    }
  }
  
  if (value < min || value > max) {
    return {
      message: `${fieldName} must be between ${min} and ${max}.`,
      code: 'OUT_OF_RANGE'
    }
  }
  
  return null
}

/**
 * Create a user-friendly error message component
 */
export function getErrorMessage(error: ErrorResult): string {
  return error.message
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.code === '08006' ||
    error?.code === '08003' ||
    error?.code === '08000' ||
    error?.message?.toLowerCase().includes('network') ||
    error?.message?.toLowerCase().includes('connection')
  )
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error: any): boolean {
  return (
    error?.code === '42501' ||
    error?.message?.toLowerCase().includes('permission') ||
    error?.message?.toLowerCase().includes('unauthorized')
  )
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry permission errors
      if (isPermissionError(error)) {
        throw error
      }
      
      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)))
      }
    }
  }
  
  throw lastError
}

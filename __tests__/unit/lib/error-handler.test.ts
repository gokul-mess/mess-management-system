/**
 * Unit Tests for lib/error-handler.ts
 * Tests error parsing, formatting, and validation functions
 */

import {
  parseError,
  logError,
  handleAsync,
  validateRequired,
  validateEmail,
  validatePhone,
  validateDateRange,
  validateNumberRange,
  getErrorMessage,
  isNetworkError,
  isPermissionError,
  retryOperation,
  type ErrorResult
} from '@/lib/error-handler'

describe('Error Handler', () => {
  describe('parseError', () => {
    it('should parse Supabase errors correctly', () => {
      const supabaseError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        details: 'Key (email)=(test@example.com) already exists.'
      }

      const result = parseError(supabaseError)

      expect(result.message).toBe('This record already exists. Please use a different value.')
      expect(result.code).toBe('23505')
      expect(result.details).toBe('Key (email)=(test@example.com) already exists.')
    })

    it('should parse Error objects correctly', () => {
      const error = new Error('Something went wrong')

      const result = parseError(error)

      expect(result.message).toBe('Something went wrong')
      expect(result.code).toBe('ERROR_OBJECT')
    })

    it('should parse string errors correctly', () => {
      const result = parseError('Simple error message')

      expect(result.message).toBe('Simple error message')
      expect(result.code).toBe('STRING_ERROR')
    })

    it('should handle null/undefined errors', () => {
      expect(parseError(null).message).toBe('An unknown error occurred. Please try again.')
      expect(parseError(undefined).message).toBe('An unknown error occurred. Please try again.')
      expect(parseError(null).code).toBe('UNKNOWN_ERROR')
    })

    it('should handle objects with message property', () => {
      const error = { message: 'Custom error', code: 'CUSTOM' }

      const result = parseError(error)

      expect(result.message).toBe('Custom error')
      expect(result.code).toBe('CUSTOM')
    })

    it('should handle unknown error types', () => {
      const result = parseError(12345)

      expect(result.message).toBe('An unexpected error occurred. Please try again.')
      expect(result.code).toBe('UNEXPECTED_ERROR')
    })

    it('should preserve error stack traces for Error objects', () => {
      const error = new Error('Test error')
      const originalStack = error.stack

      parseError(error)

      expect(error.stack).toBe(originalStack)
    })
  })

  describe('formatSupabaseError', () => {
    it('should format duplicate key error (23505)', () => {
      const error = { code: '23505', message: 'duplicate key' }
      const result = parseError(error)
      expect(result.message).toBe('This record already exists. Please use a different value.')
    })

    it('should format foreign key violation (23503)', () => {
      const error = { code: '23503', message: 'foreign key violation' }
      const result = parseError(error)
      expect(result.message).toBe('Cannot complete this action due to related records. Please check dependencies.')
    })

    it('should format not null violation (23502)', () => {
      const error = { code: '23502', message: 'not null violation' }
      const result = parseError(error)
      expect(result.message).toBe('Required information is missing. Please fill in all required fields.')
    })

    it('should format permission denied error (42501)', () => {
      const error = { code: '42501', message: 'permission denied' }
      const result = parseError(error)
      expect(result.message).toBe('You do not have permission to perform this action.')
    })

    it('should format no data found error (PGRST116)', () => {
      const error = { code: 'PGRST116', message: 'no rows returned' }
      const result = parseError(error)
      expect(result.message).toBe('No data found. The requested record may have been deleted.')
    })

    it('should format invalid data format error (22P02)', () => {
      const error = { code: '22P02', message: 'invalid input syntax' }
      const result = parseError(error)
      expect(result.message).toBe('Invalid data format. Please check your input.')
    })

    it('should format check constraint violation (23514)', () => {
      const error = { code: '23514', message: 'check constraint violation' }
      const result = parseError(error)
      expect(result.message).toBe('The provided value does not meet the required constraints.')
    })

    it('should format connection errors (08006, 08003, 08000)', () => {
      const errors = ['08006', '08003', '08000']
      errors.forEach(code => {
        const error = { code, message: 'connection error' }
        const result = parseError(error)
        expect(result.message).toBe('Connection error. Please check your internet connection and try again.')
      })
    })

    it('should format timeout error (57014)', () => {
      const error = { code: '57014', message: 'query timeout' }
      const result = parseError(error)
      expect(result.message).toBe('The operation took too long. Please try again.')
    })

    it('should return original message for unknown error codes', () => {
      const error = { code: 'UNKNOWN_CODE', message: 'Custom error message' }
      const result = parseError(error)
      expect(result.message).toBe('Custom error message')
    })

    it('should include hint as details if details not present', () => {
      const error = { code: '23505', message: 'duplicate', hint: 'Use a different value' }
      const result = parseError(error)
      expect(result.details).toBe('Use a different value')
    })
  })

  describe('logError', () => {
    const originalEnv = process.env.NODE_ENV
    let consoleSpy: jest.SpyInstance

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
      consoleSpy.mockRestore()
      // Restore original NODE_ENV by reassigning the entire env object
      process.env = { ...process.env, NODE_ENV: originalEnv }
    })

    it('should log errors in development mode', () => {
      process.env = { ...process.env, NODE_ENV: 'development' }
      const error = new Error('Test error')

      logError('TestContext', error)

      expect(consoleSpy).toHaveBeenCalledWith('[TestContext]', error)
    })

    it('should not log errors in production mode', () => {
      process.env = { ...process.env, NODE_ENV: 'production' }
      const error = new Error('Test error')

      logError('TestContext', error)

      expect(consoleSpy).not.toHaveBeenCalled()
    })
  })

  describe('handleAsync', () => {
    it('should return data on successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const result = await handleAsync(operation, 'TestContext')

      expect(result.data).toBe('success')
      expect(result.error).toBeNull()
    })

    it('should return error on failed operation', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'))

      const result = await handleAsync(operation, 'TestContext')

      expect(result.data).toBeNull()
      expect(result.error).not.toBeNull()
      expect(result.error?.message).toBe('Operation failed')
    })
  })

  describe('validateRequired', () => {
    it('should return null for valid fields', () => {
      const fields = { name: 'John', email: 'john@example.com' }
      const result = validateRequired(fields, ['name', 'email'])
      expect(result).toBeNull()
    })

    it('should return error for missing field', () => {
      const fields = { name: 'John' }
      const result = validateRequired(fields, ['name', 'email'])
      expect(result).not.toBeNull()
      expect(result?.message).toBe('email is required.')
      expect(result?.code).toBe('VALIDATION_ERROR')
    })

    it('should return error for null field', () => {
      const fields = { name: null }
      const result = validateRequired(fields, ['name'])
      expect(result).not.toBeNull()
      expect(result?.message).toBe('name is required.')
    })

    it('should return error for empty string', () => {
      const fields = { name: '' }
      const result = validateRequired(fields, ['name'])
      expect(result).not.toBeNull()
      expect(result?.message).toBe('name is required.')
    })

    it('should format field names with underscores', () => {
      const fields = { user_name: '' }
      const result = validateRequired(fields, ['user_name'])
      expect(result?.message).toBe('user name is required.')
    })
  })

  describe('validateEmail', () => {
    it('should return null for valid email', () => {
      expect(validateEmail('test@example.com')).toBeNull()
      expect(validateEmail('user.name@domain.co.uk')).toBeNull()
      expect(validateEmail('user+tag@example.com')).toBeNull()
    })

    it('should return error for invalid email', () => {
      const result = validateEmail('invalid-email')
      expect(result).not.toBeNull()
      expect(result?.message).toBe('Please enter a valid email address.')
      expect(result?.code).toBe('INVALID_EMAIL')
    })

    it('should return error for email without @', () => {
      expect(validateEmail('testexample.com')).not.toBeNull()
    })

    it('should return error for email without domain', () => {
      expect(validateEmail('test@')).not.toBeNull()
    })

    it('should return error for email with spaces', () => {
      expect(validateEmail('test @example.com')).not.toBeNull()
    })
  })

  describe('validatePhone', () => {
    it('should return null for valid Indian phone number', () => {
      expect(validatePhone('9876543210')).toBeNull()
      expect(validatePhone('8123456789')).toBeNull()
      expect(validatePhone('7000000000')).toBeNull()
      expect(validatePhone('6999999999')).toBeNull()
    })

    it('should return error for invalid phone number', () => {
      const result = validatePhone('1234567890')
      expect(result).not.toBeNull()
      expect(result?.message).toBe('Please enter a valid 10-digit phone number.')
      expect(result?.code).toBe('INVALID_PHONE')
    })

    it('should return error for phone number with less than 10 digits', () => {
      expect(validatePhone('987654321')).not.toBeNull()
    })

    it('should return error for phone number with more than 10 digits', () => {
      expect(validatePhone('98765432100')).not.toBeNull()
    })

    it('should handle phone numbers with spaces', () => {
      expect(validatePhone('9876 543 210')).toBeNull()
    })

    it('should return error for phone starting with invalid digit', () => {
      expect(validatePhone('5876543210')).not.toBeNull()
      expect(validatePhone('0876543210')).not.toBeNull()
    })
  })

  describe('validateDateRange', () => {
    it('should return null for valid date range', () => {
      expect(validateDateRange('2024-01-01', '2024-01-31')).toBeNull()
      expect(validateDateRange('2024-01-01', '2024-12-31')).toBeNull()
    })

    it('should return error for invalid dates', () => {
      const result = validateDateRange('invalid', '2024-01-31')
      expect(result).not.toBeNull()
      expect(result?.message).toBe('Please enter valid dates.')
      expect(result?.code).toBe('INVALID_DATE')
    })

    it('should return error when start date is after end date', () => {
      const result = validateDateRange('2024-12-31', '2024-01-01')
      expect(result).not.toBeNull()
      expect(result?.message).toBe('End date must be after start date.')
      expect(result?.code).toBe('INVALID_DATE_RANGE')
    })

    it('should allow same start and end date', () => {
      expect(validateDateRange('2024-01-01', '2024-01-01')).toBeNull()
    })
  })

  describe('validateNumberRange', () => {
    it('should return null for valid number in range', () => {
      expect(validateNumberRange(5, 1, 10, 'Age')).toBeNull()
      expect(validateNumberRange(1, 1, 10, 'Age')).toBeNull()
      expect(validateNumberRange(10, 1, 10, 'Age')).toBeNull()
    })

    it('should return error for number below minimum', () => {
      const result = validateNumberRange(0, 1, 10, 'Age')
      expect(result).not.toBeNull()
      expect(result?.message).toBe('Age must be between 1 and 10.')
      expect(result?.code).toBe('OUT_OF_RANGE')
    })

    it('should return error for number above maximum', () => {
      const result = validateNumberRange(11, 1, 10, 'Age')
      expect(result).not.toBeNull()
      expect(result?.message).toBe('Age must be between 1 and 10.')
    })

    it('should return error for NaN', () => {
      const result = validateNumberRange(NaN, 1, 10, 'Age')
      expect(result).not.toBeNull()
      expect(result?.message).toBe('Age must be a valid number.')
      expect(result?.code).toBe('INVALID_NUMBER')
    })
  })

  describe('getErrorMessage', () => {
    it('should return error message', () => {
      const error: ErrorResult = {
        message: 'Test error message',
        code: 'TEST_ERROR'
      }
      expect(getErrorMessage(error)).toBe('Test error message')
    })
  })

  describe('isNetworkError', () => {
    it('should return true for network error codes', () => {
      expect(isNetworkError({ code: '08006' })).toBe(true)
      expect(isNetworkError({ code: '08003' })).toBe(true)
      expect(isNetworkError({ code: '08000' })).toBe(true)
    })

    it('should return true for network-related messages', () => {
      expect(isNetworkError({ message: 'Network error occurred' })).toBe(true)
      expect(isNetworkError({ message: 'Connection failed' })).toBe(true)
    })

    it('should return false for non-network errors', () => {
      expect(isNetworkError({ code: '23505' })).toBe(false)
      expect(isNetworkError({ message: 'Validation error' })).toBe(false)
      expect(isNetworkError(null)).toBe(false)
      expect(isNetworkError('string error')).toBe(false)
    })
  })

  describe('isPermissionError', () => {
    it('should return true for permission error code', () => {
      expect(isPermissionError({ code: '42501' })).toBe(true)
    })

    it('should return true for permission-related messages', () => {
      expect(isPermissionError({ message: 'Permission denied' })).toBe(true)
      expect(isPermissionError({ message: 'Unauthorized access' })).toBe(true)
    })

    it('should return false for non-permission errors', () => {
      expect(isPermissionError({ code: '23505' })).toBe(false)
      expect(isPermissionError({ message: 'Validation error' })).toBe(false)
      expect(isPermissionError(null)).toBe(false)
      expect(isPermissionError('string error')).toBe(false)
    })
  })

  describe('retryOperation', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return result on first success', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const promise = retryOperation(operation, 3, 1000)
      await jest.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')

      const promise = retryOperation(operation, 3, 1000)
      await jest.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should throw error after max retries', async () => {
      const error = new Error('Always fails')
      const operation = jest.fn().mockRejectedValue(error)

      const promise = retryOperation(operation, 3, 1000)
      
      // Run timers and catch the error
      const runTimersPromise = jest.runAllTimersAsync()
      
      await expect(promise).rejects.toThrow('Always fails')
      await runTimersPromise
      
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should not retry permission errors', async () => {
      const error = { code: '42501', message: 'Permission denied' }
      const operation = jest.fn().mockRejectedValue(error)

      const promise = retryOperation(operation, 3, 1000)
      
      // Run timers and catch the error
      const runTimersPromise = jest.runAllTimersAsync()
      
      await expect(promise).rejects.toEqual(error)
      await runTimersPromise
      
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')

      const promise = retryOperation(operation, 3, 1000)
      
      // First attempt fails immediately
      await jest.advanceTimersByTimeAsync(0)
      expect(operation).toHaveBeenCalledTimes(1)
      
      // Wait 1000ms for first retry
      await jest.advanceTimersByTimeAsync(1000)
      expect(operation).toHaveBeenCalledTimes(2)
      
      // Wait 2000ms for second retry (exponential backoff)
      await jest.advanceTimersByTimeAsync(2000)
      expect(operation).toHaveBeenCalledTimes(3)
      
      const result = await promise
      expect(result).toBe('success')
    })
  })
})

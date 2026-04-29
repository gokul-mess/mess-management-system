/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/test-utils/**',
  ],
  // Coverage thresholds set to current baseline - can be increased incrementally
  coverageThreshold: {
    global: {
      branches: 7,
      functions: 10,
      lines: 9,
      statements: 10,
    },
    // High coverage for critical business logic that has tests
    './lib/auth.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/balance.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/balanceService.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/date-utils.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/leave-calculator.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/mess-period-utils.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/pricing-utils.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/constants.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/query-keys.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/report-constants.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/utils.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/error-handler.ts': {
      branches: 85,
      functions: 100,
      lines: 98,
      statements: 98,
    },
    './hooks/use-balance-days.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './hooks/use-daily-logs.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './hooks/use-profile.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './hooks/use-error-handler.ts': {
      branches: 60,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test-utils/setup.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
}

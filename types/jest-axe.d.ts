/**
 * Type declarations for jest-axe
 */

declare module 'jest-axe' {
  import { AxeResults } from 'axe-core'

  export function axe(
    html: Element | Document | string,
    options?: any
  ): Promise<AxeResults>

  export function toHaveNoViolations(): {
    toHaveNoViolations(results: AxeResults): { pass: boolean; message: () => string }
  }

  export function configureAxe(options?: any): typeof axe
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R
    }
  }
}

export {}

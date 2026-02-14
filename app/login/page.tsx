'use client'

import { signInWithGoogle } from '../auth/actions'
import { Button } from '@/components/ui/button'
import { FcGoogle } from 'react-icons/fc'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-lg text-center">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Gokul Mess
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to access your dashboard
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <form action={signInWithGoogle}>
            <Button 
              variant="outline" 
              className="w-full py-6 flex items-center justify-center gap-3 text-lg font-medium transition-transform hover:scale-[1.02]"
              type="submit"
            >
              <FcGoogle className="h-6 w-6" />
              Continue with Google
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

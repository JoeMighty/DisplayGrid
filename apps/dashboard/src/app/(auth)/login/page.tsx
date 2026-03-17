import { redirect } from 'next/navigation'
import { isSetupComplete } from '@/lib/settings'
import LoginForm from '@/components/setup/LoginForm'

export default async function LoginPage() {
  const setupComplete = await isSetupComplete()

  if (!setupComplete) {
    redirect('/setup')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          <span className="text-2xl font-bold text-gray-100 font-mono tracking-tight">
            DisplayGrid
          </span>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          <h1 className="text-lg font-semibold text-gray-100 mb-1 text-center">
            Sign in to your account
          </h1>
          <p className="text-sm text-gray-400 text-center mb-6">
            Enter your credentials to continue
          </p>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}

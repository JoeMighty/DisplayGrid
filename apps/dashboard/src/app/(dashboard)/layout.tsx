import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { isSetupComplete, getAppName } from '@/lib/settings'
import Sidebar from '@/components/layout/Sidebar'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const setupComplete = await isSetupComplete()

  if (!setupComplete) {
    redirect('/setup')
  }

  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const appName = await getAppName()
  const userRole = (session.user as { role?: string })?.role ?? 'viewer'

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar appName={appName} userRole={userRole} />
      <main className="flex-1 ml-56 overflow-y-auto p-8 text-gray-100">
        {children}
      </main>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { isSetupComplete } from '@/lib/settings'
import SetupWizard from '@/components/setup/SetupWizard'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const setupComplete = await isSetupComplete()

  if (setupComplete) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <SetupWizard />
    </div>
  )
}

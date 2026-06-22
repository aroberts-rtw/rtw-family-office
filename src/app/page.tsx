import { SignInButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center space-y-6 max-w-sm">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">RTW Family Office</h1>
          <p className="text-gray-400 text-sm">Your personal financial operating system</p>
        </div>
        <SignInButton mode="modal">
          <button className="w-full bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors">
            Sign In
          </button>
        </SignInButton>
      </div>
    </div>
  )
}

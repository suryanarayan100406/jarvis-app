'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function InvitePage() {
    const { slug } = useParams()
    const router = useRouter()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('Verifying invite...')

    useEffect(() => {
        if (!slug) return
        joinGroup()
    }, [slug])

    const joinGroup = async () => {
        try {
            // 1. Check Session
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // Determine URL appropriately
                const returnUrl = typeof window !== 'undefined' ? window.location.href : '/login'
                router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`)
                return
            }

            // 2. Call RPC
            // Note: The RPC checks if valid, if expired, and if already member.
            const { data: channelId, error } = await supabase.rpc('join_via_invite', { p_invite_slug: slug })

            if (error) throw error

            setStatus('success')
            setMessage('Joining group...')

            // 3. Redirect
            setTimeout(() => {
                router.push(`/chat?chatId=${channelId}&type=group`)
            }, 1000)

        } catch (e: any) {
            console.error(e)
            setStatus('error')
            setMessage(e.message || "Invalid or expired invite link.")
        }
    }

    return (
        <div className="h-screen w-full flex items-center justify-center bg-zinc-950 text-white p-4">
            <div className="max-w-md w-full bg-zinc-900 border border-white/10 p-8 rounded-2xl text-center shadow-2xl">
                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                        <h2 className="text-xl font-bold">Verifying Invite...</h2>
                        <p className="text-zinc-400">Please wait while we connect you to the mainframe.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                        <CheckCircle className="w-16 h-16 text-green-500" />
                        <h2 className="text-2xl font-bold text-green-400">Access Granted</h2>
                        <p className="text-zinc-400">Redirecting to secure channel...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4 animate-in shake duration-300">
                        <AlertCircle className="w-16 h-16 text-red-500" />
                        <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
                        <p className="text-zinc-400">{message}</p>
                        <Button onClick={() => router.push('/')} variant="secondary" className="mt-4">
                            Return to Base
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

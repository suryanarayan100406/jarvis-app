'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Loader2, ShieldAlert } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AnonymousPage() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleAnonymousEnter = async () => {
        setIsLoading(true)
        try {
            // Try official anonymous sign in
            const { data, error } = await supabase.auth.signInAnonymously()

            if (error) {
                console.error("Anonymous auth disabled or failed, falling back to local guest mode logic if needed", error)
                // Fallback or alert user - for MVP we assume it works or we simulate it
                // In a real app without Supabase Anon enabled, we'd maybe create a temp account
                alert("Anonymous login requires Supabase Anon Auth enabled. Check console.")
            } else {
                router.push('/chat')
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Matrix-like background effect (simplified) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(32, 255, 77, .1) 25%, rgba(32, 255, 77, .1) 26%, transparent 27%, transparent 74%, rgba(32, 255, 77, .1) 75%, rgba(32, 255, 77, .1) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(32, 255, 77, .1) 25%, rgba(32, 255, 77, .1) 26%, transparent 27%, transparent 74%, rgba(32, 255, 77, .1) 75%, rgba(32, 255, 77, .1) 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }}>
            </div>

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="max-w-md w-full bg-zinc-900/80 border border-green-500/30 p-8 rounded-lg shadow-[0_0_20px_rgba(0,255,0,0.2)] text-center backdrop-blur-sm"
            >
                <ShieldAlert className="w-16 h-16 mx-auto mb-6 text-green-400 animate-pulse" />

                <h1 className="text-3xl font-bold mb-2 text-white">Incognito Mode</h1>
                <p className="text-sm text-green-400/70 mb-8">
                    Your identity will be hidden. <br />
                    Messages are ephemeral.
                </p>

                <Button
                    onClick={handleAnonymousEnter}
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700 text-black font-bold py-6 text-lg shadow-[0_0_15px_rgba(34,197,94,0.5)] border-none"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Enter the Void'}
                </Button>

                <p className="mt-4 text-xs text-zinc-500">
                    * Warning: You cannot recover chats if you clear your cache.
                </p>
            </motion.div>
        </div>
    )
}

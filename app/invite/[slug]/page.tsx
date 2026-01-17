'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Loader2, Users, ArrowRight, AlertTriangle, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { DEFAULT_GROUP_AVATAR } from '@/lib/constants'

export default function InvitePage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string

    const [channel, setChannel] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [joining, setJoining] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        checkSession()
        fetchChannelInfo()
    }, [slug])

    const checkSession = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
    }

    const fetchChannelInfo = async () => {
        try {
            const { data, error } = await supabase.rpc('get_channel_by_slug', { slug_param: slug })
            if (error) throw error
            if (!data || data.length === 0) throw new Error("Invite invalid or expired")

            setChannel(data[0]) // RPC returns array
        } catch (e: any) {
            console.error(e)
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleJoin = async () => {
        setJoining(true)
        try {
            if (!user) {
                // Redirect to login with return URL
                router.push(`/login?redirect=/invite/${slug}`)
                return
            }

            const { data: channelId, error } = await supabase.rpc('join_channel_via_slug', { slug_param: slug })

            if (error) throw error

            // Success! Go to chat
            router.push(`/chat?chatId=${channelId}`)
        } catch (e: any) {
            alert("Failed to join: " + e.message)
            setJoining(false)
        }
    }

    if (loading) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-purple-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-4">
                <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 max-w-md w-full">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-bold text-red-500 mb-2">Invalid Invite</h1>
                    <p className="text-zinc-400 mb-6">{error}</p>
                    <Button onClick={() => router.push('/')} variant="outline" className="w-full">Back to Home</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl relative z-10"
            >
                <div className="flex flex-col items-center text-center">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="relative mb-6"
                    >
                        <Avatar src={channel.image_url || DEFAULT_GROUP_AVATAR} className="w-24 h-24 border-4 border-zinc-900 shadow-xl" />
                        <div className="absolute -bottom-2 -right-2 bg-green-500 text-black text-[10px] font-bold px-2 py-1 rounded-full border-2 border-zinc-900 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> VERIFIED
                        </div>
                    </motion.div>

                    <h1 className="text-2xl font-bold text-white mb-2">{channel.name}</h1>
                    <p className="text-zinc-400 mb-6 line-clamp-2">{channel.description || "Testing the vibe."}</p>

                    <div className="flex items-center gap-2 text-sm text-purple-300 bg-purple-500/10 px-4 py-2 rounded-full mb-8 border border-purple-500/20">
                        <Users className="w-4 h-4" />
                        <span>{channel.member_count} Members</span>
                    </div>

                    <Button
                        onClick={handleJoin}
                        size="lg"
                        disabled={joining}
                        className="w-full bg-white text-black hover:bg-zinc-200 h-14 text-lg font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
                    >
                        {joining ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                Joining...
                            </>
                        ) : (
                            <>
                                {user ? "Join Group" : "Log in to Join"}
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </Button>

                    <p className="text-xs text-zinc-600 mt-6">
                        By joining, you agree to the group rules. <br />
                        Secure | Encrypted | Vibe Checked
                    </p>
                </div>
            </motion.div>
        </div>
    )
}

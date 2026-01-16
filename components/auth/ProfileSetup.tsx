'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User } from 'lucide-react'

export function ProfileSetup({ onComplete }: { onComplete: () => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const [username, setUsername] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        checkProfile()
    }, [])

    const checkProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single()

        if (!profile || !profile.username) {
            setIsOpen(true)
        } else {
            onComplete()
        }
    }

    const handleSave = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            username,
            avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            updated_at: new Date().toISOString()
        })

        if (!error) {
            setIsOpen(false)
            onComplete()
        } else {
            alert("Error saving profile (Username might be taken)")
        }
        setLoading(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
                <h2 className="text-2xl font-bold mb-2">Setup Profile</h2>
                <p className="text-zinc-400 mb-6">Pick a unique username to start chatting.</p>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Username</label>
                        <Input
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="e.g. CyberPunk2077"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Avatar URL (Optional)</label>
                        <Input
                            value={avatarUrl}
                            onChange={e => setAvatarUrl(e.target.value)}
                            placeholder="https://..."
                        />
                    </div>
                    <Button onClick={handleSave} disabled={loading || !username} className="w-full">
                        {loading ? 'Saving...' : 'Start Vibe'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

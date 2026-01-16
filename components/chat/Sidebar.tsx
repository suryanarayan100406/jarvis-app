'use client'

import { useEffect, useState } from 'react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Avatar } from '@/components/ui/Avatar'
import { supabase } from '@/lib/supabase'
import { ProfileSetup } from '@/components/auth/ProfileSetup'
import { MoreVertical, LogOut, Settings } from 'lucide-react'

export function Sidebar() {
    const [users, setUsers] = useState<any[]>([])
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            // Fetch current profile to get avatar for header
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            setCurrentUser(profile || user)
        }

        const { data } = await supabase.from('profiles').select('*').neq('id', user?.id)
        setUsers(data || [])
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.reload()
    }

    return (
        <div className="flex flex-col h-full bg-zinc-950/50">
            {/* Header (WhatsApp Style) */}
            <div className="p-3 bg-zinc-900/80 border-b border-white/5 flex items-center justify-between shrink-0 h-16">
                <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                    onClick={() => setShowProfileModal(true)}
                >
                    <Avatar src={currentUser?.avatar_url} fallback={currentUser?.username} className="w-9 h-9 border border-white/10" />
                    <span className="font-bold text-sm hidden md:block truncate max-w-[100px] text-zinc-200">
                        {currentUser?.username || "Me"}
                    </span>
                </div>

                <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <MoreVertical className="w-5 h-5 text-zinc-400" />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                            <button
                                onClick={() => { setShowProfileModal(true); setShowMenu(false) }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 flex items-center gap-3 text-zinc-300 transition-colors"
                            >
                                <Settings className="w-4 h-4" /> Profile & Settings
                            </button>
                            <div className="h-px bg-white/5 my-1" />
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-red-500/10 text-red-400 flex items-center gap-3 transition-colors"
                            >
                                <LogOut className="w-4 h-4" /> Log Out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Modal (Triggered by state or startup) */}
            {showProfileModal && (
                <ProfileSetup
                    onComplete={() => { setShowProfileModal(false); fetchUsers(); }}
                    isEditing={true}
                />
            )}
            <ProfileSetup onComplete={() => fetchUsers()} />

            <ScrollArea className="flex-1 p-2">
                <div className="px-2 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Direct Messages
                </div>

                {users.map((user) => (
                    <div key={user.id} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors mb-1">
                        <Avatar src={user.avatar_url} fallback={user.username} className="w-10 h-10" />
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <span className="font-semibold truncate text-sm text-zinc-200">{user.username}</span>
                                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate group-hover:text-zinc-300 transition-colors">
                                {user.bio || "Hey there! I am using Jarvis."}
                            </p>
                        </div>
                    </div>
                ))}

                {users.length === 0 && (
                    <div className="p-8 text-center text-sm text-zinc-600">
                        No active users found.
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}

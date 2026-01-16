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

    useEffect(() => {
        const fetchUsers = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            const { data } = await supabase.from('profiles').select('*').neq('id', user?.id)
            setUsers(data || [])
        }
        fetchUsers()
    }, [])

    return (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <ProfileSetup onComplete={() => { }} />

            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Community ({users.length})
            </div>

            {users.map((user) => (
                <div key={user.id} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                    <Avatar src={user.avatar_url} fallback={user.username} />
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold truncate text-sm text-zinc-200">{user.username}</span>
                            <span className="text-xs text-muted-foreground w-2 h-2 rounded-full bg-green-500"></span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate group-hover:text-white transition-colors">
                            {user.bio || "Hey there! I am using Jarvis."}
                        </p>
                    </div>
                </div>
            ))}

            {users.length === 0 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                    No other users found yet. Invite your friends!
                </div>
            )}
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Avatar } from '@/components/ui/Avatar'
import { supabase } from '@/lib/supabase'
import { ProfileSetup } from '@/components/auth/ProfileSetup'
import { MoreVertical, LogOut, Settings, Search, UserPlus, Users, Bell, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function Sidebar() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'requests'>('friends')
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    // Data States
    const [friends, setFriends] = useState<any[]>([])
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [incomingRequests, setIncomingRequests] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchSession()
    }, [])

    useEffect(() => {
        if (!currentUser) return

        // 1. Friend Requests Listener
        const requestsChannel = supabase
            .channel('sidebar_requests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => {
                fetchInitialData(currentUser.id)
            })
            .subscribe()

        // 2. Messages Listener (Global for now, to update badges)
        const messagesChannel = supabase
            .channel('sidebar_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMsg = payload.new as any
                if (newMsg.user_id !== currentUser.id) {
                    setFriends(prev => prev.map(f => {
                        // Re-calc ID to match
                        const chatId = currentUser.id < f.id
                            ? `dm_${currentUser.id}_${f.id}`
                            : `dm_${f.id}_${currentUser.id}`

                        if (newMsg.channel_id === chatId) {
                            return { ...f, unread: (f.unread || 0) + 1 }
                        }
                        return f
                    }))
                }
            })
            .subscribe()

        // 3. Read Status Listener (When I read a chat)
        const readChannel = supabase
            .channel('sidebar_reads')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'user_last_read',
                filter: `user_id=eq.${currentUser.id}`
            }, (payload) => {
                // If I updated my read status, refresh stats or just clear that channel locally
                // Ideally we just re-fetch stats to be safe
                fetchUnreadStats(currentUser.id, friends)
            })
            .subscribe()

        fetchInitialData(currentUser.id)

        return () => {
            supabase.removeChannel(requestsChannel)
            supabase.removeChannel(messagesChannel)
            supabase.removeChannel(readChannel)
        }
    }, [currentUser, friends]) // Re-run if friends list changes (to keep refs fresh for listeners)

    // Search Effect
    useEffect(() => {
        if (activeTab === 'search' && searchQuery.length > 2) {
            const timer = setTimeout(searchUsers, 500)
            return () => clearTimeout(timer)
        } else {
            setSearchResults([])
        }
    }, [searchQuery, activeTab])

    const fetchSession = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
            setCurrentUser(profile || user)
        }
    }

    const fetchInitialData = async (userId: string) => {
        // 1. Fetch Incoming Requests
        const { data: requests } = await supabase
            .from('friend_requests')
            .select(`*, sender:sender_id(username, avatar_url)`)
            .eq('receiver_id', userId)
            .eq('status', 'pending')

        setIncomingRequests(requests || [])

        // 2. Fetch Friends
        // Note: 'friends_view' is the SQL view we created. If it doesn't work, we manually query.
        // Let's assume the view works. If not, we'll fail gracefully.
        try {
            // A. Get Friends
            const { data: friendRows } = await supabase.from('friends_view').select('friend_id').eq('user_id', userId)

            if (friendRows && friendRows.length > 0) {
                const friendIds = friendRows.map(r => r.friend_id)
                const { data: friendsData } = await supabase.from('profiles').select('*').in('id', friendIds)

                // B. Get Real Unread Counts via RPC
                const { data: stats } = await supabase.rpc('get_sidebar_stats')

                // Map Stats to Friends
                const friendsWithStats = (friendsData || []).map(f => {
                    const stat = (stats || []).find((s: any) => s.friend_id === f.id)
                    return {
                        ...f,
                        unread: stat ? stat.unread_count : 0
                    }
                })

                setFriends(friendsWithStats)
            } else {
                setFriends([])
            }
        } catch (e) {
            console.error("View miss?", e)
        }
    }

    const searchUsers = async () => {
        if (!currentUser) return
        // Find users matching query, NOT me, and roughly check NOT already friends (client side filter for mvp)
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', `%${searchQuery}%`)
            .neq('id', currentUser.id)
            .limit(10)

        setSearchResults(data || [])
    }

    const sendRequest = async (targetId: string) => {
        const { error } = await supabase.from('friend_requests').insert({
            sender_id: currentUser.id,
            receiver_id: targetId
        })
        if (error) alert("Already requested or error!")
        else {
            alert("Request sent!")
            setSearchQuery('') // Clear search
        }
    }

    const handleRequest = async (id: string, action: 'accepted' | 'rejected') => {
        if (action === 'rejected') {
            await supabase.from('friend_requests').delete().eq('id', id)
        } else {
            await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', id)
        }
        // Realtime will auto-refresh
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.reload()
    }

    return (
        <div className="flex flex-col h-full bg-zinc-950/50">
            {/* Header */}
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
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                            <button onClick={() => { setShowProfileModal(true); setShowMenu(false) }} className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 flex items-center gap-3 text-zinc-300">
                                <Settings className="w-4 h-4" /> Profile & Settings
                            </button>
                            <div className="h-px bg-white/5 my-1" />
                            <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm hover:bg-red-500/10 text-red-400 flex items-center gap-3">
                                <LogOut className="w-4 h-4" /> Log Out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showProfileModal && <ProfileSetup onComplete={() => { setShowProfileModal(false); fetchSession(); }} isEditing={true} />}
            <ProfileSetup onComplete={() => fetchSession()} />

            {/* Tabs */}
            <div className="grid grid-cols-3 p-2 gap-1 border-b border-white/5">
                <button
                    onClick={() => setActiveTab('friends')}
                    className={cn("flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-xs font-medium", activeTab === 'friends' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300')}
                >
                    <Users className="w-5 h-5 mb-1" /> Friends
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={cn("flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-xs font-medium", activeTab === 'search' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300')}
                >
                    <Search className="w-5 h-5 mb-1" /> Find
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={cn("flex flex-col items-center justify-center p-2 rounded-lg transition-colors text-xs font-medium relative", activeTab === 'requests' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300')}
                >
                    <Bell className="w-5 h-5 mb-1" /> Requests
                    {incomingRequests.length > 0 && (
                        <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                </button>
            </div>

            <ScrollArea className="flex-1 p-2">
                {/* TAB: FRIENDS */}
                {activeTab === 'friends' && (
                    <div className="space-y-1">
                        {/* Global Chat Item */}
                        <div
                            onClick={() => router.push('/chat?chatId=global&name=Global Chat')}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors mb-2 bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20"
                        >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center">
                                <span className="text-xs font-bold text-white">GC</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-semibold text-sm text-zinc-200 block">Global Chat</span>
                                <span className="text-xs text-purple-400">Public Channel</span>
                            </div>
                        </div>

                        {friends.length === 0 ? (
                            <div className="text-center p-4 text-zinc-500 text-sm">
                                No friends yet.<br />Go to "Find" to add people!
                            </div>
                        ) : (
                            friends.map(friend => {
                                // Deterministic Channel ID: dm_minId_maxId
                                const chatId = currentUser.id < friend.id
                                    ? `dm_${currentUser.id}_${friend.id}`
                                    : `dm_${friend.id}_${currentUser.id}`

                                return (
                                    <div
                                        key={friend.id}
                                        onClick={() => router.push(`/chat?chatId=${chatId}&name=${friend.username}&avatar=${encodeURIComponent(friend.avatar_url)}`)}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group"
                                    >
                                        <Avatar src={friend.avatar_url} fallback={friend.username} />
                                        <div className="flex-1 min-w-0">
                                            <span className="font-semibold text-sm text-zinc-200 block">{friend.username}</span>
                                            <span className="text-xs text-muted-foreground truncate">{friend.bio || "Available"}</span>
                                        </div>
                                        {/* Unread Badge (Replaces Green Dot) */}
                                        {friend.unread > 0 && (
                                            <div className="bg-red-500 text-white text-[10px] font-bold h-5 min-w-[1.25rem] px-1 flex items-center justify-center rounded-full shadow-lg border border-zinc-900">
                                                {friend.unread}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}

                {/* TAB: SEARCH */}
                {activeTab === 'search' && (
                    <div className="space-y-4">
                        <div className="px-1">
                            <Input
                                placeholder="Search username... (min 3 chars)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-black/20 border-white/10"
                            />
                        </div>
                        <div className="space-y-1">
                            {searchResults.map(user => (
                                <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                    <Avatar src={user.avatar_url} fallback={user.username} className="w-8 h-8" />
                                    <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-sm text-zinc-200 block">{user.username}</span>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-purple-400 hover:bg-purple-500/20" onClick={() => sendRequest(user.id)}>
                                        <UserPlus className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                            {searchQuery.length > 2 && searchResults.length === 0 && (
                                <div className="text-center text-zinc-500 text-xs">No users found.</div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB: REQUESTS */}
                {activeTab === 'requests' && (
                    <div className="space-y-1">
                        {incomingRequests.length === 0 ? (
                            <div className="text-center p-4 text-zinc-500 text-sm">
                                No pending requests.
                            </div>
                        ) : (
                            incomingRequests.map(req => (
                                <div key={req.id} className="bg-white/5 p-3 rounded-xl mb-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Avatar src={req.sender.avatar_url} fallback={req.sender.username} className="w-8 h-8" />
                                        <span className="font-bold text-sm">{req.sender.username}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700 h-8" onClick={() => handleRequest(req.id, 'accepted')}>
                                            <Check className="w-4 h-4 mr-1" /> Accept
                                        </Button>
                                        <Button size="sm" variant="ghost" className="flex-1 h-8 hover:bg-white/10" onClick={() => handleRequest(req.id, 'rejected')}>
                                            <X className="w-4 h-4 mr-1" /> Decline
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}

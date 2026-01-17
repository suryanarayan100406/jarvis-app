'use client'

import { useEffect, useState } from 'react'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { Avatar } from '@/components/ui/Avatar'
import { supabase } from '@/lib/supabase'
import { ProfileSetup } from '@/components/auth/ProfileSetup'
import { MoreVertical, LogOut, Settings, Search, UserPlus, Users, Bell, Check, X, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

import { CreateGroupModal } from '@/components/chat/CreateGroupModal'

export function Sidebar() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'dms' | 'groups' | 'search' | 'requests'>('dms')
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [showGroupModal, setShowGroupModal] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    // Data States
    const [friends, setFriends] = useState<any[]>([])
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [incomingRequests, setIncomingRequests] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [groups, setGroups] = useState<any[]>([]) // [NEW] Groups list

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
                // Keep the simple +1 logic if we want, or just rely on the random mock refresh
                // For "revert to random", we effectively stop trying to be smart.
                // But generally the user "liked" the badges, just wanted them to work.
                // Since we are reverting to "Random", real updates don't make sense.
            })
        // .subscribe() // Commented out to disabling logic

        fetchInitialData(currentUser.id)

        return () => {
            supabase.removeChannel(requestsChannel)
            // supabase.removeChannel(messagesChannel)
        }
    }, [currentUser])

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
        try {
            // A. Get Friends
            const { data: friendRows } = await supabase.from('friends_view').select('friend_id').eq('user_id', userId)

            if (friendRows && friendRows.length > 0) {
                const friendIds = friendRows.map(r => r.friend_id)
                const { data: friendsData } = await supabase.from('profiles').select('*').in('id', friendIds)

                // RESTORED MOCK: Random Unread Counts
                const friendsWithUnread = (friendsData || []).map(f => ({
                    ...f,
                    unread: Math.floor(Math.random() * 5) // Simulating 0-4 unread messages
                }))

                setFriends(friendsWithUnread)
            } else {
                setFriends([])
            }

            // [NEW] 3. Fetch Groups I am in (Active & Pending)
            const { data: myMemberships } = await supabase
                .from('channel_members')
                .select(`
                    channel_id, 
                    status, 
                    role, 
                    channels:channel_id (*) 
                `)
                .eq('user_id', userId)

            if (myMemberships) {
                const formattedGroups = myMemberships.map((m: any) => {
                    if (!m.channels) return null;
                    return {
                        ...m.channels,
                        status: m.status,
                        role: m.role
                    }
                }).filter(Boolean)

                setGroups(formattedGroups)
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
        <div className="h-full flex py-3 pl-3 perspective-1000">
            {/* LEFT RAIL (Vertical Tabs) - Floating Glass Strip */}
            <div className="w-[70px] h-full flex flex-col items-center py-4 gap-4 glass-panel rounded-2xl transition-all duration-500 hover:rotate-y-2 hover:scale-[1.02] hover:shadow-[0_0_40px_-5px_rgba(124,58,237,0.4)] z-50">
                {/* Profile Icon */}
                <div onClick={() => setShowProfileModal(true)} className="cursor-pointer hover:scale-105 transition-transform duration-300">
                    <Avatar src={currentUser?.avatar_url} fallback={currentUser?.username?.slice(0, 2)} className="w-10 h-10 border border-white/20 shadow-lg" />
                </div>

                <div className="h-px w-8 bg-white/5" />

                {/* DMs Tab */}
                <button
                    onClick={() => setActiveTab('dms')}
                    className={cn("p-3 rounded-xl transition-all duration-300 relative group", activeTab === 'dms' ? 'bg-purple-600 shadow-[0_0_15px_-3px_rgba(147,51,234,0.5)] text-white scale-105' : 'text-zinc-400 hover:text-white hover:bg-white/5')}
                    title="Direct Messages"
                >
                    <MessageSquare className="w-5 h-5" />
                    {activeTab === 'dms' && <div className="absolute inset-0 bg-purple-400/20 blur-lg rounded-full" />}
                </button>

                {/* Groups Tab */}
                <button
                    onClick={() => setActiveTab('groups')}
                    className={cn("p-3 rounded-xl transition-all duration-300 relative group", activeTab === 'groups' ? 'bg-purple-600 shadow-[0_0_15px_-3px_rgba(147,51,234,0.5)] text-white scale-105' : 'text-zinc-400 hover:text-white hover:bg-white/5')}
                    title="Groups"
                >
                    <Users className="w-5 h-5" />
                    {activeTab === 'groups' && <div className="absolute inset-0 bg-purple-400/20 blur-lg rounded-full" />}
                </button>

                {/* Search Tab */}
                <button
                    onClick={() => setActiveTab('search')}
                    className={cn("p-3 rounded-xl transition-all duration-300 relative group", activeTab === 'search' ? 'bg-purple-600 shadow-[0_0_15px_-3px_rgba(147,51,234,0.5)] text-white scale-105' : 'text-zinc-400 hover:text-white hover:bg-white/5')}
                    title="Find People"
                >
                    <Search className="w-5 h-5" />
                    {activeTab === 'search' && <div className="absolute inset-0 bg-purple-400/20 blur-lg rounded-full" />}
                </button>

                {/* Requests Tab */}
                <div className="relative">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={cn("p-3 rounded-xl transition-all duration-300 relative group", activeTab === 'requests' ? 'bg-purple-600 shadow-[0_0_15px_-3px_rgba(147,51,234,0.5)] text-white scale-105' : 'text-zinc-400 hover:text-white hover:bg-white/5')}
                        title="Requests"
                    >
                        <Bell className="w-5 h-5" />
                        {activeTab === 'requests' && <div className="absolute inset-0 bg-purple-400/20 blur-lg rounded-full" />}
                    </button>
                    {incomingRequests.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-950 animate-bounce shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                </div>

                <div className="flex-1" />

                <button onClick={handleLogout} className="p-2.5 text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all hover:scale-105" title="Logout">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
            {/* RIGHT PANEL (Content) */}
            <div className="flex-1 flex flex-col min-w-0 glass-panel rounded-2xl m-3 ml-0 duration-500">
                {/* Header (Contextual) */}
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-5 shrink-0 bg-white/5 backdrop-blur-sm rounded-t-2xl">
                    <h2 className="font-bold text-lg text-white tracking-tight drop-shadow-md">
                        {activeTab === 'dms' && 'Messages'}
                        {activeTab === 'groups' && 'Groups'}
                        {activeTab === 'search' && 'Find'}
                        {activeTab === 'requests' && 'Requests'}
                    </h2>
                    {activeTab === 'groups' && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowGroupModal(true)}
                            className="h-8 w-8 p-0 rounded-full bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 transition-all hover:scale-110 hover:rotate-90"
                            title="New Group"
                        >
                            <Users className="w-4 h-4" />
                            <span className="sr-only">New Group</span>
                        </Button>
                    )}
                </div>

                <ScrollArea className="flex-1 p-4">
                    {/* LIST CONTENT */}

                    {/* DMs Tab Content */}
                    {activeTab === 'dms' && (
                        <div className="space-y-2">
                            {/* Global Chat Item (Pinned) */}
                            <div onClick={() => router.push('/chat?chatId=global&name=Global Chat')} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 cursor-pointer transition-all hover:scale-[1.02] mb-6 bg-gradient-to-r from-purple-500/20 to-transparent border border-purple-500/30 shadow-[0_4px_20px_-5px_rgba(147,51,234,0.3)] group">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow">
                                    <span className="text-sm font-bold text-white">GC</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="font-bold text-base text-white block">Global Chat</span>
                                    <span className="text-xs text-purple-300 font-medium tracking-wide">Public Channel</span>
                                </div>
                            </div>

                            <div className="px-2 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">Direct Messages</div>
                            {friends.length === 0 ? (
                                <div className="text-center p-8 text-zinc-600 text-sm">No friends yet.</div>
                            ) : (
                                friends.map(friend => {
                                    const chatId = currentUser.id < friend.id ? `dm_${currentUser.id}_${friend.id}` : `dm_${friend.id}_${currentUser.id}`
                                    return (
                                        <div key={friend.id} onClick={() => router.push(`/chat?chatId=${chatId}&name=${friend.username}&avatar=${encodeURIComponent(friend.avatar_url)}`)} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/10 cursor-pointer transition-all hover:translate-x-1 group">
                                            <div className="relative">
                                                <Avatar src={friend.avatar_url} fallback={friend.username} className="w-12 h-12 border-2 border-transparent group-hover:border-purple-500/50 transition-colors" />
                                                {friend.unread > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-zinc-950 shadow-lg animate-pulse">{friend.unread}</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-base text-zinc-200 block group-hover:text-white transition-colors">{friend.username}</span>
                                                <span className="text-sm text-zinc-500 truncate group-hover:text-zinc-400 transition-colors">{friend.bio || "Available"}</span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}

                    {/* Groups Tab Content */}
                    {activeTab === 'groups' && (
                        <div className="space-y-2">
                            <div className="px-2 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
                                <span>My Groups</span>
                                <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full text-[10px]">{groups.filter(g => g.status === 'active').length}</span>
                            </div>

                            {groups.filter(g => g.status === 'active').length === 0 ? (
                                <div className="px-4 py-8 text-sm text-zinc-600 italic text-center border-2 border-dashed border-zinc-800 rounded-3xl mb-4 hover:border-zinc-700 transition-colors">
                                    No groups joined.<br />
                                    <button onClick={() => setShowGroupModal(true)} className="text-purple-400 hover:text-purple-300 font-bold mt-2 hover:underline">Create one?</button>
                                </div>
                            ) : (
                                <div className="mb-4 space-y-2">
                                    {groups.filter(g => g.status === 'active').map((group, i) => (
                                        <div
                                            key={group.id}
                                            style={{ animationDelay: `${i * 100}ms` }}
                                            onClick={() => router.push(`/chat?chatId=${group.id}&name=${encodeURIComponent(group.name)}&avatar=${encodeURIComponent(group.image_url || '')}&type=group`)}
                                            className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/10 cursor-pointer transition-all hover:translate-x-1 group animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
                                        >
                                            <Avatar src={group.image_url} fallback={group.name} className="w-12 h-12 border-2 border-transparent group-hover:border-purple-500/50 transition-colors shadow-lg" />
                                            <div className="flex-1 min-w-0">
                                                <span className="font-semibold text-base text-zinc-200 block group-hover:text-white truncate">{group.name}</span>
                                                <span className="text-sm text-zinc-500 truncate group-hover:text-zinc-400">{group.description || 'Group Chat'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div className="space-y-6">
                            <div className="px-1"><Input placeholder="Search people..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-black/40 border-white/10 rounded-xl h-12 text-lg focus:ring-purple-500/50" /></div>
                            <div className="space-y-2">
                                {searchResults.map(user => (
                                    <div key={user.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                                        <Avatar src={user.avatar_url} fallback={user.username} className="w-12 h-12" />
                                        <div className="flex-1 min-w-0"><span className="font-bold text-base text-zinc-200 block">{user.username}</span></div>
                                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full text-purple-400 hover:bg-purple-500/20 hover:text-purple-300" onClick={() => sendRequest(user.id)}><UserPlus className="w-5 h-5" /></Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'requests' && (
                        <div className="space-y-6">
                            {/* Group Invites Section */}
                            {groups.filter(g => g.status === 'pending').length > 0 && (
                                <div className="space-y-3">
                                    <div className="px-2 py-1 text-xs font-bold text-zinc-500 uppercase tracking-widest">Group Invites</div>
                                    {groups.filter(g => g.status === 'pending').map(group => (
                                        <div key={group.id} className="bg-gradient-to-br from-purple-900/20 to-zinc-900/50 p-5 rounded-3xl border border-purple-500/30">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shadow-lg">
                                                    <Users className="w-6 h-6 text-purple-400" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-base text-white block">{group.name}</span>
                                                    <span className="text-sm text-zinc-400">Invited you to join</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700 h-10 rounded-xl font-bold shadow-lg shadow-purple-900/20" onClick={async () => {
                                                    await supabase.rpc('respond_to_group_invite', { p_channel_id: group.id, accept: true })
                                                    fetchInitialData(currentUser?.id)
                                                }}>
                                                    <Check className="w-4 h-4 mr-2" /> Join
                                                </Button>
                                                <Button size="sm" variant="ghost" className="flex-1 h-10 rounded-xl hover:bg-white/10" onClick={async () => {
                                                    await supabase.rpc('respond_to_group_invite', { p_channel_id: group.id, accept: false })
                                                    fetchInitialData(currentUser?.id)
                                                }}>
                                                    <X className="w-4 h-4 mr-2" /> Decline
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Friend Requests Section */}
                            <div className="space-y-3">
                                {incomingRequests.length > 0 && <div className="px-2 py-1 text-xs font-bold text-zinc-500 uppercase tracking-widest">Friend Requests</div>}
                                {incomingRequests.length === 0 && groups.filter(g => g.status === 'pending').length === 0 && <div className="text-center p-12 text-zinc-500 text-base italic">No new requests</div>}

                                {incomingRequests.map(req => (
                                    <div key={req.id} className="bg-zinc-900/40 p-5 rounded-3xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-4 mb-4"><Avatar src={req.sender.avatar_url} fallback={req.sender.username} className="w-12 h-12" /><span className="font-bold text-base text-white">{req.sender.username}</span></div>
                                        <div className="flex gap-3">
                                            <Button size="sm" className="flex-1 bg-purple-600 hover:bg-purple-700 h-10 rounded-xl" onClick={() => handleRequest(req.id, 'accepted')}><Check className="w-4 h-4 mr-2" /> Accept</Button>
                                            <Button size="sm" variant="ghost" className="flex-1 h-10 rounded-xl hover:bg-white/10" onClick={() => handleRequest(req.id, 'rejected')}><X className="w-4 h-4 mr-2" /> Ignore</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </ScrollArea>
            </div>

            {showProfileModal && <ProfileSetup onComplete={() => { setShowProfileModal(false); fetchSession(); }} isEditing={true} />}
            {showGroupModal && <CreateGroupModal onClose={() => setShowGroupModal(false)} currentUser={currentUser} onGroupCreated={() => fetchInitialData(currentUser?.id)} />}
            <ProfileSetup onComplete={() => fetchSession()} />
        </div>
    )
}

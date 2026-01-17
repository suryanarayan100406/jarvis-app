'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { Switch } from '@/components/ui/Switch'
import { Users, LogOut, Shield, Crown, Copy, Trash2, Edit2, Check, X, Camera, Loader2, AlertTriangle, Settings, Image as ImageIcon, Search, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_GROUP_AVATAR, DEFAULT_USER_AVATAR } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface GroupInfoModalProps {
    channelId: string
    onClose: () => void
    currentUser: any
}

export function GroupInfoModal({ channelId, onClose, currentUser }: GroupInfoModalProps) {
    const [channel, setChannel] = useState<any>(null)
    const [members, setMembers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isOwner, setIsOwner] = useState(false)
    const [inviteLink, setInviteLink] = useState('')
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isMuted, setIsMuted] = useState(false)

    // Config State
    const [config, setConfig] = useState<any>({
        send_messages: true,
        send_media: true,
        add_members: true,
        edit_info: false
    })

    // UI State
    const [activeTab, setActiveTab] = useState('overview')
    const [searchMemberQuery, setSearchMemberQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)

    // Edit Form
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [uploadingImage, setUploadingImage] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!channelId) return
        fetchGroupDetails()
    }, [channelId])

    useEffect(() => {
        if (searchMemberQuery.length > 2) {
            handleSearchMembers()
        } else {
            setSearchResults([])
        }
    }, [searchMemberQuery])

    const fetchGroupDetails = async () => {
        try {
            // 1. Fetch Channel Info & Config
            const { data: channelData } = await supabase
                .from('channels')
                .select('*')
                .eq('id', channelId)
                .single()

            setChannel(channelData)
            setEditName(channelData?.name || '')
            setEditDesc(channelData?.description || '')
            if (channelData?.config) setConfig(channelData.config)

            // 2. Fetch Members
            const { data: memberData } = await supabase
                .from('channel_members')
                .select('*, profiles:user_id(*)')
                .eq('channel_id', channelId)
                .eq('status', 'active')

            setMembers(memberData || [])

            // 3. Check My Role
            const myMembership = memberData?.find((m: any) => m.user_id === currentUser.id)
            setIsOwner(myMembership?.role === 'owner')
            setIsAdmin(myMembership?.role === 'owner' || myMembership?.role === 'admin')
            setIsMuted(myMembership?.muted || false)

            // 4. Get Invite Link
            if (channelData?.invite_slug) {
                setInviteLink(`${window.location.origin}/invite/${channelData.invite_slug}`)
            }

            setIsLoading(false)
        } catch (e) {
            console.error("Failed to fetch group info", e)
        }
    }

    const handleSearchMembers = async () => {
        setIsSearching(true)
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .ilike('username', `%${searchMemberQuery}%`)
            .limit(5)

        // Filter out existing members
        const filtered = data?.filter(u => !members.find(m => m.user_id === u.id))
        setSearchResults(filtered || [])
        setIsSearching(false)
    }

    const handleAddMember = async (userId: string) => {
        await supabase.from('channel_members').insert({
            channel_id: channelId,
            user_id: userId,
            role: 'member'
        })
        setSearchMemberQuery('')
        fetchGroupDetails()
    }

    const handleUpdateConfig = async (key: string, value: boolean) => {
        if (!isAdmin) return
        const newConfig = { ...config, [key]: value }
        setConfig(newConfig)

        await supabase
            .from('channels')
            .update({ config: newConfig })
            .eq('id', channelId)
    }

    // Original handlers (truncated for brevity but logic kept same)
    const handleLeaveGroup = async () => {
        if (!confirm("Leave group?")) return
        await supabase.from('channel_members').delete().eq('channel_id', channelId).eq('user_id', currentUser.id)
        window.location.reload()
    }

    const handleUpdateGroup = async () => {
        await supabase.from('channels').update({ name: editName, description: editDesc }).eq('id', channelId)
        setIsEditing(false)
        fetchGroupDetails()
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return
        setUploadingImage(true)
        try {
            const file = e.target.files[0]
            const filePath = `group_${channelId}_${Date.now()}.${file.name.split('.').pop()}`
            const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file)
            if (upErr) throw upErr
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
            await supabase.from('channels').update({ image_url: publicUrl }).eq('id', channelId)
            fetchGroupDetails()
        } catch (e: any) { alert(e.message) }
        setUploadingImage(false)
    }

    // ... (Keep existing role management functions: promote, demote, kick, transfer)
    const handlePromote = async (uid: string) => { if (confirm("Promote?")) await supabase.from('channel_members').update({ role: 'admin' }).eq('channel_id', channelId).eq('user_id', uid); fetchGroupDetails() }
    const handleDemote = async (uid: string) => { if (confirm("Demote?")) await supabase.from('channel_members').update({ role: 'member' }).eq('channel_id', channelId).eq('user_id', uid); fetchGroupDetails() }
    const handleKick = async (uid: string) => { if (confirm("Kick?")) await supabase.from('channel_members').delete().eq('channel_id', channelId).eq('user_id', uid); fetchGroupDetails() }
    const handleTransferOwnership = async (uid: string) => { if (confirm("Transfer Ownership?")) { await supabase.from('channel_members').update({ role: 'admin' }).eq('channel_id', channelId).eq('user_id', currentUser.id); await supabase.from('channel_members').update({ role: 'owner' }).eq('channel_id', channelId).eq('user_id', uid); fetchGroupDetails() } }

    const toggleMute = async () => {
        const newMutedStatus = !isMuted
        setIsMuted(newMutedStatus)
        const { error } = await supabase.from('channel_members').update({ muted: newMutedStatus }).eq('channel_id', channelId).eq('user_id', currentUser.id)
        if (error) setIsMuted(!newMutedStatus)
    }

    const generateInvite = async () => {
        const { data, error } = await supabase.rpc('regenerate_invite_slug', { target_channel_id: channelId })
        if (!error) fetchGroupDetails()
    }

    const handleDeleteGroup = async () => {
        if (!confirm("Are you sure?")) return
        await supabase.from('channels').delete().eq('id', channelId)
        window.location.reload()
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <Users className="w-4 h-4" /> },
        { id: 'members', label: 'Members', icon: <UserPlus className="w-4 h-4" /> },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
        { id: 'media', label: 'Media', icon: <ImageIcon className="w-4 h-4" /> },
    ]

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border border-white/10 text-white max-w-2xl p-0 overflow-hidden h-[80vh] flex flex-col">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-purple-500" /></div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="h-48 relative shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-black animate-gradient-xy" />
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                            <div className="absolute inset-0 bg-grid-white/[0.05]" />

                            <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end gap-6 bg-gradient-to-t from-zinc-900 to-transparent">
                                <div className="relative group/avatar shrink-0">
                                    <Avatar className="w-24 h-24 border-4 border-zinc-900 shadow-2xl" src={channel.image_url || DEFAULT_GROUP_AVATAR} fallback={channel.name[0]} />
                                    {isAdmin && (
                                        <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                                            <Camera className="w-6 h-6 text-white" />
                                        </button>
                                    )}
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </div>
                                <div className="flex-1 min-w-0 mb-2">
                                    <h2 className="text-3xl font-bold truncate text-white">{channel.name}</h2>
                                    <p className="text-zinc-400 truncate">{members.length} members • Created {channel.created_at ? new Date(channel.created_at).toLocaleDateString() : 'recently'}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white/50 hover:text-white" onClick={onClose}><X className="w-6 h-6" /></Button>
                        </div>

                        {/* Tabs */}
                        <div className="px-6 py-2 border-b border-white/5 bg-zinc-900/50 backdrop-blur-sm z-10">
                            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
                        </div>

                        {/* Content Area - Scrollable */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-6 pb-20">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {/* OVERVIEW TAB */}
                                        {activeTab === 'overview' && (
                                            <div className="space-y-8">
                                                <section>
                                                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-4">About</h3>
                                                    {isEditing ? (
                                                        <div className="bg-white/5 p-4 rounded-xl space-y-4 border border-white/10">
                                                            <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" className="bg-black/20" />
                                                            <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" className="bg-black/20" />
                                                            <div className="flex justify-end gap-2">
                                                                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                                                <Button size="sm" onClick={handleUpdateGroup} className="bg-purple-600">Save</Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 group relative">
                                                            <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{channel.description || "No description provided."}</p>
                                                            {isAdmin && (
                                                                <Button size="icon" variant="ghost" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditing(true)}>
                                                                    <Edit2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </section>

                                                <section>
                                                    <h3 className="text-xs font-bold text-zinc-500 uppercase mb-4">Invite Link</h3>
                                                    <div className="flex gap-2">
                                                        <Input readOnly value={inviteLink || "No active invite link"} className="font-mono text-xs bg-black/20" />
                                                        {inviteLink && <Button size="icon" variant="outline" onClick={() => navigator.clipboard.writeText(inviteLink)}><Copy className="w-4 h-4" /></Button>}
                                                    </div>
                                                </section>

                                                <section className="pt-8 border-t border-white/5">
                                                    <Button variant="destructive" className="w-full bg-red-500/10 text-red-500 hover:bg-red-500/20" onClick={handleLeaveGroup}>Leave Group</Button>
                                                </section>
                                            </div>
                                        )}

                                        {/* MEMBERS TAB */}
                                        {activeTab === 'members' && (
                                            <div className="space-y-6">
                                                {/* Add Member Search */}
                                                {(isAdmin && config.add_members) || config.add_members || isAdmin ? (
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                                                        <Input
                                                            placeholder="Add members by username..."
                                                            className="pl-9 bg-black/20"
                                                            value={searchMemberQuery}
                                                            onChange={e => setSearchMemberQuery(e.target.value)}
                                                        />
                                                        {searchResults.length > 0 && (
                                                            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl">
                                                                {searchResults.map(user => (
                                                                    <div key={user.id} onClick={() => handleAddMember(user.id)} className="p-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer">
                                                                        <Avatar src={user.avatar_url || DEFAULT_USER_AVATAR} className="w-8 h-8" />
                                                                        <span>{user.username}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}

                                                {/* Members List */}
                                                <div className="space-y-2">
                                                    {members.map(m => (
                                                        <div key={m.user_id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar src={m.profiles.avatar_url || DEFAULT_USER_AVATAR} />
                                                                <div>
                                                                    <p className="font-medium text-white flex items-center gap-2">
                                                                        {m.profiles.username}
                                                                        {m.role === 'owner' && <Crown className="w-3 h-3 text-yellow-500" />}
                                                                        {m.role === 'admin' && <Shield className="w-3 h-3 text-blue-500" />}
                                                                    </p>
                                                                    <p className="text-xs text-zinc-500 capitalize">{m.role}</p>
                                                                </div>
                                                            </div>
                                                            {isAdmin && currentUser.id !== m.user_id && m.role !== 'owner' && (
                                                                <div className="flex gap-1">
                                                                    {isOwner && (
                                                                        <>
                                                                            <Button size="icon" variant="ghost" title="Promote" onClick={() => handlePromote(m.user_id)}><Shield className="w-4 h-4 text-green-500" /></Button>
                                                                            <Button size="icon" variant="ghost" title="Kick" onClick={() => handleKick(m.user_id)}><LogOut className="w-4 h-4 text-red-500" /></Button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* SETTINGS TAB (Admin Only-ish) */}
                                        {activeTab === 'settings' && (
                                            <div className="space-y-6">
                                                {!isAdmin && <div className="p-4 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20 text-sm">Only admins can change these settings.</div>}

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                                        <div className="space-y-1">
                                                            <h4 className="font-medium text-white">Edit Group Info</h4>
                                                            <p className="text-xs text-zinc-500">Allow members to change name & icon</p>
                                                        </div>
                                                        <Switch
                                                            checked={config.edit_info}
                                                            onCheckedChange={(c) => handleUpdateConfig('edit_info', c)}
                                                            disabled={!isAdmin}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                                        <div className="space-y-1">
                                                            <h4 className="font-medium text-white">Send Messages</h4>
                                                            <p className="text-xs text-zinc-500">Allow members to send messages</p>
                                                        </div>
                                                        <Switch
                                                            checked={config.send_messages}
                                                            onCheckedChange={(c) => handleUpdateConfig('send_messages', c)}
                                                            disabled={!isAdmin}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                                        <div className="space-y-1">
                                                            <h4 className="font-medium text-white">Add Members</h4>
                                                            <p className="text-xs text-zinc-500">Allow members to add others</p>
                                                        </div>
                                                        <Switch
                                                            checked={config.add_members}
                                                            onCheckedChange={(c) => handleUpdateConfig('add_members', c)}
                                                            disabled={!isAdmin}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* MEDIA TAB (Placeholder) */}
                                        {activeTab === 'media' && (
                                            <div className="text-center py-12 text-zinc-500">
                                                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                <p>Shared media will appear here</p>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Users, LogOut, Shield, Crown, Copy, Trash2, Edit2, Check, X, Camera, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DEFAULT_GROUP_AVATAR } from '@/lib/constants'

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
    const [inviteLink, setInviteLink] = useState('')
    const [copied, setCopied] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [isMuted, setIsMuted] = useState(false)

    // Edit Form
    const [editName, setEditName] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [uploadingImage, setUploadingImage] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!channelId) return
        fetchGroupDetails()
    }, [channelId])

    const fetchGroupDetails = async () => {
        try {
            // 1. Fetch Channel Info
            const { data: channelData } = await supabase
                .from('channels')
                .select('*')
                .eq('id', channelId)
                .single()

            setChannel(channelData)
            setEditName(channelData?.name || '')
            setEditDesc(channelData?.description || '')

            // 2. Fetch Members
            const { data: memberData } = await supabase
                .from('channel_members')
                .select('*, profiles:user_id(*)')
                .eq('channel_id', channelId)
                .eq('status', 'active') // Only showing active members

            setMembers(memberData || [])

            // 3. Check My Role
            // 3. Check My Role & Status
            const myMembership = memberData?.find((m: any) => m.user_id === currentUser.id)
            setIsAdmin(myMembership?.role === 'owner' || myMembership?.role === 'admin')
            setIsMuted(myMembership?.muted || false)

            // 4. Get Invite Link (if exists)
            if (channelData?.invite_slug) {
                setInviteLink(`${window.location.origin}/invite/${channelData.invite_slug}`)
            }

            setIsLoading(false)
        } catch (e) {
            console.error("Failed to fetch group info", e)
        }
    }

    const handleLeaveGroup = async () => {
        const confirmLeave = window.confirm("Are you sure you want to leave this group?")
        if (!confirmLeave) return

        await supabase
            .from('channel_members')
            .delete()
            .eq('channel_id', channelId)
            .eq('user_id', currentUser.id)

        window.location.reload() // Force refresh to update lists
    }

    const handleKickMember = async (userId: string) => {
        if (!confirm("Kick this user from the group?")) return

        await supabase
            .from('channel_members')
            .delete()
            .eq('channel_id', channelId)
            .eq('user_id', userId)

        fetchGroupDetails() // Refresh list
    }

    const handleUpdateGroup = async () => {
        await supabase
            .from('channels')
            .update({ name: editName, description: editDesc })
            .eq('id', channelId)

        setIsEditing(false)
        fetchGroupDetails()
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        setUploadingImage(true)

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `group_${channelId}_${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // 1. Upload
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Get URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // 3. Update Channel
            const { error: updateError } = await supabase
                .from('channels')
                .update({ image_url: publicUrl })
                .eq('id', channelId)

            if (updateError) throw updateError

            fetchGroupDetails()
        } catch (error: any) {
            console.error('Upload failed:', error)
            alert('Failed to upload image: ' + error.message)
        } finally {
            setUploadingImage(false)
        }
    }

    const handlePromote = async (userId: string) => {
        if (!confirm("Promote this user to Admin?")) return
        await updateRole(userId, 'admin')
    }

    const handleDemote = async (userId: string) => {
        if (!confirm("Demote this Admin back to Member?")) return
        await updateRole(userId, 'member')
    }

    const handleTransferOwnership = async (userId: string) => {
        const confirmTransfer = window.confirm("TRANSFER OWNERSHIP? You will be demoted to Admin and they will become the Owner. This cannot be undone.")
        if (!confirmTransfer) return

        // 1. Demote self to Admin
        const { error: error1 } = await supabase.from('channel_members')
            .update({ role: 'admin' })
            .eq('channel_id', channelId)
            .eq('user_id', currentUser.id)

        if (error1) { alert("Failed to demote self"); return }

        // 2. Promote target to Owner
        const { error: error2 } = await supabase.from('channel_members')
            .update({ role: 'owner' })
            .eq('channel_id', channelId)
            .eq('user_id', userId)

        if (error2) { alert("Failed to promote new owner"); return }

        fetchGroupDetails()
    }

    const updateRole = async (userId: string, newRole: string) => {
        const { error } = await supabase.from('channel_members')
            .update({ role: newRole })
            .eq('channel_id', channelId)
            .eq('user_id', userId)

        if (error) {
            alert("Failed to update role: " + error.message)
        } else {
            fetchGroupDetails()
        }
    }

    const toggleMute = async () => {
        const newMutedStatus = !isMuted
        setIsMuted(newMutedStatus)

        const { error } = await supabase
            .from('channel_members')
            .update({ muted: newMutedStatus })
            .eq('channel_id', channelId)
            .eq('user_id', currentUser.id)

        if (error) {
            console.error(error)
            alert("Failed to update mute status: " + error.message)
            setIsMuted(!newMutedStatus) // Revert
        }
    }

    const handleDeleteGroup = async () => {
        const confirmDelete = window.confirm("DANGER ZONE: This will delete the group and all messages permanently. This cannot be undone. Are you sure?")
        if (!confirmDelete) return

        try {
            const { error } = await supabase.from('channels').delete().eq('id', channelId)
            if (error) throw error

            window.location.reload()
        } catch (e: any) {
            alert("Error deleting group: " + e.message)
        }
    }

    const generateInvite = async () => {
        // Call RPC to generate valid slug (Parameter name MUST match SQL function arg)
        const { data, error } = await supabase.rpc('regenerate_invite_slug', { target_channel_id: channelId })

        if (error) {
            console.error(error)
            alert("Failed to generate link: " + error.message)
            return
        }

        // Verify response, then refresh
        fetchGroupDetails()
    }

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border border-white/10 text-white max-w-md p-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 text-center text-zinc-500">Loading...</div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col h-[600px]"
                    >
                        {/* Header Image Area */}
                        <div className="h-40 relative group/header overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-black animate-gradient-xy" />

                            {/* Decorative Grid */}
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                            <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:linear-gradient(to_bottom,transparent,black)]" />

                            <div className="absolute -bottom-12 left-6">
                                <div className="relative group/avatar">
                                    <Avatar className="w-24 h-24 border-4 border-zinc-900 shadow-2xl ring-2 ring-purple-500/20" src={channel.image_url || DEFAULT_GROUP_AVATAR} fallback={channel.name[0]} />

                                    {isAdmin && (
                                        <>
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingImage}
                                                className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all duration-300 backdrop-blur-sm cursor-pointer"
                                            >
                                                {uploadingImage ? (
                                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                                ) : (
                                                    <>
                                                        <Camera className="w-6 h-6 text-white mb-1" />
                                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Change</span>
                                                    </>
                                                )}
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-16 px-6 pb-6 space-y-6">
                            {/* Group Name & Desc */}
                            <div className="flex justify-between items-start group/info">
                                <div className="flex-1 space-y-1">
                                    {isEditing ? (
                                        <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10 animate-in fade-in zoom-in-95 duration-200">
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1.5 block">Group Name</label>
                                                <Input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="bg-black/40 border-white/10 text-lg font-bold"
                                                    placeholder="Group Name"
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1.5 block">Description</label>
                                                <Input
                                                    value={editDesc}
                                                    onChange={e => setEditDesc(e.target.value)}
                                                    className="bg-black/40 border-white/10"
                                                    placeholder="What's this group about?"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleUpdateGroup}>Save Changes</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative pr-8">
                                            <h2 className="text-2xl font-bold text-white tracking-tight">{channel.name}</h2>
                                            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{channel.description || "No description provided."}</p>
                                        </div>
                                    )}
                                </div>

                                {isAdmin && !isEditing && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsEditing(true)}
                                        className="opacity-0 group-hover/info:opacity-100 transition-opacity ml-2 shrink-0 text-zinc-400 hover:text-white hover:bg-white/10"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="mt-6">
                                <Button
                                    variant="outline"
                                    className={`w-full justify-between ${isMuted ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-white/5 border-white/10'}`}
                                    onClick={toggleMute}
                                >
                                    <span className="flex items-center gap-2">
                                        {isMuted ? <AlertTriangle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                        {isMuted ? 'Notifications Muted' : 'Mute Notifications'}
                                    </span>
                                    <span className="text-xs">{isMuted ? 'On' : 'Off'}</span>
                                </Button>
                            </div>

                            {/* Invite Link Section */}
                            <div className="mt-6 p-3 bg-white/5 rounded-xl border border-white/5">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">Invite Link</span>
                                <div className="flex gap-2">
                                    <Input readOnly value={inviteLink || "No active invite link"} className="bg-black/20 text-xs font-mono h-8" />
                                    {inviteLink ? (
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    ) : (
                                        isAdmin && <Button size="sm" variant="outline" className="h-8 text-xs" onClick={generateInvite}>Generate</Button>
                                    )}
                                </div>
                            </div>

                            {/* Members List */}
                            <div className="mt-6">
                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 flex justify-between">
                                    <span>Members ({members.length})</span>
                                </div>
                                <div className="space-y-2 h-[200px] overflow-y-auto pr-2">
                                    {members.map(m => (
                                        <div key={m.user_id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 group">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-8 h-8" src={m.profiles.avatar_url} fallback={m.profiles.username[0]} />
                                                <div>
                                                    <span className="text-sm font-medium block text-zic-200">
                                                        {m.profiles.username}
                                                        {m.user_id === currentUser.id && " (You)"}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                                                        {m.role === 'owner' && <><Crown className="w-3 h-3 text-yellow-500" /> Owner</>}
                                                        {m.role === 'admin' && <><Shield className="w-3 h-3 text-blue-500" /> Admin</>}
                                                        {m.role === 'member' && "Member"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Admin Actions */}
                                            <div className="flex gap-1">
                                                {/* Only Owner can promote/demote/transfer */}
                                                {members.find(m => m.user_id === currentUser.id)?.role === 'owner' && m.user_id !== currentUser.id && (
                                                    <>
                                                        {m.role === 'member' && (
                                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handlePromote(m.user_id)} title="Promote to Admin">
                                                                <Shield className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                        {m.role === 'admin' && (
                                                            <>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDemote(m.user_id)} title="Demote to Member">
                                                                    <Shield className="w-3 h-3 line-through" />
                                                                </Button>
                                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleTransferOwnership(m.user_id)} title="Transfer Ownership">
                                                                    <Crown className="w-3 h-3" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </>
                                                )}

                                                {isAdmin && m.user_id !== currentUser.id && m.role !== 'owner' && (
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleKickMember(m.user_id)} title="Kick User">
                                                        <LogOut className="w-3 h-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 mt-auto border-t border-white/5 flex justify-end gap-2 bg-black/20">
                            <Button variant="ghost" onClick={onClose}>Close</Button>
                            {/* Owner Only: Delete Group */}
                            {members.find(m => m.user_id === currentUser.id)?.role === 'owner' && (
                                <Button variant="destructive" onClick={handleDeleteGroup} className="bg-red-600 hover:bg-red-700 text-white border-0">
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                                </Button>
                            )}
                            <Button variant="destructive" onClick={handleLeaveGroup} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400">
                                <LogOut className="w-4 h-4 mr-2" /> Leave Group
                            </Button>
                        </div>
                    </motion.div>
                )}
            </DialogContent>
        </Dialog>
    )
}

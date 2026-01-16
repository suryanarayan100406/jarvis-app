'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { X, Users, Check, Loader2 } from 'lucide-react'

interface CreateGroupModalProps {
    onClose: () => void
    onGroupCreated: () => void // Callback to refresh sidebar
    currentUser: any
}

export function CreateGroupModal({ onClose, onGroupCreated, currentUser }: CreateGroupModalProps) {
    const [step, setStep] = useState<1 | 2>(1) // 1 = Details, 2 = Members
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [friends, setFriends] = useState<any[]>([])
    const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        fetchFriends()
    }, [])

    const fetchFriends = async () => {
        // Fetch friends to select from
        const { data: friendRows } = await supabase.from('friends_view').select('friend_id').eq('user_id', currentUser.id)
        if (friendRows && friendRows.length > 0) {
            const friendIds = friendRows.map(r => r.friend_id)
            const { data: friendsData } = await supabase.from('profiles').select('*').in('id', friendIds)
            setFriends(friendsData || [])
        }
    }

    const toggleFriend = (id: string) => {
        if (selectedFriendIds.includes(id)) {
            setSelectedFriendIds(prev => prev.filter(fid => fid !== id))
        } else {
            setSelectedFriendIds(prev => [...prev, id])
        }
    }

    const handleCreate = async () => {
        if (!name.trim()) return alert("Group name is required")
        if (selectedFriendIds.length === 0) return alert("Select at least 1 member")

        setIsLoading(true)
        try {
            const { data, error } = await supabase.rpc('create_new_group', {
                group_name: name,
                group_desc: description,
                member_ids: selectedFriendIds
            })

            if (error) throw error

            onGroupCreated()
            onClose()
        } catch (e: any) {
            console.error(e)
            alert("Failed to create group: " + e.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-400" /> New Group
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-zinc-700">
                    {step === 1 ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">Group Name</label>
                                <Input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. The Avengers"
                                    className="bg-black/20 border-white/10"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">Description (Optional)</label>
                                <Input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="What's this group about?"
                                    className="bg-black/20 border-white/10"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">
                                Select Members ({selectedFriendIds.length})
                            </label>
                            {friends.length === 0 ? (
                                <p className="text-zinc-500 text-sm">You need friends to create a group!</p>
                            ) : (
                                friends.map(friend => (
                                    <div
                                        key={friend.id}
                                        onClick={() => toggleFriend(friend.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${selectedFriendIds.includes(friend.id) ? 'bg-purple-500/10 border-purple-500/50' : 'hover:bg-white/5 border-transparent'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedFriendIds.includes(friend.id) ? 'bg-purple-500 border-purple-500' : 'border-zinc-600'}`}>
                                            {selectedFriendIds.includes(friend.id) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <Avatar src={friend.avatar_url} fallback={friend.username} className="w-8 h-8" />
                                        <span className="font-semibold text-sm text-zinc-200">{friend.username}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 flex justify-end gap-3 bg-zinc-900/50 rounded-b-2xl">
                    {step === 2 && (
                        <Button variant="ghost" onClick={() => setStep(1)} disabled={isLoading}>Back</Button>
                    )}

                    {step === 1 ? (
                        <Button
                            className="bg-zinc-100 text-zinc-900 hover:bg-white"
                            onClick={() => setStep(2)}
                            disabled={!name.trim()}
                        >
                            Next
                        </Button>
                    ) : (
                        <Button
                            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0"
                            onClick={handleCreate}
                            disabled={isLoading || selectedFriendIds.length === 0}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                            Create Group
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

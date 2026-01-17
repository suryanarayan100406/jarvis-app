'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Send, Sparkles, Paperclip, Mic, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useChatMessages } from '@/hooks/useChatMessages'
import { Avatar } from '@/components/ui/Avatar'
import { useRouter, useSearchParams } from 'next/navigation'
import { GroupInfoModal } from '@/components/chat/GroupInfoModal'
import { motion, AnimatePresence } from 'framer-motion'
import { DEFAULT_USER_AVATAR, DEFAULT_GROUP_AVATAR, GLOBAL_CHAT_AVATAR } from '@/lib/constants'
import { cn } from '@/lib/utils'

export default function ChatInterface() {
    const searchParams = useSearchParams()
    const channelId = searchParams.get('chatId') || 'global'
    const chatName = searchParams.get('name') || 'Global Chat'
    const chatAvatar = searchParams.get('avatar')
    const chatType = searchParams.get('type') // 'group' or undefined/null

    const { messages, isLoading, deleteMessage, toggleReaction, addMessage } = useChatMessages(channelId)
    const router = useRouter()
    const [inputValue, setInputValue] = useState('')
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [summary, setSummary] = useState<string | null>(null)
    const [isSummarizing, setIsSummarizing] = useState(false)
    const [showGroupInfo, setShowGroupInfo] = useState(false)

    // Auto-scroll to bottom
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isLoading])

    const handleSummarize = async () => {
        setIsSummarizing(true)
        try {
            // Collect last 20 messages content
            const recentMessages = messages.map(m => `${m.sender_name}: ${m.content}`).slice(-20)

            const response = await fetch('/api/summarize', {
                method: 'POST',
                body: JSON.stringify({ messages: recentMessages })
            })
            const data = await response.json()
            if (!response.ok) {
                setSummary(`Error: ${data.summary}\nDetails: ${data.details || 'Unknown error'}`)
            } else {
                setSummary(data.summary)
            }
        } catch (e: any) {
            console.error(e)
            setSummary(`Failed to summarize. Check Console.\n${e.message}`)
        } finally {
            setIsSummarizing(false)
        }
    }

    useEffect(() => {
        // Get current user
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) {
                router.push('/login')
            } else {
                setCurrentUser(data.user)
                // Mark as Read
                if (channelId) {
                    supabase.from('user_last_read').upsert(
                        { user_id: data.user.id, channel_id: channelId, last_read_at: new Date().toISOString() },
                        { onConflict: 'user_id,channel_id' }
                    ).then(({ error }) => {
                        if (error) console.error("Failed to mark read", error)
                    })
                }
            }
        })
    }, [channelId])

    // Prevent rendering if not logged in (optional, but good for flicker)
    if (!currentUser) return <div className="h-full flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>

    // [NEW] Config & Permission State
    const [channelConfig, setChannelConfig] = useState<any>(null)
    const [canSend, setCanSend] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        if (!channelId || !currentUser) return

        const fetchConfig = async () => {
            // 1. Get Channel Config
            const { data: channel } = await supabase.from('channels').select('config').eq('id', channelId).single()

            // 2. Get My Role
            const { data: member } = await supabase.from('channel_members').select('role').eq('channel_id', channelId).eq('user_id', currentUser.id).single()

            const config = channel?.config || { send_messages: true } // Default true if missing
            const role = member?.role || 'member'

            setChannelConfig(config)
            setIsAdmin(role === 'owner' || role === 'admin')

            // Logic: Can send if (config allows) OR (I am admin/owner)
            setCanSend(config.send_messages !== false || role === 'owner' || role === 'admin')
        }
        fetchConfig()

        // Realtime Listener for Config Changes
        const channelSub = supabase
            .channel(`channel_config_${channelId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channels', filter: `id=eq.${channelId}` }, (payload: any) => {
                if (payload.new.config) {
                    const newConfig = payload.new.config
                    setChannelConfig(newConfig)
                    // Re-evaluate permission
                    setCanSend(newConfig.send_messages !== false || isAdmin) // Note: isAdmin might be stale if role changed, but good enough for config update
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channelSub) }
    }, [channelId, currentUser, isAdmin]) // Re-run if admin status changes

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim()) return

        if (!canSend) {
            alert("Sending messages is disabled in this group.")
            return
        }

        const content = inputValue
        setInputValue('') // Optimistic clear

        // 1. Generate ID client-side for optimistic update logic
        const tempId = crypto.randomUUID()

        // 2. Optimistic Update
        addMessage({
            id: tempId,
            content,
            user_id: currentUser?.id,
            is_anonymous: false,
            anonymous_alias: null,
            inserted_at: new Date().toISOString(),
            reactions: {},
            sender_name: currentUser?.username || 'Me',
            is_own: true
        })

        // 3. Insert into DB (passing the ID so it matches!)
        const { error } = await supabase.from('messages').insert({
            id: tempId,
            content,
            user_id: currentUser?.id,
            channel_id: channelId,
            is_anonymous: false,
            anonymous_alias: null
        })

        if (error) {
            console.error("Failed to send", error)
            alert("Error sending message: " + error.message) // Show RLS error
        }
    }

    // [NEW] Dynamic Header Info
    const [headerInfo, setHeaderInfo] = useState({
        name: chatName || 'Chat',
        avatar: chatAvatar
    })

    useEffect(() => {
        // Initial set
        setHeaderInfo({
            name: chatName || 'Chat',
            avatar: chatAvatar
        })

        if (chatType === 'group' && channelId && channelId !== 'global') {
            const channelSub = supabase
                .channel(`header_update_${channelId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channels', filter: `id=eq.${channelId}` }, (payload: any) => {
                    const newData = payload.new
                    setHeaderInfo(prev => ({
                        ...prev,
                        name: newData.name,
                        avatar: newData.image_url || DEFAULT_GROUP_AVATAR
                    }))
                })
                .subscribe()

            // Also fetch fresh ONCE
            supabase.from('channels').select('name, image_url').eq('id', channelId).single()
                .then(({ data }) => {
                    if (data) setHeaderInfo(prev => ({ ...prev, name: data.name, avatar: data.image_url || DEFAULT_GROUP_AVATAR }))
                })

            return () => { supabase.removeChannel(channelSub) }
        }
    }, [channelId, chatType, chatName, chatAvatar])

    return (
        <div className="glass-panel mx-3 my-3 rounded-2xl flex flex-col h-[calc(100vh-1.5rem)] relative animate-in fade-in zoom-in duration-500 select-none border-l-0">
            {/* Summary Overlay */}
            {summary && (
                <div className="absolute inset-x-4 top-20 z-50 bg-black/80 border border-purple-500/50 p-6 rounded-xl backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-purple-400 font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> The Tea (Summary)
                        </h3>
                        <button onClick={() => setSummary(null)} className="text-muted-foreground hover:text-white">✕</button>
                    </div>
                    <p className="text-white/90 leading-relaxed text-sm">
                        {summary}
                    </p>
                </div>
            )}

            {/* Chat Header */}
            <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-white/5 rounded-t-3xl backdrop-blur-md">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-4 ${chatType === 'group' ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                        if (chatType === 'group') {
                            setShowGroupInfo(true)
                        }
                    }}
                >
                    <div className="relative">
                        <Avatar
                            src={headerInfo.name === 'Global Chat' ? GLOBAL_CHAT_AVATAR : (headerInfo.avatar || (chatType === 'group' ? DEFAULT_GROUP_AVATAR : DEFAULT_USER_AVATAR))}
                            className={cn("w-12 h-12 border-2 border-white/10 shadow-lg", headerInfo.name === 'Global Chat' && "shadow-blue-500/20 border-blue-500/30")}
                        />
                        {chatType === 'dm' && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>}
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                            {headerInfo.name}
                            {chatType === 'group' && headerInfo.name !== 'Global Chat' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">GROUP</span>}
                        </h2>
                        <p className="text-xs text-purple-300/80 font-medium tracking-wide">
                            {chatType === 'dm' ? 'Online' : (headerInfo.name === 'Global Chat' ? 'Server Public' : 'Tap for info')}
                        </p>
                    </div>
                </motion.div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                        variant="ghost"
                        size="sm"
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 rounded-xl"
                    >
                        {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {isSummarizing ? 'Cooking...' : 'Summarize'}
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full text-muted-foreground">
                        <Loader2 className="animate-spin w-8 h-8" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((msg) => {
                            // Check ownership accurately
                            const isOwn = currentUser && msg.user_id === currentUser.id
                            return (
                                <MessageBubble
                                    key={msg.id}
                                    id={msg.id}
                                    isOwn={isOwn || false}
                                    content={msg.content}
                                    timestamp={new Date(msg.inserted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    senderName={msg.sender_name}
                                    onDelete={deleteMessage}
                                    // Reaction Props
                                    reactions={msg.reactions}
                                    currentUserId={currentUser?.id}
                                    onReact={(id, emoji) => toggleReaction(id, currentUser?.id, emoji)}
                                />
                            )
                        })}
                        {messages.length === 0 && (
                            <div className="text-center text-zinc-500 mt-20 text-lg font-light tracking-wide">
                                Quiet in here... <span className="text-2xl">🤫</span>
                            </div>
                        )}
                        {/* Invisible element to scroll to */}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Footer Input Area */}
            <div className="h-24 px-8 flex items-center shrink-0 backdrop-blur-md bg-white/5 rounded-b-3xl border-t border-white/5 relative z-20">
                {!canSend ? (
                    <div className="w-full py-4 px-6 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-2 text-red-200 font-medium animate-in fade-in slide-in-from-bottom-4">
                        <Shield className="w-4 h-4" />
                        <span>Sending messages has been disabled by admins.</span>
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-4 bg-black/40 p-2 pl-6 rounded-2xl border border-white/10 focus-within:border-purple-500/50 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all shadow-lg group">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={chatType === 'group' ? `Message ${headerInfo.name}...` : `Message @${headerInfo.name}...`}
                            className="bg-transparent border-none text-white placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 h-10 text-base"
                        />
                        <div className="flex items-center gap-1 pr-2">
                            < Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-transform hover:scale-110"
                                onClick={() => alert("Attachments coming soon!")}
                            >
                                <Paperclip className="w-5 h-5" />
                            </Button>
                            <Button
                                type="submit"
                                size="icon"
                                className="bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/50 hover:scale-105 active:scale-95 transition-all duration-300 w-10 h-10"
                                disabled={!inputValue.trim()}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            {/* Modals */}
            {
                showGroupInfo && (
                    <GroupInfoModal
                        channelId={channelId}
                        onClose={() => setShowGroupInfo(false)}
                        currentUser={currentUser}
                    />
                )
            }
        </div >
    )
}

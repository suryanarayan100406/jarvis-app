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

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim()) return

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
            id: tempId, // <--- key trick
            content,
            user_id: currentUser?.id,
            channel_id: channelId,
            is_anonymous: false,
            anonymous_alias: null
        })

        if (error) {
            console.error("Failed to send", error)
            alert("Error sending message. Make sure RLS is set up!")
        }
    }

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
                <div
                    className={`flex items-center gap-4 ${chatType === 'group' ? 'cursor-pointer hover:opacity-80 transition-all hover:translate-x-1' : ''}`}
                    onClick={() => {
                        if (chatType === 'group') {
                            setShowGroupInfo(true)
                        }
                    }}
                >
                    {chatAvatar ? (
                        <Avatar src={chatAvatar} fallback={chatName} className="w-12 h-12 border-2 border-white/10 shadow-lg" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-lg shadow-purple-500/20" />
                    )}
                    <div>
                        <h3 className="font-bold text-xl drop-shadow-sm">{chatName}</h3>
                        <p className="text-xs text-green-400 font-medium tracking-wide flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live
                        </p>
                    </div>
                </div>
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

            {/* Input Area */}
            <div className="p-6 bg-transparent">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3 max-w-5xl mx-auto bg-black/40 p-2 pl-4 rounded-3xl border border-white/5 focus-within:border-purple-500/50 focus-within:shadow-[0_0_30px_-5px_rgba(147,51,234,0.3)] transition-all">
                    <Button type="button" size="icon" variant="ghost" className="text-zinc-400 hover:text-white shrink-0">
                        <Paperclip className="w-5 h-5" />
                    </Button>

                    <div className="flex-1 relative">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type a message..."
                            className="bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-zinc-500 h-12 text-base"
                        />
                    </div>

                    {inputValue ? (
                        <Button type="submit" size="icon" className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shrink-0 mr-1 transition-transform active:scale-95">
                            <Send className="w-4 h-4 ml-0.5" />
                        </Button>
                    ) : (
                        <Button type="button" size="icon" variant="secondary" className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 shrink-0 mr-1">
                            <Mic className="w-4 h-4 text-zinc-400" />
                        </Button>
                    )}
                </form>
            </div>

            {/* Modals */}
            {showGroupInfo && (
                <GroupInfoModal
                    channelId={channelId}
                    onClose={() => setShowGroupInfo(false)}
                    currentUser={currentUser}
                />
            )}
        </div>
    )
}

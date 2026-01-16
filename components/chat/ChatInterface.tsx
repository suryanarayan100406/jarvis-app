'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Send, Sparkles, Paperclip, Mic, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useChatMessages } from '@/hooks/useChatMessages'
import { Avatar } from '@/components/ui/Avatar'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ChatInterface() {
    const searchParams = useSearchParams()
    const channelId = searchParams.get('chatId') || 'global'
    const chatName = searchParams.get('name') || 'Global Chat'
    const chatAvatar = searchParams.get('avatar')

    const { messages, isLoading, deleteMessage, toggleReaction } = useChatMessages(channelId)
    const router = useRouter()
    const [inputValue, setInputValue] = useState('')
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [summary, setSummary] = useState<string | null>(null)
    const [isSummarizing, setIsSummarizing] = useState(false)

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
            setSummary(data.summary)
        } catch (e) {
            console.error(e)
            setSummary("Failed to summarize. Check API Key.")
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

        // Insert into DB
        const { error } = await supabase.from('messages').insert({
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
        <div className="flex flex-col h-full bg-background/50 backdrop-blur-3xl relative">
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
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-secondary/20">
                <div className="flex items-center gap-3">
                    {chatAvatar ? (
                        <Avatar src={chatAvatar} fallback={chatName} className="w-10 h-10 border border-white/10" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500" />
                    )}
                    <div>
                        <h3 className="font-bold">{chatName}</h3>
                        <p className="text-xs text-green-400">Live</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                        variant="ghost"
                        size="sm"
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                    >
                        {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {isSummarizing ? 'Cooking...' : 'Summarize'}
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full text-muted-foreground">
                        <Loader2 className="animate-spin w-8 h-8" />
                    </div>
                ) : (
                    <div className="space-y-4">
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
                            <div className="text-center text-muted-foreground mt-10">
                                No messages yet. Be the first!
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background/80 border-t border-white/5">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                    <Button type="button" size="icon" variant="ghost" className="text-muted-foreground hover:text-white">
                        <Paperclip className="w-5 h-5" />
                    </Button>

                    <div className="flex-1 relative">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type a message..."
                            className="pr-10 bg-secondary/50 border-transparent focus:border-primary/50"
                        />
                    </div>

                    {inputValue ? (
                        <Button type="submit" size="icon" className="rounded-full bg-primary hover:bg-primary/90">
                            <Send className="w-4 h-4 ml-0.5" />
                        </Button>
                    ) : (
                        <Button type="button" size="icon" variant="secondary" className="rounded-full">
                            <Mic className="w-4 h-4" />
                        </Button>
                    )}
                </form>
            </div>
        </div>
    )
}

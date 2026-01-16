'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Send, Sparkles, Paperclip, Mic, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useChatMessages } from '@/hooks/useChatMessages'

export default function ChatInterface() {
    const { messages, isLoading } = useChatMessages()
    const [inputValue, setInputValue] = useState('')
    const [currentUser, setCurrentUser] = useState<any>(null)

    useEffect(() => {
        // Get current user
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUser(data.user)
        })
    }, [])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim()) return

        const content = inputValue
        setInputValue('') // Optimistic clear

        // Insert into DB
        const { error } = await supabase.from('messages').insert({
            content,
            user_id: currentUser?.id,
            is_anonymous: !currentUser, // If no user, assume anon (or check specific anon flag)
            anonymous_alias: !currentUser ? 'Guest' : null
        })

        if (error) {
            console.error("Failed to send", error)
            alert("Error sending message. Make sure RLS is set up!")
        }
    }

    return (
        <div className="flex flex-col h-full bg-background/50 backdrop-blur-3xl">
            {/* Chat Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-secondary/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500" />
                    <div>
                        <h3 className="font-bold">Global Chat</h3>
                        <p className="text-xs text-green-400">Live</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20">
                        <Sparkles className="w-4 h-4 mr-2" /> Summarize
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
                                    isOwn={isOwn || false}
                                    content={msg.content}
                                    timestamp={new Date(msg.inserted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    senderName={msg.sender_name}
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
                            placeholder={currentUser ? "Type a message..." : "Type anonymously..."}
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

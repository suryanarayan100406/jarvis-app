'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Send, Sparkles, Paperclip, Mic } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ChatInterface() {
    const [messages, setMessages] = useState([
        { id: 1, content: "Yo, did you check the new update?", isOwn: false, timestamp: "10:42 AM", sender: "Alex" },
        { id: 2, content: "Yeah, the animations are sick! 🔥", isOwn: true, timestamp: "10:43 AM", sender: "Me" },
        { id: 3, content: "We should build something like this.", isOwn: false, timestamp: "10:44 AM", sender: "Alex" },
    ])
    const [inputValue, setInputValue] = useState('')

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim()) return

        setMessages([...messages, {
            id: Date.now(),
            content: inputValue,
            isOwn: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sender: "Me"
        }])
        setInputValue('')
    }

    return (
        <div className="flex flex-col h-full bg-background/50 backdrop-blur-3xl">
            {/* Chat Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-secondary/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500" />
                    <div>
                        <h3 className="font-bold">The Squad</h3>
                        <p className="text-xs text-green-400">Online • 3 members</p>
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
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            isOwn={msg.isOwn}
                            content={msg.content}
                            timestamp={msg.timestamp}
                            senderName={msg.sender}
                        />
                    ))}
                </div>
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
                        <SmileIcon className="absolute right-3 top-2.5 w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
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

function SmileIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" x2="9.01" y1="9" y2="9" />
            <line x1="15" x2="15.01" y1="9" y2="9" />
        </svg>
    )
}

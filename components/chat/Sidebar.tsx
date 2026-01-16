'use client'

import { ScrollArea } from '@/components/ui/ScrollArea' // Need to create or standard div
import { Avatar } from '@/components/ui/Avatar' // Need to create
import { formatDistanceToNow } from 'date-fns' // If installed, otherwise just mocking

// Mock Data
const MOCK_CHATS = [
    { id: 1, name: "The Squad 💀", lastMessage: "Bro, did you see the meme?", time: new Date() },
    { id: 2, name: "Agent X", lastMessage: "Encrypted message...", time: new Date(Date.now() - 1000 * 60 * 5) },
    { id: 3, name: "Jessica", lastMessage: "See you at the party!", time: new Date(Date.now() - 1000 * 60 * 60) },
]

export function Sidebar() {
    return (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {MOCK_CHATS.map((chat) => (
                <div key={chat.id} className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="font-semibold truncate text-sm">{chat.name}</span>
                            <span className="text-xs text-muted-foreground">12m</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate group-hover:text-white transition-colors">
                            {chat.lastMessage}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}

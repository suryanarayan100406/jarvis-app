'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Smile, ThumbsUp, Heart, Flame, Zap, Trash2 } from 'lucide-react'

interface MessageProps {
    id: string
    isOwn: boolean
    content: string
    timestamp: string
    senderName?: string
    onDelete?: (id: string) => void
}

const REACTIONS = [
    { icon: ThumbsUp, label: 'like', color: 'text-blue-400' },
    { icon: Heart, label: 'love', color: 'text-red-500' },
    { icon: Flame, label: 'fire', color: 'text-orange-500' },
    { icon: Zap, label: 'shock', color: 'text-yellow-400' },
    { icon: Smile, label: 'haha', color: 'text-yellow-300' },
]

export function MessageBubble({ id, isOwn, content, timestamp, senderName, onDelete }: MessageProps) {
    const [showReactions, setShowReactions] = useState(false)
    const [reactions, setReactions] = useState<string[]>([])

    const addReaction = (label: string) => {
        setReactions(prev => [...prev, label])
        setShowReactions(false)
    }

    return (
        <div
            className={cn("flex w-full mb-4", isOwn ? "justify-end" : "justify-start")}
            onMouseLeave={() => setShowReactions(false)}
        >
            <div className="relative group max-w-[80%] md:max-w-[60%] flex gap-2 items-center">

                {/* Delete Button (Left side if own) - Hidden by default, shown on group hover */}
                {isOwn && onDelete && (
                    <button
                        onClick={() => {
                            if (confirm("Delete this message?")) onDelete(id)
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 p-1 rounded"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}

                <div className="relative">
                    {/* Sender Name */}
                    {!isOwn && (
                        <span className="text-xs text-muted-foreground ml-2 mb-1 block">
                            {senderName}
                        </span>
                    )}

                    {/* Message Content */}
                    <motion.div
                        onContextMenu={(e) => { e.preventDefault(); setShowReactions(!showReactions) }}
                        className={cn(
                            "p-3 rounded-2xl relative shadow-sm cursor-pointer",
                            isOwn
                                ? "bg-primary text-white rounded-br-none"
                                : "bg-secondary/40 text-foreground rounded-bl-none border border-white/5"
                        )}
                        whileHover={{ scale: 1.01 }}
                    >
                        {content}

                        <span className="text-[10px] opacity-50 block text-right mt-1">
                            {timestamp}
                        </span>

                        {/* Existing Reactions */}
                        {reactions.length > 0 && (
                            <div className="absolute -bottom-3 right-0 flex -space-x-1">
                                {reactions.slice(0, 3).map((r, i) => (
                                    <div key={i} className="bg-zinc-800 rounded-full p-1 border border-black text-[10px]">
                                        ❤️
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Reaction Picker */}
                    <AnimatePresence>
                        {(showReactions || false) && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: -50 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute bottom-full left-0 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-full p-2 flex gap-2 shadow-2xl z-50 mb-2"
                            >
                                {REACTIONS.map((R, i) => (
                                    <motion.button
                                        key={R.label}
                                        whileHover={{ scale: 1.5, y: -10 }}
                                        onClick={() => addReaction(R.label)}
                                        className={cn("p-2 rounded-full hover:bg-white/10 transition-colors", R.color)}
                                    >
                                        <R.icon className="w-5 h-5" fill="currentColor" fillOpacity={0.2} />
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

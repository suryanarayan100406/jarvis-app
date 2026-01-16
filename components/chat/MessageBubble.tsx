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
    reactions?: Record<string, string[]>
    currentUserId?: string
    onReact?: (id: string, emoji: string) => void
}

// Gen Z / Modern Reaction Set
const REACTIONS = [
    { label: '🔥' },
    { label: '💀' }, // Skull (Dead)
    { label: '🤡' }, // Clown (Fool)
    { label: '+1' }, // Agree
    { label: '67' }, // Custom request (Assuming slang)
    { label: 'Delulu' }, // Delusional
    { label: 'Real' }, // Relatable
    { label: 'Bet' }, // Agreement
]

export function MessageBubble({ id, isOwn, content, timestamp, senderName, onDelete, reactions = {}, currentUserId, onReact }: MessageProps) {
    const [showReactions, setShowReactions] = useState(false)

    // Compute active reactions
    // Should be an array of { emoji: '🔥', count: 3, hasReacted: true }
    const displayedReactions = Object.entries(reactions).map(([emoji, userIds]) => ({
        emoji,
        count: userIds.length,
        hasReacted: currentUserId ? userIds.includes(currentUserId) : false
    })).filter(r => r.count > 0) // Only show if count > 0

    return (
        <div
            className={cn("flex w-full mb-6", isOwn ? "justify-end" : "justify-start")}
            onMouseLeave={() => setShowReactions(false)}
        >
            <div className="relative group max-w-[80%] md:max-w-[60%] flex gap-2 items-center">

                {/* Delete Button (Left side if own) */}
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

                        {/* Rendered Reactions (Pills below message) */}
                        {displayedReactions.length > 0 && (
                            <div className="absolute -bottom-6 right-0 flex gap-1 flex-wrap justify-end min-w-[100px]">
                                {displayedReactions.map((r) => (
                                    <button
                                        key={r.emoji}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onReact?.(id, r.emoji)
                                        }}
                                        className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors",
                                            r.hasReacted
                                                ? "bg-purple-500/20 border-purple-500 text-purple-200"
                                                : "bg-zinc-900/80 border-white/10 text-zinc-400 hover:bg-white/10"
                                        )}
                                    >
                                        <span>{r.emoji}</span>
                                        <span className="font-bold">{r.count}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Reaction Picker (Popup) */}
                    <AnimatePresence>
                        {showReactions && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: -50 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute bottom-full left-0 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-full p-2 flex gap-1 shadow-2xl z-50 mb-2 items-center"
                            >
                                {REACTIONS.map((R) => (
                                    <motion.button
                                        key={R.label}
                                        whileHover={{ scale: 1.2, y: -5 }}
                                        onClick={() => {
                                            onReact?.(id, R.label)
                                            setShowReactions(false)
                                        }}
                                        className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-lg"
                                        title={R.label}
                                    >
                                        {R.label}
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

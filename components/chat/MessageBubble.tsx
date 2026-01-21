'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Smile, ThumbsUp, Heart, Flame, Zap, Trash2, Mic } from 'lucide-react'
import { ReactionParticles } from './ReactionParticles'

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
    attachmentUrl?: string | null
    attachmentType?: string | null
}

// Custom Image Reactions
// Custom Image Reactions
// Extended Emoji List (Gen Z + Standard)
// We use the Emoji Character ITSELF as the ID to ensure cross-client consistency and simpler logic.
const QUICK_REACTIONS = [
    { id: '😭🙏', label: '😭🙏' }, // The Classic
    { id: '💀', label: '💀' },      // Dead
    { id: '❤️', label: '❤️' },      // Love
    { id: '💅✨', label: '💅✨' },   // Slay
    { id: '🗿', label: '🗿' },       // Chad
    { id: '🤡', label: '🤡' },      // Clown behavior
]

const ALL_EMOJIS = [
    // Gen Z / Slang Specials
    '😭🙏', '💅✨', '👁️👄👁️', '✊😔', '📉', '💀', '🤡', '💯', '🗿', '🫡', '❤️', '🔥', '🤮',
    '🫠', '🧢', '🥶', '🥴', '🥺', '🦗', '🧍', '🧏', '🤫', '🤨', '📸', '🛌', '🗑️',
    // Standard Set
    '😂', '😭', '👍', '👀', '🙌',
    '🎉', '💩', '🤯', '🤔', '🫣', '🚀',
    '🤬', '🤪', '😇', '🤥', '😷', '🤒', '🤕', '🤢', '🤧',
    '🥳', '🤠', '🥸', '😎', '🤓', '🧐', '😕', '😟',
    '🙁', '☹️', '😮', '😯', '😲', '😳', '🥵', '😱', '😨',
    '😰', '😥', '😓', '🤗', '🤭', '😶', '😐',
    '😑', '😬', '🙄', '😦', '😧', '🥱', '😴',
    '🤤', '😪', '😵', '🤐', '🤑', '😈', '👿', '👹', '👺', '👻',
    '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻',
    '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖',
    '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
    '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜',
    '👏', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪',
]

export function MessageBubble({ id, isOwn, content, timestamp, senderName, onDelete, reactions = {}, currentUserId, onReact, attachmentUrl, attachmentType }: MessageProps) {
    const [showReactions, setShowReactions] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [activeReactionAnim, setActiveReactionAnim] = useState<string | null>(null)

    // Reset expanded state when closing
    useEffect(() => {
        if (!showReactions) setIsExpanded(false)
    }, [showReactions])

    // Compute active reactions
    const displayedReactions = Object.entries(reactions).map(([reactionId, userIds]) => {
        // reactionId IS the emoji now. No lookup needed.
        return {
            id: reactionId,
            emoji: reactionId,
            count: userIds.length,
            hasReacted: currentUserId ? userIds.includes(currentUserId) : false,
            userIds: userIds
        }
    }).filter(r => r.count > 0)

    const toggleEmoji = (emoji: string) => {
        onReact?.(id, emoji)
        setShowReactions(false)
        setActiveReactionAnim(emoji)
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={cn("flex w-full mb-4", isOwn ? "justify-end" : "justify-start")}
            onMouseLeave={() => setShowReactions(false)}
        >
            <div className={cn("relative group max-w-[80%] md:max-w-[60%] flex gap-2 items-end", isOwn ? "flex-row" : "flex-row-reverse")}>

                {/* Side Actions (Delete) */}
                {onDelete && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 pb-2">
                        <button
                            onClick={() => onDelete(id)}
                            className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-full transition-all"
                            title="Delete Message"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Reaction Trigger Button (Inner Side) */}
                <button
                    className={cn(
                        "opacity-0 group-hover:opacity-100 transition-all text-zinc-400 hover:text-yellow-400 p-2 rounded-full hover:bg-white/5 active:scale-95 mb-2",
                        showReactions && "opacity-100 text-yellow-400"
                    )}
                    onClick={(e) => {
                        e.stopPropagation()
                        setShowReactions(!showReactions)
                    }}
                >
                    <Smile className="w-5 h-5" />
                </button>

                <div className="relative">
                    {/* Reaction Particles Effect */}
                    {activeReactionAnim && (
                        <ReactionParticles
                            emoji={activeReactionAnim}
                            isImage={false}
                            onComplete={() => setActiveReactionAnim(null)}
                        />
                    )}

                    {/* Sender Name */}
                    {!isOwn && (
                        <span className="text-xs text-muted-foreground ml-2 mb-1 block">
                            {senderName}
                        </span>
                    )}

                    {/* Message Bubble */}
                    <motion.div
                        onContextMenu={(e) => { e.preventDefault(); setShowReactions(!showReactions) }}
                        className={cn(
                            "p-3.5 rounded-[20px] relative shadow-md cursor-pointer border selection:bg-white/30",
                            isOwn
                                ? "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-br-sm border-transparent"
                                : "bg-zinc-800/80 border-white/5 text-zinc-100 rounded-bl-sm backdrop-blur-sm"
                        )}
                        whileHover={{ scale: 1.01 }}
                    >
                        {attachmentUrl && (
                            <div className="mb-2">
                                {attachmentType?.startsWith('image/') ? (
                                    <div className="rounded-lg overflow-hidden border border-white/10 relative">
                                        <img
                                            src={attachmentUrl}
                                            alt="attachment"
                                            className="max-w-full h-auto max-h-[300px] object-cover block"
                                            loading="lazy"
                                        />
                                    </div>
                                ) : attachmentType?.startsWith('audio/') ? (
                                    <div className="flex items-center gap-2 bg-zinc-800/50 p-3 rounded-xl border border-white/5 min-w-[200px]">
                                        <div className="bg-purple-500/20 p-2 rounded-full">
                                            <Mic className="w-4 h-4 text-purple-400" />
                                        </div>
                                        <audio
                                            controls
                                            src={attachmentUrl}
                                            className="h-8 max-w-[200px] w-full"
                                            controlsList="nodownload noplaybackrate"
                                        />
                                    </div>
                                ) : (
                                    <a
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 bg-black/20 p-2 rounded-lg hover:bg-black/40 transition-colors text-sm underline"
                                    >
                                        📎 Attachment
                                    </a>
                                )}
                            </div>
                        )}
                        {content !== "Sent an attachment" && <p className="leading-relaxed">{content}</p>}

                        <span className="text-[10px] opacity-50 block text-right mt-1">
                            {timestamp}
                        </span>

                        {/* Existing Reactions (Pills) */}
                        {displayedReactions.length > 0 && (
                            <div className={cn("absolute -bottom-5 flex gap-1 flex-wrap min-w-[100px] z-10", isOwn ? "right-0 justify-end" : "left-0 justify-start")}>
                                {displayedReactions.map((r) => (
                                    <div key={r.id} className="group/reaction relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onReact?.(id, r.id)
                                            }}
                                            className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-all shadow-sm",
                                                r.hasReacted
                                                    ? "bg-purple-500/20 border-purple-500 text-purple-200"
                                                    : "bg-zinc-800 border-white/10 text-zinc-400 hover:bg-zinc-700"
                                            )}
                                        >
                                            <span>{r.emoji}</span>
                                            <span className="font-bold">{r.count}</span>
                                        </button>
                                        {/* Who Reacted Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/reaction:block bg-black/90 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none">
                                            {r.count} people reacted
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Reaction Picker (Popup) */}
                    <AnimatePresence>
                        {showReactions && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0, x: isOwn ? 10 : -10 }}
                                animate={{ scale: 1, opacity: 1, x: 0 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className={cn(
                                    "absolute top-0 bg-zinc-900/95 backdrop-blur-xl border border-white/10 p-1 flex shadow-2xl z-50 items-center min-w-max",
                                    isOwn ? "right-full mr-2" : "left-full ml-2",
                                    isExpanded ? "rounded-2xl grid grid-cols-8 gap-1 w-[240px] max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20" : "rounded-full gap-0.5"
                                )}
                            >
                                {!isExpanded ? (
                                    <>
                                        {QUICK_REACTIONS.map((R) => (
                                            <motion.button
                                                key={R.id}
                                                whileHover={{ scale: 1.2, y: -2 }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleEmoji(R.label)
                                                }}
                                                className="p-1 px-2 rounded-full hover:bg-white/10 transition-colors relative text-lg"
                                                title={R.id}
                                            >
                                                {R.label}
                                            </motion.button>
                                        ))}
                                        {/* Plus Button */}
                                        <motion.button
                                            whileHover={{ scale: 1.1 }}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setIsExpanded(true)
                                            }}
                                            className="p-1 px-2 rounded-full hover:bg-white/10 transition-colors relative text-lg text-zinc-400 hover:text-white"
                                        >
                                            +
                                        </motion.button>
                                    </>
                                ) : (
                                    // Expanded Grid
                                    ALL_EMOJIS.map((emoji, idx) => (
                                        <button
                                            key={idx}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toggleEmoji(emoji)
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-lg flex items-center justify-center hover:scale-110 active:scale-95"
                                        >
                                            {emoji}
                                        </button>
                                    ))
                                )}

                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>
        </motion.div>
    )
}

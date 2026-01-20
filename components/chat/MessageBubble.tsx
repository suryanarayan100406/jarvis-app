'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Smile, ThumbsUp, Heart, Flame, Zap, Trash2 } from 'lucide-react'
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
const REACTIONS = [
    { id: 'cry_pray', src: '/reactions/cry_pray.png', label: 'Praying' },
    { id: 'sad_baddie', src: '/reactions/sad_baddie.png', label: 'Baddie' },
    { id: 'sad_lashes', src: '/reactions/sad_lashes.png', label: 'Lashes' },
    { id: 'sobbing', src: '/reactions/sobbing.png', label: 'Sobbing' },
    { id: 'crying_fist', src: '/reactions/crying_fist.png', label: 'Crying' },
]

export function MessageBubble({ id, isOwn, content, timestamp, senderName, onDelete, reactions = {}, currentUserId, onReact, attachmentUrl, attachmentType }: MessageProps) {
    const [showReactions, setShowReactions] = useState(false)
    const [activeReactionAnim, setActiveReactionAnim] = useState<string | null>(null)

    // Compute active reactions
    const displayedReactions = Object.entries(reactions).map(([reactionId, userIds]) => {
        const reactionDef = REACTIONS.find(r => r.id === reactionId)
        return {
            id: reactionId,
            src: reactionDef?.src,
            emoji: reactionDef?.label || reactionId, // Fallback
            count: userIds.length,
            hasReacted: currentUserId ? userIds.includes(currentUserId) : false
        }
    }).filter(r => r.count > 0)

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={cn("flex w-full mb-8", isOwn ? "justify-end" : "justify-start")}
            onMouseLeave={() => setShowReactions(false)}
        >
            <div className="relative group max-w-[80%] md:max-w-[60%] flex gap-2 items-end">

                {/* Left Side Actions (Delete) */}
                {isOwn && onDelete && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 pb-2">
                        <button
                            onClick={() => { if (confirm("Delete this message?")) onDelete(id) }}
                            className="text-destructive hover:bg-destructive/10 p-1.5 rounded-full"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="relative">
                    {/* Reaction Particles Effect */}
                    {activeReactionAnim && (
                        <ReactionParticles
                            emoji={activeReactionAnim} // Passing ID or Path, component will handle
                            isImage={true}
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
                            "p-3 rounded-2xl relative shadow-sm cursor-pointer border border-transparent",
                            isOwn
                                ? "bg-primary text-white rounded-br-none"
                                : "bg-zinc-900 border-white/10 text-foreground rounded-bl-none"
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
                            <div className="absolute -bottom-5 right-0 flex gap-1 flex-wrap justify-end min-w-[100px] z-10">
                                {displayedReactions.map((r) => (
                                    <button
                                        key={r.id}
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
                                        {r.src ? <img src={r.src} className="w-4 h-4 object-contain" /> : <span>{r.emoji}</span>}
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
                                animate={{ scale: 1, opacity: 1, y: -45 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute bottom-full right-0 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex gap-2 shadow-2xl z-50 mb-2 items-center"
                            >
                                {REACTIONS.map((R) => (
                                    <motion.button
                                        key={R.id}
                                        whileHover={{ scale: 1.2, y: -5 }}
                                        onClick={() => {
                                            onReact?.(id, R.id)
                                            setShowReactions(false)
                                            setActiveReactionAnim(R.src) // Pass Image Path for Anim
                                        }}
                                        className="p-1.5 rounded-xl hover:bg-white/10 transition-colors relative"
                                        title={R.label}
                                    >
                                        <img src={R.src} className="w-8 h-8 object-contain drop-shadow-lg" alt={R.label} />
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Reaction Trigger Button (Visible on Hover/Mobile) */}
                <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-yellow-400 p-2 rounded-full hover:bg-white/5"
                    onClick={() => setShowReactions(!showReactions)}
                >
                    <Smile className="w-5 h-5" />
                </button>

            </div>
        </motion.div>
    )
}

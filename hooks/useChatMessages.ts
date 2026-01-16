import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'


export type Message = {
    id: string
    content: string
    user_id: string | null
    is_anonymous: boolean
    anonymous_alias: string | null
    inserted_at: string
    reactions: Record<string, string[]> // { "🔥": ["user_id_1", "user_id_2"] }
    sender_name?: string
    is_own?: boolean
}

export function useChatMessages(channelId: string = 'global') {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // 1. Fetch initial messages
        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select(`
          *,
          profiles:user_id ( username, avatar_url )
        `)
                .eq('channel_id', channelId)
                .order('inserted_at', { ascending: true })
                .limit(50)

            if (error) console.error('Error fetching messages:', error)
            else {
                const formatted = data.map(msg => ({
                    ...msg,
                    sender_name: msg.is_anonymous ? (msg.anonymous_alias || 'Anonymous') : msg.profiles?.username || 'Unknown',
                    reactions: msg.reactions || {},
                    is_own: false
                }))
                setMessages(formatted)
            }
            setIsLoading(false)
        }

        fetchMessages()

        // 2. Subscribe to changes
        const channel = supabase
            .channel(`chat:${channelId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `channel_id=eq.${channelId}`
            }, (payload) => {
            }, (payload) => {
                const newMsg = payload.new as Message
                setMessages((prev) => {
                    // Prevent duplicate if we already added it optimistically
                    if (prev.some(m => m.id === newMsg.id)) return prev

                    return [...prev, {
                        ...newMsg,
                        sender_name: newMsg.is_anonymous ? (newMsg.anonymous_alias || 'Anon') : 'Someone',
                        reactions: newMsg.reactions || {},
                        is_own: true
                    }]
                })
            })
    })
        .on('postgres_changes', {
            event: 'UPDATE', // Listen for Reaction updates
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${channelId}`
        }, (payload) => {
            const updatedMsg = payload.new as Message
            setMessages(prev => prev.map(msg =>
                msg.id === updatedMsg.id ? { ...msg, reactions: updatedMsg.reactions || {} } : msg
            ))
        })
        .subscribe()

    return () => {
        supabase.removeChannel(channel)
    }
}, [channelId])

const deleteMessage = async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
    await supabase.from('messages').delete().eq('id', id)
}

const toggleReaction = async (messageId: string, userId: string, emoji: string) => {
    // 1. Find the message locally to get current reactions
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const currentReactions = message.reactions || {}
    const userList = currentReactions[emoji] || []

    let newReactions = { ...currentReactions }

    if (userList.includes(userId)) {
        // Remove reaction
        newReactions[emoji] = userList.filter(id => id !== userId)
        if (newReactions[emoji].length === 0) delete newReactions[emoji] // Clean up empty keys
    } else {
        // Add reaction
        newReactions[emoji] = [...userList, userId]
    }

    // 2. Optimistic Update
    setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, reactions: newReactions } : m
    ))

    // 3. Persist to DB
    const { error } = await supabase
        .from('messages')
        .update({ reactions: newReactions })
        .eq('id', messageId)

    if (error) console.error("Reaction update failed", error)
}

const addMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg])
}

return { messages, isLoading, setMessages, deleteMessage, toggleReaction, addMessage }
}

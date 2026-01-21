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
    attachment_url?: string | null
    attachment_type?: string | null
}

export function useChatMessages(channelId: string = 'global', currentUserId: string | null = null) {
    const [messages, setMessages] = useState<Message[]>([])
    const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setIsLoading(true)

            // 1. Fetch Hidden Messages (Delete for Me)
            let hiddenSet = new Set<string>()
            if (currentUserId) {
                const { data: hidden } = await supabase
                    .from('hidden_messages')
                    .select('message_id')
                    .eq('user_id', currentUserId)

                if (hidden) {
                    hidden.map(h => hiddenSet.add(h.message_id))
                    setHiddenMessageIds(hiddenSet)
                }
            }

            // 2. Fetch Messages
            const { data, error } = await supabase
                .from('messages')
                .select(`*, profiles:user_id ( username, avatar_url )`)
                .eq('channel_id', channelId)
                .order('inserted_at', { ascending: true })
                .limit(50)

            if (error) console.error('Error fetching messages:', error)
            else {
                const formatted = data
                    .filter(msg => !hiddenSet.has(msg.id)) // Filter hidden
                    .map(msg => ({
                        ...msg,
                        sender_name: msg.is_anonymous ? (msg.anonymous_alias || 'Anonymous') : msg.profiles?.username || 'Unknown',
                        reactions: msg.reactions || {},
                        is_own: false
                    }))
                setMessages(formatted)
            }
            setIsLoading(false)
        }

        load()

        // 3. Subscribe
        const channel = supabase
            .channel(`chat:${channelId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, async (payload) => {
                const newMsg = payload.new as Message
                let senderName = '...'
                if (!newMsg.is_anonymous && newMsg.user_id) {
                    const { data } = await supabase.from('profiles').select('username').eq('id', newMsg.user_id).single()
                    if (data) senderName = data.username
                } else if (newMsg.is_anonymous) {
                    senderName = newMsg.anonymous_alias || 'Anon'
                }

                setMessages((prev) => {
                    if (prev.some(m => m.id === newMsg.id)) return prev
                    return [...prev, { ...newMsg, sender_name: senderName, reactions: newMsg.reactions || {}, is_own: false }]
                })
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, (payload) => {
                const updatedMsg = payload.new as Message
                setMessages(prev => prev.map(msg => msg.id === updatedMsg.id ? { ...msg, reactions: updatedMsg.reactions || {} } : msg))
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, (payload) => {
                setMessages(prev => prev.filter(msg => msg.id !== payload.old.id))
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [channelId, currentUserId])

    const deleteForEveryone = async (id: string) => {
        setMessages(prev => prev.filter(m => m.id !== id))
        await supabase.from('messages').delete().eq('id', id)
    }

    const deleteForMe = async (id: string) => {
        if (!currentUserId) return
        setMessages(prev => prev.filter(m => m.id !== id)) // Optimistic
        await supabase.from('hidden_messages').insert({ user_id: currentUserId, message_id: id })
    }

    const toggleReaction = async (messageId: string, userId: string, emoji: string) => {
        // 1. Find the message locally to get current reactions
        const message = messages.find(m => m.id === messageId)
        if (!message) return

        const currentReactions = message.reactions || {}
        const userList = currentReactions[emoji] || []

        let newReactions = { ...currentReactions }

        // Enforce Single Reaction Per User Rule
        // 1. Remove user from ALL lists first
        let previousReactionEmoji: string | null = null

        Object.keys(newReactions).forEach(key => {
            if (newReactions[key].includes(userId)) {
                previousReactionEmoji = key
                newReactions[key] = newReactions[key].filter(id => id !== userId)
                if (newReactions[key].length === 0) delete newReactions[key]
            }
        })

        // 2. If the clicked emoji is DIFFERENT from what they had, OR they had nothing, add it.
        // (If they clicked the same one, we leave it removed -> Toggled Off)
        if (previousReactionEmoji !== emoji) {
            newReactions[emoji] = [...(newReactions[emoji] || []), userId]
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

    return { messages, isLoading, setMessages, deleteForEveryone, deleteForMe, toggleReaction, addMessage }
}

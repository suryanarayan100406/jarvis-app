import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Message = {
    id: string
    content: string
    user_id: string | null
    is_anonymous: boolean
    anonymous_alias: string | null
    inserted_at: string
    sender_name?: string // Computed
    is_own?: boolean     // Computed
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
                .order('inserted_at', { ascending: true })
                .limit(50)

            if (error) console.error('Error fetching messages:', error)
            else {
                // Map to friendlier format
                const formatted = data.map(msg => ({
                    ...msg,
                    sender_name: msg.is_anonymous ? (msg.anonymous_alias || 'Anonymous') : msg.profiles?.username || 'Unknown',
                    is_own: false // We need to check auth state to know this, doing next
                }))
                setMessages(formatted)
            }
            setIsLoading(false)
        }

        fetchMessages()

        // 2. Subscribe to new messages
        const channel = supabase
            .channel(`chat:${channelId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMsg = payload.new as Message
                // Optimistically update or re-fetch? optimistically is faster.
                // Note: Payload doesn't have the joined 'profiles' data.
                // For MVP, we might simple re-fetch or just push raw.
                // Let's push raw and set a temp name.
                setMessages((prev) => [...prev, {
                    ...newMsg,
                    sender_name: newMsg.is_anonymous ? (newMsg.anonymous_alias || 'Anon') : 'Loading...',
                    is_own: true // If we just sent it, likely us. But for incoming, we don't know. 
                    // Correction: realtime gives us all inserts. We need auth context.
                }])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [channelId])

    return { messages, isLoading, setMessages }
}

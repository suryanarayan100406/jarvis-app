import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
                .eq('channel_id', channelId) // Filter by channel!
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
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `channel_id=eq.${channelId}` // Filter realtime events too
            }, (payload) => {
                const newMsg = payload.new as Message
                setMessages((prev) => [...prev, {
                    ...newMsg,
                    sender_name: newMsg.is_anonymous ? (newMsg.anonymous_alias || 'Anon') : 'Someone',
                    is_own: true
                }])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [channelId])

    // 3. Delete function
    const deleteMessage = async (id: string) => {
        // Optimistic update
        setMessages(prev => prev.filter(m => m.id !== id))

        const { error } = await supabase.from('messages').delete().eq('id', id)
        if (error) {
            console.error("Error deleting", error)
            // Revert would be here in robust app
            alert("Failed to delete message")
        }
    }

    return { messages, isLoading, setMessages, deleteMessage }
}

import ChatInterface from '@/components/chat/ChatInterface'
import { Suspense } from 'react'

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-zinc-500">Loading chat features...</div>}>
            <ChatInterface />
        </Suspense>
    )
}

import { Sidebar } from '@/components/chat/Sidebar' // Will create
import { cn } from '@/lib/utils'

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Sidebar - Hidden on mobile if chat is active (handled by CSS/State usually, but simpler for now: visible on md+) */}
            <aside className="hidden md:flex w-80 flex-col border-r border-white/5 bg-black/40 backdrop-blur-xl z-20">
                <div className="p-4 h-16 border-b border-white/5 flex items-center">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Jarvis</h1>
                </div>
                <Sidebar />
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative w-full">
                {children}
            </main>
        </div>
    )
}

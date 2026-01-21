'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Send, Sparkles, Paperclip, Mic, Loader2, Shield, MoreVertical, Search, Phone, Video, Smile, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useChatMessages } from '@/hooks/useChatMessages'
import { Avatar } from '@/components/ui/Avatar'
import { useRouter, useSearchParams } from 'next/navigation'
import { GroupInfoModal } from '@/components/chat/GroupInfoModal'
import { motion, AnimatePresence } from 'framer-motion'
import { DEFAULT_USER_AVATAR, DEFAULT_GROUP_AVATAR, GLOBAL_CHAT_AVATAR } from '@/lib/constants'
import { cn } from '@/lib/utils'
import EmojiPicker, { Theme } from 'emoji-picker-react'


export default function ChatInterface() {
    const searchParams = useSearchParams()
    const channelId = searchParams.get('chatId') || 'global'
    const chatName = searchParams.get('name') || 'Global Chat'
    const chatAvatar = searchParams.get('avatar')
    const chatType = searchParams.get('type') // 'group' or undefined/null

    const [currentUser, setCurrentUser] = useState<any>(null)
    const { messages, isLoading, deleteForEveryone, deleteForMe, toggleReaction, addMessage } = useChatMessages(channelId, currentUser?.id)
    const router = useRouter()
    const [inputValue, setInputValue] = useState('')
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
    const [summary, setSummary] = useState<string | null>(null)
    const [isSummarizing, setIsSummarizing] = useState(false)
    const [showGroupInfo, setShowGroupInfo] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showCamera, setShowCamera] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const startCamera = async () => {
        try {
            setShowCamera(true)
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            setCameraStream(stream)
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
        } catch (err) {
            console.error("Camera error:", err)
            alert("Could not access camera.")
            setShowCamera(false)
        }
    }

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop())
            setCameraStream(null)
        }
        setShowCamera(false)
    }

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas')
            canvas.width = videoRef.current.videoWidth
            canvas.height = videoRef.current.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0)
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const file = new File([blob], "photo.jpg", { type: "image/jpeg" })
                        stopCamera()

                        // Upload Logic Re-use (simulating event or calling logic)
                        // Easier to just duplicate upload logic for Blob or Extract upload logic.
                        // I will just call handleFileUpload logic manually or create specific one.
                        // I'll create a quick helper `uploadFile(file)`
                        await uploadFile(file)
                    }
                }, 'image/jpeg')
            }
        }
    }

    const uploadFile = async (file: File) => {
        if (!currentUser) return
        setIsUploading(true)
        try {
            const fileExt = file.name.split('.').pop() || 'jpg'
            const fileName = `${channelId}/${crypto.randomUUID()}.${fileExt}`
            const { error: uploadError } = await supabase.storage.from('chat-media').upload(fileName, file)
            if (uploadError) throw uploadError
            const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(fileName)

            const tempId = crypto.randomUUID()
            // Optimistic Update
            addMessage({
                id: tempId, content: "Sent a photo", user_id: currentUser.id, is_anonymous: false, anonymous_alias: null,
                inserted_at: new Date().toISOString(), reactions: {}, sender_name: currentUser.username || 'Me', is_own: true,
                attachment_url: publicUrl, attachment_type: file.type
            })
            await supabase.from('messages').insert({
                id: tempId, content: "Sent a photo", user_id: currentUser.id, channel_id: channelId, is_anonymous: false,
                attachment_url: publicUrl, attachment_type: file.type
            })
        } catch (e: any) {
            alert("Upload failed: " + e.message)
        } finally {
            setIsUploading(false)
        }
    }

    // Auto-scroll to bottom
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isLoading])

    const handleSummarize = async () => {
        setIsSummarizing(true)
        try {
            // Collect last 20 messages content
            const recentMessages = messages.map(m => `${m.sender_name}: ${m.content}`).slice(-20)

            const response = await fetch('/api/summarize', {
                method: 'POST',
                body: JSON.stringify({ messages: recentMessages })
            })
            const data = await response.json()
            if (!response.ok) {
                setSummary(`Error: ${data.summary}\nDetails: ${data.details || 'Unknown error'}`)
            } else {
                setSummary(data.summary)
            }
        } catch (e: any) {
            console.error(e)
            setSummary(`Failed to summarize. Check Console.\n${e.message}`)
        } finally {
            setIsSummarizing(false)
        }
    }

    useEffect(() => {
        // Get current user
        supabase.auth.getUser().then(({ data }) => {
            if (!data.user) {
                router.push('/login')
            } else {
                setCurrentUser(data.user)
                // Mark as Read
                if (channelId) {
                    supabase.from('user_last_read').upsert(
                        { user_id: data.user.id, channel_id: channelId, last_read_at: new Date().toISOString() },
                        { onConflict: 'user_id,channel_id' }
                    ).then(({ error }) => {
                        if (error) console.error("Failed to mark read", error)
                    })
                }
            }
        })
    }, [channelId])

    // [NEW] Config & Permission State - MOVED UP TO FIX HOOK ERROR
    const [channelConfig, setChannelConfig] = useState<any>(null)
    const [canSend, setCanSend] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        if (!channelId || !currentUser) return

        const fetchConfig = async () => {
            // 1. Get Channel Config
            const { data: channel } = await supabase.from('channels').select('config').eq('id', channelId).single()

            // 2. Get My Role
            const { data: member } = await supabase.from('channel_members').select('role').eq('channel_id', channelId).eq('user_id', currentUser.id).single()

            const config = channel?.config || { send_messages: true } // Default true if missing
            const role = member?.role || 'member'

            setChannelConfig(config)
            setIsAdmin(role === 'owner' || role === 'admin')

            // Logic: Can send if (config allows) OR (I am admin/owner)
            setCanSend(config.send_messages !== false || role === 'owner' || role === 'admin')
        }
        fetchConfig()

        // Realtime Listener for Config Changes
        const channelSub = supabase
            .channel(`channel_config_${channelId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channels', filter: `id=eq.${channelId}` }, (payload: any) => {
                if (payload.new.config) {
                    const newConfig = payload.new.config
                    setChannelConfig(newConfig)
                    // Re-evaluate permission
                    setCanSend(newConfig.send_messages !== false || isAdmin) // Note: isAdmin might be stale if role changed, but good enough for config update
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channelSub) }
    }, [channelId, currentUser, isAdmin]) // Re-run if admin status changes

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim()) return

        if (!canSend) {
            alert("Sending messages is disabled in this group.")
            return
        }

        const content = inputValue
        setInputValue('') // Optimistic clear

        // 1. Generate ID client-side for optimistic update logic
        const tempId = crypto.randomUUID()

        // 2. Optimistic Update
        addMessage({
            id: tempId,
            content,
            user_id: currentUser?.id,
            is_anonymous: false,
            anonymous_alias: null,
            inserted_at: new Date().toISOString(),
            reactions: {},
            sender_name: currentUser?.username || 'Me',
            is_own: true,
            attachment_url: null,
            attachment_type: null
        })

        // 3. Insert into DB (passing the ID so it matches!)
        const { error } = await supabase.from('messages').insert({
            id: tempId,
            content,
            user_id: currentUser?.id,
            channel_id: channelId,
            is_anonymous: false,
            anonymous_alias: null
        })

        if (error) {
            console.error("Failed to send", error)
            alert("Error sending message: " + error.message) // Show RLS error
        }
    }

    const [isRecording, setIsRecording] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const isRecordingWantedRef = useRef(false)

    const startRecording = async () => {
        isRecordingWantedRef.current = true
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            // Check if user released button
            if (!isRecordingWantedRef.current) {
                stream.getTracks().forEach(track => track.stop())
                return
            }

            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
                await sendVoiceMessage(audioBlob)

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)
        } catch (err) {
            console.error("Error accessing microphone:", err)
            alert("Could not access microphone.")
        }
    }

    const stopRecording = () => {
        isRecordingWantedRef.current = false
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }
        setIsRecording(false)
    }

    const sendVoiceMessage = async (audioBlob: Blob) => {
        if (!currentUser) return
        setIsUploading(true)
        try {
            const fileName = `${channelId}/voice_${crypto.randomUUID()}.webm`
            const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(fileName, audioBlob)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('chat-media')
                .getPublicUrl(fileName)

            // Send Message
            const tempId = crypto.randomUUID()
            addMessage({
                id: tempId,
                content: "🎤 Voice Message",
                user_id: currentUser.id,
                is_anonymous: false,
                anonymous_alias: null,
                inserted_at: new Date().toISOString(),
                reactions: {},
                sender_name: currentUser.username || 'Me',
                is_own: true,
                attachment_url: publicUrl,
                attachment_type: 'audio/webm'
            })

            await supabase.from('messages').insert({
                id: tempId,
                content: "🎤 Voice Message",
                user_id: currentUser.id,
                channel_id: channelId,
                is_anonymous: false,
                attachment_url: publicUrl,
                attachment_type: 'audio/webm'
            })

        } catch (e: any) {
            console.error(e)
            alert("Failed to send voice: " + e.message)
        } finally {
            setIsUploading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 50 * 1024 * 1024) { // Increased limit for videos/large files
            alert("File size too large (Max 50MB)")
            return
        }

        setIsUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${channelId}/${crypto.randomUUID()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('chat-media')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('chat-media')
                .getPublicUrl(fileName)

            // Send Message with Attachment
            const tempId = crypto.randomUUID()

            // Optimistic Update
            addMessage({
                id: tempId,
                content: "Sent an attachment",
                user_id: currentUser?.id,
                is_anonymous: false,
                anonymous_alias: null,
                inserted_at: new Date().toISOString(),
                reactions: {},
                sender_name: currentUser?.username || 'Me',
                is_own: true,
                attachment_url: publicUrl,
                attachment_type: file.type
            })

            const { error: insertError } = await supabase.from('messages').insert({
                id: tempId,
                content: "Sent an attachment", // Required field
                user_id: currentUser?.id,
                channel_id: channelId,
                is_anonymous: false,
                anonymous_alias: null,
                attachment_url: publicUrl,
                attachment_type: file.type
            })

            if (insertError) throw insertError

        } catch (e: any) {
            console.error(e)
            alert("Upload failed: " + e.message)
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // [NEW] Dynamic Header Info
    const [headerInfo, setHeaderInfo] = useState({
        name: chatName || 'Chat',
        avatar: chatAvatar
    })

    useEffect(() => {
        // Initial set
        setHeaderInfo({
            name: chatName || 'Chat',
            avatar: chatAvatar
        })

        if (chatType === 'group' && channelId && channelId !== 'global') {
            const channelSub = supabase
                .channel(`header_update_${channelId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channels', filter: `id=eq.${channelId}` }, (payload: any) => {
                    const newData = payload.new
                    setHeaderInfo(prev => ({
                        ...prev,
                        name: newData.name,
                        avatar: newData.image_url || DEFAULT_GROUP_AVATAR
                    }))
                })
                .subscribe()

            // Also fetch fresh ONCE
            supabase.from('channels').select('name, image_url').eq('id', channelId).single()
                .then(({ data }) => {
                    if (data) setHeaderInfo(prev => ({ ...prev, name: data.name, avatar: data.image_url || DEFAULT_GROUP_AVATAR }))
                })

            return () => { supabase.removeChannel(channelSub) }
        }
    }, [channelId, chatType, chatName, chatAvatar])

    if (!currentUser) return <div className="h-full flex items-center justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>

    return (
        <div className="glass-panel mx-3 my-3 rounded-2xl flex flex-col h-[calc(100vh-1.5rem)] relative animate-in fade-in zoom-in duration-500 select-none border-l-0">
            {/* Summary Overlay */}
            {summary && (
                <div className="absolute inset-x-4 top-20 z-50 bg-black/80 border border-purple-500/50 p-6 rounded-xl backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-purple-400 font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4" /> The Tea (Summary)
                        </h3>
                        <button onClick={() => setSummary(null)} className="text-muted-foreground hover:text-white">✕</button>
                    </div>
                    <p className="text-white/90 leading-relaxed text-sm">
                        {summary}
                    </p>
                </div>
            )}

            {/* Chat Header */}
            <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-white/5 rounded-t-3xl backdrop-blur-md">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-4 ${chatType === 'group' ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                        if (chatType === 'group') {
                            setShowGroupInfo(true)
                        }
                    }}
                >
                    <div className="relative">
                        <Avatar
                            src={headerInfo.name === 'Global Chat' ? GLOBAL_CHAT_AVATAR : (headerInfo.avatar || (chatType === 'group' ? DEFAULT_GROUP_AVATAR : DEFAULT_USER_AVATAR))}
                            className={cn("w-12 h-12 border-2 border-white/10 shadow-lg", headerInfo.name === 'Global Chat' && "shadow-blue-500/20 border-blue-500/30")}
                        />
                        {chatType === 'dm' && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-black rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>}
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                            {headerInfo.name}
                            {chatType === 'group' && headerInfo.name !== 'Global Chat' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">GROUP</span>}
                        </h2>
                        <p className="text-xs text-purple-300/80 font-medium tracking-wide">
                            {chatType === 'dm' ? 'Online' : (headerInfo.name === 'Global Chat' ? 'Server Public' : 'Tap for info')}
                        </p>
                    </div>
                </motion.div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleSummarize}
                        disabled={isSummarizing}
                        variant="ghost"
                        size="sm"
                        className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 rounded-xl"
                    >
                        {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {isSummarizing ? 'Cooking...' : 'Summarize'}
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full text-muted-foreground">
                        <Loader2 className="animate-spin w-8 h-8" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {messages.map((msg) => {
                            // Check ownership accurately
                            const isOwn = currentUser && msg.user_id === currentUser.id
                            return (
                                <MessageBubble
                                    key={msg.id}
                                    id={msg.id}
                                    isOwn={isOwn || false}
                                    content={msg.content}
                                    timestamp={new Date(msg.inserted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    senderName={msg.sender_name}
                                    onDelete={(id) => setDeletingMessageId(id)}
                                    // Reaction Props
                                    reactions={msg.reactions}
                                    currentUserId={currentUser?.id}
                                    onReact={(id, emoji) => toggleReaction(id, currentUser?.id, emoji)}
                                    // Media
                                    attachmentUrl={msg.attachment_url}
                                    attachmentType={msg.attachment_type}
                                />
                            )
                        })}
                        {messages.length === 0 && (
                            <div className="text-center text-zinc-500 mt-20 text-lg font-light tracking-wide">
                                Quiet in here... <span className="text-2xl">🤫</span>
                            </div>
                        )}
                        {/* Invisible element to scroll to */}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Footer Input Area */}
            {/* Footer Input Area (Floating & Clean) */}
            {/* Footer Input Area (Clean & Stable) */}
            {/* Footer Input Area (Clean & Stable) */}
            <div className="p-4 pb-6 flex justify-center shrink-0 relative z-20">
                <div className="w-full max-w-4xl">
                    {!canSend ? (
                        <div className="w-full py-4 px-6 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-md flex items-center justify-center gap-2 text-red-200 font-medium animate-in fade-in slide-in-from-bottom-4">
                            <Shield className="w-4 h-4" />
                            <span>Sending messages has been disabled by admins.</span>
                        </div>
                    ) : (
                        <motion.form
                            onSubmit={handleSendMessage}
                            className="relative flex items-end gap-2 bg-zinc-900/80 backdrop-blur-xl p-2 rounded-[1.5rem] border border-white/10 shadow-2xl shadow-purple-900/5 transition-all duration-300 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500/50 focus-within:shadow-purple-500/10"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                        >
                            {/* Emoji Picker Popup */}
                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                        className="absolute bottom-full left-0 mb-4 z-50"
                                    >
                                        <div className="shadow-2xl rounded-2xl overflow-hidden border border-white/10 bg-zinc-900">
                                            <EmojiPicker
                                                onEmojiClick={(e) => {
                                                    setInputValue(prev => prev + e.emoji)
                                                    // Optional: close picker? or keep open for multiple? Keep open.
                                                }}
                                                theme={Theme.DARK}
                                                lazyLoadEmojis={true}
                                                skinTonesDisabled
                                                searchDisabled={false}
                                                width={350}
                                                height={400}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Left Side Tools */}
                            <div className="flex items-center gap-1 pl-2 pb-1">
                                {/* Emoji Button */}
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="text-zinc-400 hover:text-yellow-400 hover:bg-white/10 rounded-full h-10 w-10 transition-colors"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                    <Smile className="w-5 h-5" />
                                </Button>

                                {/* Camera Button */}
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="text-zinc-400 hover:text-blue-400 hover:bg-white/10 rounded-full h-10 w-10 transition-colors"
                                    onClick={startCamera}
                                >
                                    <Camera className="w-5 h-5" />
                                </Button>

                                {/* Attachment Button */}
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="text-zinc-400 hover:text-purple-400 hover:bg-white/10 rounded-full h-10 w-10 transition-colors"
                                    onClick={() => {
                                        if (fileInputRef.current) {
                                            fileInputRef.current.accept = "*/*"
                                            fileInputRef.current.capture = "" // Reset capture
                                            fileInputRef.current.click()
                                        }
                                    }}
                                    disabled={isUploading}
                                >
                                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                                </Button>
                            </div>

                            {/* Input Field */}
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={`Message...`}
                                className="bg-transparent border-none text-white placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[40px] max-h-[120px] py-3 flex-1 min-w-0 resize-none overflow-hidden"
                                autoComplete="off"
                            />

                            {/* Right Side Actions */}
                            <div className="flex items-center gap-2 pr-2 pb-1">
                                {/* Text Magic/Effects */}
                                {inputValue.trim() && (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="text-zinc-400 hover:text-pink-400 hover:bg-white/10 rounded-full h-10 w-10 transition-colors"
                                        onClick={() => alert("Text FX Coming Soon!")}
                                    >
                                        <Sparkles className="w-5 h-5" />
                                    </Button>
                                )}

                                <AnimatePresence mode="wait">
                                    {inputValue.trim() ? (
                                        <motion.div
                                            key="send"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        >
                                            <Button
                                                type="submit"
                                                size="icon"
                                                className="bg-purple-600 text-white hover:bg-purple-700 rounded-full w-10 h-10 shadow-lg hover:shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all"
                                            >
                                                <Send className="w-4 h-4 ml-0.5" />
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="mic"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        >
                                            <Button
                                                type="button"
                                                size="icon"
                                                className={cn(
                                                    "rounded-full w-10 h-10 shadow-lg transition-all duration-200",
                                                    isRecording
                                                        ? "bg-red-500 text-white scale-110 shadow-red-500/50 animate-pulse"
                                                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                                                )}
                                                onMouseDown={startRecording}
                                                onMouseUp={stopRecording}
                                                onTouchStart={(e) => {
                                                    e.preventDefault() // Prevent ghost clicks
                                                    startRecording()
                                                }}
                                                onTouchEnd={(e) => {
                                                    e.preventDefault()
                                                    stopRecording()
                                                }}
                                                title="Hold to Record"
                                            >
                                                <Mic className={cn("w-5 h-5", isRecording && "animate-bounce")} />
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.form>
                    )}
                </div>
            </div>

            {/* Modals */}
            {/* Camera Modal */}
            <AnimatePresence>
                {showCamera && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4"
                    >
                        <div className="relative w-full max-w-sm aspect-[3/4] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                            {/* Video Feed */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />

                            {/* Overlay Controls */}
                            <div className="absolute inset-x-0 bottom-0 p-8 flex justify-between items-center bg-gradient-to-t from-black/80 to-transparent">
                                <Button variant="ghost" size="icon" className="text-white rounded-full bg-white/10 w-12 h-12" onClick={stopCamera}>
                                    ✕
                                </Button>
                                <button
                                    onClick={capturePhoto}
                                    className="w-20 h-20 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-all active:scale-95"
                                />
                                <div className="w-12" /> {/* Spacer */}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {
                showGroupInfo && (
                    <GroupInfoModal
                        channelId={channelId}
                        onClose={() => setShowGroupInfo(false)}
                        currentUser={currentUser}
                    />
                )
            }

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deletingMessageId && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                        onClick={() => setDeletingMessageId(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-xl"
                        >
                            <h3 className="text-lg font-bold text-white mb-2">Delete Message?</h3>
                            <p className="text-zinc-400 mb-6 text-sm">Choose how you want to delete this message.</p>

                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-zinc-300 border-white/10 hover:bg-white/5 hover:text-white"
                                    onClick={() => {
                                        if (deletingMessageId) deleteForMe(deletingMessageId)
                                        setDeletingMessageId(null)
                                    }}
                                >
                                    <span className="mr-2">🙈</span> Delete for Me
                                </Button>

                                {/* Only show Delete for Everyone if it's their own message */}
                                {messages.find(m => m.id === deletingMessageId)?.user_id === currentUser?.id && (
                                    <Button
                                        variant="destructive"
                                        className="w-full justify-start bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                                        onClick={() => {
                                            if (deletingMessageId) deleteForEveryone(deletingMessageId)
                                            setDeletingMessageId(null)
                                        }}
                                    >
                                        <span className="mr-2">🗑️</span> Delete for Everyone
                                    </Button>
                                )}

                                <Button
                                    variant="ghost"
                                    className="w-full mt-2"
                                    onClick={() => setDeletingMessageId(null)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    )
}

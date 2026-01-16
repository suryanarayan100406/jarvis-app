'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User, Upload, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

export function ProfileSetup({ onComplete, isEditing = false }: { onComplete: () => void, isEditing?: boolean }) {
    const [isOpen, setIsOpen] = useState(false)
    const [username, setUsername] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)

    useEffect(() => {
        if (isEditing) {
            setIsOpen(true)
            loadProfile()
        } else {
            checkProfile()
        }
    }, [isEditing])

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
            setUsername(data.username || '')
            setAvatarUrl(data.avatar_url || '')
        }
    }

    const checkProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single()

        if (!profile || !profile.username) {
            setIsOpen(true)
        } else {
            onComplete()
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const file = e.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
            setAvatarUrl(publicUrl)
        } catch (error) {
            console.error("Upload failed", error)
            alert("Upload failed. Make sure you ran the Storage SQL!")
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            username,
            avatar_url: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
            updated_at: new Date().toISOString()
        })

        if (!error) {
            setIsOpen(false)
            onComplete()
        } else {
            console.error(error)
            alert("Error saving profile. Username might be taken.")
        }
        setLoading(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 p-6 rounded-2xl shadow-2xl relative">
                {isEditing && (
                    <button onClick={() => { setIsOpen(false); onComplete() }} className="absolute right-4 top-4 text-zinc-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                )}

                <h2 className="text-2xl font-bold mb-2 text-white">{isEditing ? 'Edit Profile' : 'Setup Profile'}</h2>
                <p className="text-zinc-400 mb-6">Customize your digital persona.</p>

                <div className="space-y-6">
                    {/* Avatar Preview & Upload */}
                    <div className="flex flex-col items-center gap-4">
                        <Avatar src={avatarUrl} fallback={username} className="w-24 h-24 border-2 border-primary" />
                        <div className="flex items-center gap-2">
                            <label className="cursor-pointer bg-secondary hover:bg-secondary/80 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                {uploading ? 'Uploading...' : 'Upload Picture'}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-500 mb-1 block uppercase font-bold tracking-wider">Username</label>
                        <Input
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="e.g. CyberPunk2077"
                            className="bg-black/20 border-zinc-700 focus:border-primary"
                        />
                    </div>

                    <Button onClick={handleSave} disabled={loading || !username} className="w-full py-6 text-lg">
                        {loading ? 'Saving...' : 'Save Profile'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

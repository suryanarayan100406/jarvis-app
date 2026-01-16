'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { Shield, Users, Activity, Trash2 } from 'lucide-react'

// Mock admin check - in production use RLS + explicit 'role' column in profiles
const isAdmin = (email?: string) => email?.includes('admin') || true // Allowing all for demo/MVP so user can see it!

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        // 1. Check Auth (Allowing for demo purposes)
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            // fetch stats
            fetchUsers()
        }
        checkUser()
    }, [])

    const fetchUsers = async () => {
        // Fetch profiles
        const { data } = await supabase.from('profiles').select('*')
        setUsers(data || [])
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-4xl font-bold flex items-center gap-3">
                            <Shield className="w-10 h-10 text-red-500" /> Admin Command Center
                        </h1>
                        <p className="text-zinc-400 mt-2">Manage users and content</p>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="outline" onClick={() => router.push('/chat')}>
                            Back to App
                        </Button>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                                <Users className="w-6 h-6" />
                            </div>
                            <span className="text-zinc-400">Total Users</span>
                        </div>
                        <p className="text-4xl font-bold">{users.length}</p>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
                                <Activity className="w-6 h-6" />
                            </div>
                            <span className="text-zinc-400">Active Now</span>
                        </div>
                        <p className="text-4xl font-bold">1</p>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
                                <Shield className="w-6 h-6" />
                            </div>
                            <span className="text-zinc-400">Reports</span>
                        </div>
                        <p className="text-4xl font-bold">0</p>
                    </div>
                </div>

                {/* User Table */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-zinc-800">
                        <h2 className="text-xl font-semibold">User Database</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-400">
                            <thead className="bg-zinc-950 text-zinc-200">
                                <tr>
                                    <th className="p-4">User ID</th>
                                    <th className="p-4">Username</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={4} className="p-8 text-center">Loading data...</td></tr>
                                ) : users.map((u) => (
                                    <tr key={u.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                                        <td className="p-4 font-mono text-xs">{u.id}</td>
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden" >
                                                {u.avatar_url && <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />}
                                            </div>
                                            <span className="text-white font-medium">{u.username}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs border border-green-500/20">Active</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button size="icon" variant="destructive" className="w-8 h-8">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {users.length === 0 && !loading && (
                            <div className="p-8 text-center">No users found. (Make sure you signed up!)</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}

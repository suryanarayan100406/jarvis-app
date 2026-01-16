'use client'

import AuthForm from '@/components/auth/AuthForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden p-4">
            {/* Background */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px]" />
            </div>

            <div className="absolute top-8 left-8">
                <Link href="/" className="flex items-center text-muted-foreground hover:text-white transition-colors">
                    <ArrowLeft className="mr-2 w-5 h-5" /> Back
                </Link>
            </div>

            <AuthForm />
        </div>
    )
}

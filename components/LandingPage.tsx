'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ArrowRight, MessageCircle, Zap, Shield } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background overflow-hidden relative flex flex-col items-center justify-center text-center p-4">

            {/* Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-4xl space-y-8 z-10"
            >
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="inline-block"
                >
                    <span className="px-3 py-1 rounded-full border border-primary/50 text-xs font-mono text-primary bg-primary/5 backdrop-blur-md">
                        The Gen Z Chat Experience
                    </span>
                </motion.div>

                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 dark:from-white dark:via-gray-400 dark:to-gray-700">
                    Not just <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-pink-500 animate-gradient-x">Another App.</span>
                </h1>

                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Secure. Anonymous. AI-Powered. <br />
                    Experience messaging that actually matches your vibe.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
                    <Link href="/login">
                        <Button size="lg" className="rounded-full text-lg px-8 py-6">
                            Get Started <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>
                    <Link href="/anonymous">
                        <Button size="lg" variant="neon" className="rounded-full text-lg px-8 py-6">
                            Go Incognito <Shield className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </motion.div>

            {/* Feature Pills */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-10 flex flex-wrap gap-4 justify-center text-sm font-medium text-muted-foreground"
            >
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full backdrop-blur-sm border border-white/5">
                    <Zap className="w-4 h-4 text-yellow-400" /> Fast
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full backdrop-blur-sm border border-white/5">
                    <Shield className="w-4 h-4 text-green-400" /> Secure
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-full backdrop-blur-sm border border-white/5">
                    <MessageCircle className="w-4 h-4 text-blue-400" /> React 2.0
                </div>
            </motion.div>
        </div>
    )
}

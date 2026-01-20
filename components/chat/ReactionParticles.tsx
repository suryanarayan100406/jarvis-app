'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface ReactionParticlesProps {
    emoji: string
    onComplete: () => void
}

export function ReactionParticles({ emoji, onComplete }: ReactionParticlesProps) {
    const [particles] = useState(() => Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 100, // Random X spread
        y: -50 - Math.random() * 100,  // Random Upward distance
        rotation: (Math.random() - 0.5) * 720,
        scale: 0.5 + Math.random(),
        delay: Math.random() * 0.2
    })))

    useEffect(() => {
        const timer = setTimeout(onComplete, 1500) // Cleanup after anim
        return () => clearTimeout(timer)
    }, [onComplete])

    return (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-visible flex items-center justify-center">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    initial={{ opacity: 1, x: 0, y: 0, scale: 0, rotate: 0 }}
                    animate={{
                        opacity: 0,
                        x: p.x,
                        y: p.y,
                        scale: p.scale,
                        rotate: p.rotation
                    }}
                    transition={{
                        duration: 1,
                        ease: "easeOut",
                        delay: p.delay
                    }}
                    className="absolute text-2xl"
                >
                    {emoji}
                </motion.div>
            ))}
        </div>
    )
}

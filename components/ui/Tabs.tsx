'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TabsProps {
    tabs: { id: string; label: string; icon?: React.ReactNode }[]
    activeTab: string
    onChange: (id: string) => void
    className?: string
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
    return (
        <div className={cn("flex space-x-1 bg-black/20 p-1 rounded-xl", className)}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        "relative flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-lg",
                        activeTab === tab.id ? "text-white" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                    )}
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="active-tab"
                            className="absolute inset-0 bg-white/10 rounded-lg shadow-sm backdrop-blur-sm"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                        {tab.icon}
                        {tab.label}
                    </span>
                </button>
            ))}
        </div>
    )
}

'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const Dialog = ({ open, onOpenChange, children }: { open?: boolean, onOpenChange?: (open: boolean) => void, children: React.ReactNode }) => {
    // If 'open' is undefined, we assume it's uncontrolled or always open if rendered.
    // But our usage is conditional rendering + open={true}.
    if (open === false) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => onOpenChange?.(false)} />
            {children}
        </div>
    )
}

const DialogContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative z-[51] grid w-full max-w-lg gap-4 border bg-background p-6 shadow-2xl duration-200 sm:rounded-lg",
            className
        )}
        {...props}
        onClick={(e) => e.stopPropagation()}
    >
        {children}
    </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = "DialogTitle"

export { Dialog, DialogContent, DialogHeader, DialogTitle }

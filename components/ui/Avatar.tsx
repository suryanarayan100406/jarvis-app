'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

export function Avatar({ className, src, alt, fallback, ...props }: React.HTMLAttributes<HTMLDivElement> & { src?: string, alt?: string, fallback?: string }) {
    const [error, setError] = React.useState(false)

    return (
        <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary", className)} {...props}>
            {src && !error ? (
                <img
                    src={src}
                    alt={alt || "Avatar"}
                    className="aspect-square h-full w-full object-cover"
                    onError={() => setError(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground uppercase text-xs">
                    {fallback || alt?.slice(0, 2) || "??"}
                </div>
            )}
        </div>
    )
}

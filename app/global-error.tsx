'use client'

import { useEffect } from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Global Error caught:', error)
    }, [error])

    return (
        <html>
            <body className="bg-black text-white p-10 font-mono">
                <div className="max-w-xl mx-auto border border-red-500/50 rounded-xl p-8 bg-red-950/20">
                    <h2 className="text-3xl font-bold text-red-500 mb-4">CRITICAL SYSTEM FAILURE</h2>
                    <p className="mb-4 text-zinc-300">The application crashed in the Root Layout.</p>

                    <div className="bg-black/50 p-4 rounded-lg overflow-auto mb-6 border border-zinc-800">
                        <p className="text-red-400 font-bold mb-2">Error Message:</p>
                        <pre className="text-sm text-red-300 whitespace-pre-wrap">{error.message}</pre>

                        {error.digest && (
                            <p className="text-xs text-zinc-500 mt-2">Digest: {error.digest}</p>
                        )}
                    </div>

                    <button
                        onClick={() => reset()}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
                    >
                        Attempt System Reset
                    </button>
                </div>
            </body>
        </html>
    )
}

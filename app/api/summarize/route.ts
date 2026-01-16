import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { messages } = await req.json()
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

        if (!apiKey) {
            return NextResponse.json({ summary: "API Key Missing. Add GEMINI_API_KEY to .env" }, { status: 500 })
        }

        const genAI = new GoogleGenerativeAI(apiKey)
        // Use gemini-1.5-flash as it is the current standard for fast tasks
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const prompt = `Summarize this chat conversation in a fun, Gen Z slang style (like 'The Tea'): \n\n${messages.join('\n')}`

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        return NextResponse.json({ summary: text })

    } catch (error: any) {
        console.error("AI Error:", error)
        return NextResponse.json({
            summary: "Failed to generate summary.",
            details: error.message || String(error)
        }, { status: 500 })
    }
}

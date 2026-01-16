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

        // List of models to try (Modern versions only)
        const models = ["gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.5-pro", "gemini-1.5-pro-001"]

        const errors = [];
        let summaryText = null;

        for (const modelName of models) {
            try {
                console.log(`Attempting summary with model: ${modelName}`)
                const model = genAI.getGenerativeModel({ model: modelName })
                const prompt = `Summarize this chat conversation in a fun, Gen Z slang style (like 'The Tea'): \n\n${messages.join('\n')}`

                const result = await model.generateContent(prompt)
                const response = await result.response
                summaryText = response.text()

                // If we get here, it worked!
                break;
            } catch (e: any) {
                console.warn(`Model ${modelName} failed:`, e.message)
                errors.push(`${modelName}: ${e.message}`)
                // Continue to next model
            }
        }

        if (!summaryText) {
            throw new Error(`All models failed.\nErrors:\n${errors.join('\n')}`)
        }

        return NextResponse.json({ summary: summaryText })

    } catch (error: any) {
        console.error("AI Error:", error)
        return NextResponse.json({
            summary: "Failed to generate summary.",
            details: error.message || String(error)
        }, { status: 500 })
    }
}

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

const systemPrompt = `Welcome to HeadStarterAI Customer Support!

I’m here to assist you with any questions or issues you might have regarding our AI-powered interview platform for software engineering jobs. Whether you need help with setting up your account, navigating the platform, understanding interview results, or any other inquiries, feel free to ask!

Here’s how I can help:

Account Setup & Management: Assistance with creating or managing your HeadStarterAI account.
Interview Preparation: Guidance on how to prepare for and schedule your AI-powered interviews.
Platform Navigation: Help with using the features of our platform effectively.
Technical Issues: Troubleshooting problems you might encounter while using the platform.
Understanding Results: Explanation of the feedback and results provided after your interviews.
Please provide details about your issue or question so I can assist you more effectively. If you need personalized support beyond what I can provide, I’ll guide you on how to reach our human support team.`

export async function POST(req) {

    // OpenAI & Pinecone, needs keys in .env.local file
    const openai = new OpenAI()
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })
    const index = pc.index('headstart')

    const data = await req.json()

    const userInput = data[data.length - 1].content

    // OpenAI embedding to give to Pinecone
    const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: userInput,
        encoding_format: 'float'
    })

    // Get data from pinecone vectors
    const info = await index.namespace('ns1').query({
        topK: 1,
        vector: embedding.data[0].embedding,
        includeValues: true,
        includeMetadata: true
      });

    // Get meta data
    const pcInfo = info.matches[0].metadata.content

    // Give OpenAI new data from Pinecone, not just user input
    const completion = await openai.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: systemPrompt,
            },
            {
                role: 'user',
                content: pcInfo,
            },
            ...data,
        ],
        model: 'gpt-4o-mini',
        stream: true,
    })

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder()
            try {
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content
                    if (content) {
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            }
            catch (err) {
                controller.error(err)
            }
            finally {
                controller.close()
            }
        },
    })

    return new NextResponse(stream)
}
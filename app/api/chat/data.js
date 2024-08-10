import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";


// OpenAI & Pinecone, needs keys in .env.local file
const openai = new OpenAI({ apiKey: ''})
const pc = new Pinecone({ apiKey: '' })
const index = pc.index('headstart')

const data = ''
// OpenAI embedding to give to Pinecone
const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: data,
    encoding_format: 'float'
})

// Populate Pinecone index with data
await index.namespace('ns1').upsert([
    {
        id: 'name1',
        values: embedding.data[0].embedding,
        metadata: {content: data}
    }
]);
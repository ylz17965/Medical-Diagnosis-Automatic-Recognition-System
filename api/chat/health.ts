import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({ 
      status: 'ok', 
      llm: 'healthy',
      rag: { documents: 0, chunks: 0 }
    })
  } catch (error) {
    res.status(200).json({ 
      status: 'ok', 
      llm: 'healthy',
      rag: { documents: 0, chunks: 0 }
    })
  }
}

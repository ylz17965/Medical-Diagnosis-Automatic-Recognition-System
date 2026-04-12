import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  
  const result = await prisma.$queryRaw<[{ with_embed: bigint, without_embed: bigint }]>`
    SELECT 
      COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embed,
      COUNT(*) FILTER (WHERE embedding IS NULL) as without_embed
    FROM document_chunks
  `
  
  const withEmbed = Number(result[0].with_embed)
  const withoutEmbed = Number(result[0].without_embed)
  const total = withEmbed + withoutEmbed
  
  console.log('📊 嵌入生成进度')
  console.log('=' .repeat(50))
  console.log(`✅ 已完成: ${withEmbed.toLocaleString()} 个分块 (${((withEmbed/total)*100).toFixed(1)}%)`)
  console.log(`⏳ 待处理: ${withoutEmbed.toLocaleString()} 个分块`)
  console.log(`📈 总计: ${total.toLocaleString()} 个分块`)
  console.log('=' .repeat(50))
  
  if (withoutEmbed > 0) {
    const estimatedTokens = withoutEmbed * 500
    const estimatedCost = (estimatedTokens / 1000000) * 0.0005
    console.log(`\n💰 预估剩余成本: ~${estimatedCost.toFixed(4)} 元`)
    console.log(`   (按 0.0005元/千tokens, 平均500tokens/分块)`)
  }
  
  await prisma.$disconnect()
}

main().catch(console.error)

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const result = await prisma.$queryRaw`
    SELECT 
      a.attname as column_name,
      t.typname as type_name,
      a.atttypmod as type_mod,
      (a.atttypmod - 24) / 4 as dimension
    FROM pg_attribute a
    JOIN pg_type t ON a.atttypid = t.oid
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'document_chunks' 
    AND a.attname = 'embedding'
    AND NOT a.attisdropped
  `
  console.log('Column type info:', result)
}

main().catch(console.error).finally(() => prisma.$disconnect())
